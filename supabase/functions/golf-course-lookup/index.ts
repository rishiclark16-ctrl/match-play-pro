import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://matchgolf.dev',
  'capacitor://localhost',
  'http://localhost',
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
const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
const GOLFCOURSEAPI_BASE = 'https://api.golfcourseapi.com';
const GOLFAMBIT_BASE = 'https://golf-course-finder.p.rapidapi.com/api';

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
const DETAILS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for course details
const NEARBY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min for nearby (location can change)
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

// ── GolfAmbit response → our standard format ────────────────────────
interface GolfAmbitClub {
  club_name: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  place_id: string;
  golf_courses: Array<{
    course_name: string;
    holes: number;
    par: number;
    course_type?: string;
    weekday_price?: string;
    weekend_price?: string;
  }>;
}

interface StandardCourse {
  id: number | string;
  club_name: string;
  course_name: string;
  location: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  source: 'golfcourseapi' | 'golfambit';
}

let golfambitIdCounter = 900000; // high range to avoid collision with GolfCourseAPI numeric IDs

function mapGolfAmbitToStandard(clubs: GolfAmbitClub[]): StandardCourse[] {
  const results: StandardCourse[] = [];
  for (const club of clubs) {
    if (!club.golf_courses || club.golf_courses.length === 0) {
      // Club with no courses listed — add as a single entry
      results.push({
        id: `ga-${++golfambitIdCounter}`,
        club_name: club.club_name,
        course_name: club.club_name,
        location: {
          city: club.city,
          state: club.state,
          country: club.country,
          latitude: club.latitude,
          longitude: club.longitude,
        },
        source: 'golfambit',
      });
    } else {
      for (const course of club.golf_courses) {
        results.push({
          id: `ga-${++golfambitIdCounter}`,
          club_name: club.club_name,
          course_name: course.course_name || club.club_name,
          location: {
            city: club.city,
            state: club.state,
            country: club.country,
            latitude: club.latitude,
            longitude: club.longitude,
          },
          source: 'golfambit',
        });
      }
    }
  }
  return results;
}

// ── Deduplication: merge results from both APIs ──────────────────────
function deduplicateCourses(primary: StandardCourse[], secondary: StandardCourse[]): StandardCourse[] {
  const seen = new Set<string>();

  // Index primary results by normalized name+city
  for (const c of primary) {
    const key = `${c.course_name.toLowerCase().replace(/[^a-z0-9]/g, '')}|${(c.location.city || '').toLowerCase()}`;
    seen.add(key);
  }

  const merged = [...primary];
  for (const c of secondary) {
    const key = `${c.course_name.toLowerCase().replace(/[^a-z0-9]/g, '')}|${(c.location.city || '').toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(c);
    }
  }

  return merged;
}

// ── Fetch from GolfAmbit (nearby geo-search) ─────────────────────────
async function fetchGolfAmbitNearby(lat: number, lng: number, miles: number): Promise<StandardCourse[]> {
  if (!RAPIDAPI_KEY) return [];

  try {
    const response = await fetch(
      `${GOLFAMBIT_BASE}/golf-clubs/?miles=${miles}&latitude=${lat}&longitude=${lng}`,
      {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'golf-course-finder.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      console.error(`GolfAmbit error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // API returns { message: "No results were found." } on empty results
    if (!Array.isArray(data)) return [];

    return mapGolfAmbitToStandard(data);
  } catch (err) {
    console.error('GolfAmbit fetch error:', err);
    return [];
  }
}

// ── Fetch from GolfCourseAPI (text search) ───────────────────────────
async function fetchGolfCourseAPISearch(query: string): Promise<StandardCourse[]> {
  if (!GOLFCOURSEAPI_KEY) return [];

  try {
    const response = await fetch(
      `${GOLFCOURSEAPI_BASE}/v1/search?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Key ${GOLFCOURSEAPI_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const courses = data.courses || [];
    return courses.map((c: Record<string, unknown>) => ({
      ...c,
      source: 'golfcourseapi',
    }));
  } catch {
    return [];
  }
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
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    const miles = url.searchParams.get('miles') || '25';

    // ── action=nearby — real geo-search via GolfAmbit ──────────────
    if (action === 'nearby' && lat && lng) {
      const cacheKey = `nearby:${parseFloat(lat).toFixed(2)}:${parseFloat(lng).toFixed(2)}:${miles}`;
      const cached = getCached(cacheKey, NEARBY_CACHE_TTL_MS);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { ...cors, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        });
      }

      const nearbyCourses = await fetchGolfAmbitNearby(
        parseFloat(lat),
        parseFloat(lng),
        Math.min(50, parseInt(miles))
      );

      const result = { courses: nearbyCourses };
      setCache(cacheKey, result);

      return new Response(JSON.stringify(result), {
        headers: { ...cors, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
      });
    }

    // ── action=search — GolfCourseAPI text search + GolfAmbit nearby merge ──
    if (action === 'search' && query) {
      const normalizedQuery = query.toLowerCase().trim();
      const cacheKey = `search:${normalizedQuery}`;
      const cached = getCached(cacheKey, SEARCH_CACHE_TTL_MS);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { ...cors, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        });
      }

      // Primary: GolfCourseAPI text search
      const primaryResults = await fetchGolfCourseAPISearch(query);

      // If primary returns few results AND we have user location, supplement with GolfAmbit
      let mergedResults = primaryResults;
      if (primaryResults.length < 5 && lat && lng && RAPIDAPI_KEY) {
        const nearbyResults = await fetchGolfAmbitNearby(
          parseFloat(lat),
          parseFloat(lng),
          30
        );
        // Filter GolfAmbit results by query string for relevance
        const filtered = nearbyResults.filter(c =>
          c.course_name.toLowerCase().includes(normalizedQuery) ||
          c.club_name.toLowerCase().includes(normalizedQuery) ||
          (c.location.city || '').toLowerCase().includes(normalizedQuery)
        );
        mergedResults = deduplicateCourses(primaryResults, filtered);
      }

      const result = { courses: mergedResults };
      setCache(cacheKey, result);

      return new Response(JSON.stringify(result), {
        headers: { ...cors, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
      });
    }

    // ── action=details — GolfCourseAPI only (has hole-by-hole data) ──
    if (action === 'details' && courseId) {
      // GolfAmbit courses (ga-* IDs) don't have detail data
      if (courseId.startsWith('ga-')) {
        return new Response(
          JSON.stringify({ error: 'Detailed scorecard not available for this course. You can enter hole info manually.' }),
          { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      const cacheKey = `details:${courseId}`;
      const cached = getCached(cacheKey, DETAILS_CACHE_TTL_MS);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { ...cors, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        });
      }

      if (!GOLFCOURSEAPI_KEY) {
        return new Response(
          JSON.stringify({ error: 'API key not configured' }),
          { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(`${GOLFCOURSEAPI_BASE}/v1/courses/${courseId}`, {
        headers: {
          'Authorization': `Key ${GOLFCOURSEAPI_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GolfCourseAPI details error: ${response.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ error: `API error: ${response.status}`, details: errorText }),
          { status: response.status, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      setCache(cacheKey, data);

      return new Response(JSON.stringify(data), {
        headers: { ...cors, ...rateLimitHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use action=search&query=..., action=details&id=..., or action=nearby&lat=...&lng=...' }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
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
