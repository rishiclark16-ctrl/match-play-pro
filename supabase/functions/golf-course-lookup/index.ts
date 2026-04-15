import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

const GOLFCOURSEAPI_KEY = Deno.env.get('GOLFCOURSEAPI_KEY');
const BASE_URL = 'https://api.golfcourseapi.com';

// ── Rate limiting ────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function checkRateLimit(clientId: string): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const record = rateLimitMap.get(clientId);

  if (!record || now > record.resetTime) {
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

// ── Response cache (in-memory, survives across requests on warm instances) ──
interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const responseCache = new Map<string, CacheEntry>();
const SEARCH_CACHE_TTL_MS = 60 * 60 * 1000;  // 1 hour for search results
const DETAILS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for course details (rarely change)
const MAX_CACHE_ENTRIES = 500;

function getCached(key: string, ttl: number): unknown | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown): void {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of responseCache) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { data, timestamp: Date.now() });
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientId = forwardedFor?.split(',')[0]?.trim() || 'unknown';

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
            ...cors, ...rateLimitHeaders,
            'Content-Type': 'application/json',
            'Retry-After': rateLimit.resetInSeconds.toString()
          }
        }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const query = url.searchParams.get('query');
    const courseId = url.searchParams.get('id');

    if (!GOLFCOURSEAPI_KEY) {
      console.error('GOLFCOURSEAPI_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    let apiUrl: string;
    let cacheKey: string;
    let cacheTtl: number;

    if (action === 'search' && query) {
      const normalizedQuery = query.toLowerCase().trim();
      cacheKey = `search:${normalizedQuery}`;
      cacheTtl = SEARCH_CACHE_TTL_MS;
      apiUrl = `${BASE_URL}/v1/search?search_query=${encodeURIComponent(query)}`;
    } else if (action === 'details' && courseId) {
      cacheKey = `details:${courseId}`;
      cacheTtl = DETAILS_CACHE_TTL_MS;
      apiUrl = `${BASE_URL}/v1/courses/${courseId}`;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use action=search&query=... or action=details&id=...' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache first
    const cached = getCached(cacheKey, cacheTtl);
    if (cached) {
      return new Response(
        JSON.stringify(cached),
        {
          headers: {
            ...cors, ...rateLimitHeaders,
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
          }
        }
      );
    }

    // Cache miss — call the API
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

    // Store in cache
    setCache(cacheKey, data);

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...cors, ...rateLimitHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
        }
      }
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
