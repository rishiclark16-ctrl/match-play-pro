import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://matchgolf.dev',
  'capacitor://localhost',  // iOS
  'http://localhost',       // Android
];

const IS_DEV = Deno.env.get('ENVIRONMENT') !== 'production';

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) || (IS_DEV && origin.startsWith('http://localhost:'));
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

// Rate limiting: 50 push requests per hour per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 50;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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

/**
 * Sign an APNs JWT using ES256 (ECDSA P-256).
 * Private key must be the contents of the .p8 file Apple provides.
 */
async function signApnsJwt(teamId: string, keyId: string, privateKeyPem: string): Promise<string> {
  const encoder = new TextEncoder();

  const header = { alg: 'ES256', kid: keyId };
  const payload = { iss: teamId, iat: Math.floor(Date.now() / 1000) };

  const toBase64Url = (str: string) =>
    btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const headerB64 = toBase64Url(JSON.stringify(header));
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Strip PEM headers/footers and whitespace
  const pem = privateKeyPem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const keyBytes = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(signingInput),
  );

  const sigB64 = toBase64Url(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  return `${signingInput}.${sigB64}`;
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    // Rate limit: 50 push requests per hour per user
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Too many push requests. Please try again later.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const { tokens, title, body, data } = await req.json();

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'tokens must be a non-empty array' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    if (typeof title !== 'string' || typeof body !== 'string') {
      return new Response(
        JSON.stringify({ error: 'title and body are required strings' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const teamId = Deno.env.get('APNS_TEAM_ID');
    const keyId = Deno.env.get('APNS_KEY_ID');
    const privateKey = Deno.env.get('APNS_PRIVATE_KEY');
    const bundleId = Deno.env.get('APNS_BUNDLE_ID') ?? 'dev.matchgolf.app';
    const isProduction = Deno.env.get('APNS_ENV') === 'production';

    if (!teamId || !keyId || !privateKey) {
      console.error('send-push: APNs env vars not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const jwt = await signApnsJwt(teamId, keyId, privateKey);
    const apnsHost = isProduction
      ? 'https://api.push.apple.com'
      : 'https://api.sandbox.push.apple.com';

    const payload = JSON.stringify({
      aps: {
        alert: { title, body },
        sound: 'default',
        badge: 1,
      },
      ...(data ?? {}),
    });

    const results = await Promise.all(
      tokens.map(async (token: string) => {
        try {
          const res = await fetch(`${apnsHost}/3/device/${token}`, {
            method: 'POST',
            headers: {
              authorization: `bearer ${jwt}`,
              'apns-topic': bundleId,
              'apns-push-type': 'alert',
              'content-type': 'application/json',
            },
            body: payload,
          });

          const responseText = res.status !== 200 ? await res.text() : '';
          return { token: token.slice(-8), status: res.status, error: responseText || undefined };
        } catch (err) {
          return { token: token.slice(-8), status: 0, error: String(err) };
        }
      }),
    );

    const failed = results.filter((r) => r.status !== 200);
    if (failed.length > 0) {
      console.warn('send-push: some deliveries failed', JSON.stringify(failed));
    }

    return new Response(
      JSON.stringify({ sent: results.length - failed.length, failed: failed.length, results }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('send-push error:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
