import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://matchgolf.dev',
  'capacitor://localhost',  // iOS
  'http://localhost',       // Android
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

const GOLFCOURSEAPI_KEY = Deno.env.get('GOLFCOURSEAPI_KEY');
const BASE_URL = 'https://api.golfcourseapi.com';

// Simple in-memory rate limiting (resets on cold start, but helps prevent abuse)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

function checkRateLimit(clientId: string): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const record = rateLimitMap.get(clientId);

  if (!record || now > record.resetTime) {
    // New window
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetInSeconds: 60 };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  record.count++;
  const remaining = RATE_LIMIT_MAX_REQUESTS - record.count;
  const resetInSeconds = Math.ceil((record.resetTime - now) / 1000);
  return { allowed: true, remaining, resetInSeconds };
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    // Get client identifier for rate limiting (prefer forwarded IP, fallback to connection info)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientId = forwardedFor?.split(',')[0]?.trim() || 'unknown';

    // Check rate limit
    const rateLimit = checkRateLimit(clientId);
    const rateLimitHeaders = {
      'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': rateLimit.resetInSeconds.toString(),
    };

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: {
            ...cors,
            ...rateLimitHeaders,
            'Content-Type': 'application/json',
            'Retry-After': rateLimit.resetInSeconds.toString()
          }
        }
      );
    }

    // Auth is handled by Supabase's verify_jwt setting on this function.
    // No need for getUser() — course search is not user-specific.

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const query = url.searchParams.get('query');
    const courseId = url.searchParams.get('id');

    console.log(`Golf course lookup - Action: ${action}, Query: ${query}, ID: ${courseId}`);

    if (!GOLFCOURSEAPI_KEY) {
      console.error('GOLFCOURSEAPI_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    let apiUrl: string;

    if (action === 'search' && query) {
      apiUrl = `${BASE_URL}/v1/search?search_query=${encodeURIComponent(query)}`;
    } else if (action === 'details' && courseId) {
      apiUrl = `${BASE_URL}/v1/courses/${courseId}`;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use action=search&query=... or action=details&id=...' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Calling GolfCourseAPI: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${GOLFCOURSEAPI_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GolfCourseAPI error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`GolfCourseAPI response received successfully`);

    return new Response(
      JSON.stringify(data),
      { headers: { ...cors, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in golf-course-lookup:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
