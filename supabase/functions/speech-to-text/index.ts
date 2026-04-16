import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://matchgolf.dev',
  'capacitor://localhost',
  'http://localhost',
];

const IS_DEV = Deno.env.get('ENVIRONMENT') !== 'production';

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) || (IS_DEV && origin.startsWith('http://localhost:'));
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-player-names, x-user-token',
    'Vary': 'Origin',
  };
}

// Rate limiting: 200 transcriptions per hour per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 200;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

/** Golf vocabulary keywords for speech model prompting */
const GOLF_KEYWORDS = [
  'birdie', 'bogey', 'eagle', 'par', 'double bogey', 'triple bogey',
  'albatross', 'ace', 'hole in one', 'snowman', 'double', 'triple',
  'quad', 'bogie', 'birdied', 'eagled', 'bogeyed', 'parred',
];

interface TranscriptResult {
  transcript: string;
  alternatives: string[];
  confidence: number;
}

/**
 * Transcribe audio using Deepgram Nova-3 with keyterm prompting.
 * Biases model toward player names and golf vocabulary.
 */
async function transcribeWithDeepgram(
  audioBytes: Uint8Array,
  contentType: string,
  playerNames: string[],
): Promise<TranscriptResult> {
  const deepgramKey = Deno.env.get('DEEPGRAM_API_KEY');
  if (!deepgramKey) throw new Error('DEEPGRAM_API_KEY not configured');

  // Build keyword params: player names get high boost, golf terms get medium
  const params = new URLSearchParams({
    model: 'nova-3',
    language: 'en-US',
    smart_format: 'false',
    punctuate: 'false',
    alternatives: '1',
    utterances: 'false',
  });

  // Player names — high boost (Nova-3 uses `keyterm` not `keywords`)
  for (const name of playerNames) {
    const firstName = name.split(' ')[0].trim();
    if (firstName.length >= 2) {
      params.append('keyterm', `${firstName}:3`);
    }
  }

  // Golf terms — medium boost
  for (const term of GOLF_KEYWORDS) {
    params.append('keyterm', `${term}:2`);
  }

  const response = await fetch(
    `https://api.deepgram.com/v1/listen?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramKey}`,
        'Content-Type': contentType,
      },
      body: audioBytes,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Deepgram error:', response.status, errorText);
    throw new Error(`Deepgram ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const channel = data?.results?.channels?.[0];
  const alts = channel?.alternatives ?? [];

  if (alts.length === 0 || !alts[0].transcript) {
    return { transcript: '', alternatives: [], confidence: 0 };
  }

  return {
    transcript: alts[0].transcript,
    alternatives: alts.slice(1).map((a: { transcript: string }) => a.transcript).filter(Boolean),
    confidence: alts[0].confidence ?? 0,
  };
}

/**
 * Fallback: transcribe using OpenAI gpt-4o-mini-transcribe.
 * Uses prompt parameter to hint at player names and golf terms.
 */
async function transcribeWithOpenAI(
  audioBytes: Uint8Array,
  contentType: string,
  playerNames: string[],
): Promise<TranscriptResult> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured');

  // Map content type to file extension
  const extMap: Record<string, string> = {
    'audio/webm;codecs=opus': 'webm',
    'audio/webm': 'webm',
    'audio/mp4': 'mp4',
    'audio/ogg;codecs=opus': 'ogg',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/mpeg': 'mp3',
  };
  const ext = extMap[contentType] ?? 'webm';

  // Build prompt with player names and golf terms for context
  const promptParts = [];
  if (playerNames.length > 0) {
    promptParts.push(`Players: ${playerNames.map(n => n.split(' ')[0]).join(', ')}.`);
  }
  promptParts.push('Golf scoring: birdie, bogey, par, eagle, double bogey, triple bogey.');

  const formData = new FormData();
  formData.append('file', new Blob([audioBytes], { type: contentType }), `audio.${ext}`);
  formData.append('model', 'gpt-4o-mini-transcribe');
  formData.append('language', 'en');
  formData.append('prompt', promptParts.join(' '));

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI error:', response.status, errorText);
    throw new Error(`OpenAI failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    transcript: data.text ?? '',
    alternatives: [],
    confidence: data.text ? 0.9 : 0, // OpenAI doesn't return confidence; assume high
  };
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // Verify authorization — supports both direct JWT and relay bypass.
    // When the client's session JWT uses ES256 (Apple Sign-In on newer
    // Supabase projects), the edge function relay rejects it. The client
    // sends the anon key as Bearer (to pass the relay) and the real user
    // token in X-User-Token. We verify the user token server-side via
    // GoTrue which supports all algorithms.
    const authHeader = req.headers.get('Authorization');
    const userTokenHeader = req.headers.get('X-User-Token');
    const effectiveAuth = userTokenHeader
      ? `Bearer ${userTokenHeader}`
      : authHeader;

    if (!effectiveAuth?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: effectiveAuth } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    // Read audio body
    const audioBytes = new Uint8Array(await req.arrayBuffer());
    if (audioBytes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Empty audio body' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    // Cap at 10MB
    if (audioBytes.length > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Audio too large (max 10MB)' }),
        { status: 413, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const contentType = req.headers.get('Content-Type') ?? 'audio/webm;codecs=opus';
    const playerNamesHeader = req.headers.get('X-Player-Names') ?? '';
    const playerNames = playerNamesHeader
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    let result: TranscriptResult;

    // Try Deepgram first (primary — keyterm prompting for accuracy)
    const hasDeepgram = !!Deno.env.get('DEEPGRAM_API_KEY');
    const hasOpenAI = !!Deno.env.get('OPENAI_API_KEY');

    if (hasDeepgram) {
      try {
        result = await transcribeWithDeepgram(audioBytes, contentType, playerNames);

        // If Deepgram returned empty transcript, try OpenAI as fallback
        if (!result.transcript && hasOpenAI) {
          console.log('Deepgram returned empty, falling back to OpenAI');
          result = await transcribeWithOpenAI(audioBytes, contentType, playerNames);
        }
      } catch (err) {
        console.error('Deepgram failed, trying OpenAI fallback:', err);
        if (hasOpenAI) {
          result = await transcribeWithOpenAI(audioBytes, contentType, playerNames);
        } else {
          throw err;
        }
      }
    } else if (hasOpenAI) {
      result = await transcribeWithOpenAI(audioBytes, contentType, playerNames);
    } else {
      return new Response(
        JSON.stringify({ error: 'No speech provider configured. Set DEEPGRAM_API_KEY or OPENAI_API_KEY.' }),
        { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('speech-to-text error:', detail);
    return new Response(
      JSON.stringify({ error: `Transcription failed: ${detail}` }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
