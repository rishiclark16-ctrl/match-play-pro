import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Sync Subscription Status
 *
 * Called by the client after a successful purchase to immediately update
 * the subscription status in the database. This provides instant feedback
 * to the user without waiting for the webhook.
 *
 * The webhook will still fire and provide the authoritative update,
 * but this ensures a good user experience.
 */

// ============================================================================
// Input Validation Utilities
// ============================================================================

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface SyncSubscriptionPayload {
  isPro: boolean;
  activeSubscription?: string;
  expirationDate?: string;
  willRenew?: boolean;
}

/**
 * Validates a boolean field
 */
function validateBoolean(
  value: unknown,
  fieldName: string,
  options: { required?: boolean } = {}
): ValidationError | null {
  const { required = false } = options;

  if (value === undefined || value === null) {
    if (required) {
      return { field: fieldName, message: `${fieldName} is required` };
    }
    return null;
  }

  if (typeof value !== 'boolean') {
    return { field: fieldName, message: `${fieldName} must be a boolean` };
  }

  return null;
}

/**
 * Validates a string field
 */
function validateString(
  value: unknown,
  fieldName: string,
  options: { required?: boolean; minLength?: number; maxLength?: number; pattern?: RegExp } = {}
): ValidationError | null {
  const { required = false, minLength, maxLength, pattern } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      return { field: fieldName, message: `${fieldName} is required` };
    }
    return null;
  }

  if (typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} must be a string` };
  }

  if (minLength !== undefined && value.length < minLength) {
    return { field: fieldName, message: `${fieldName} must be at least ${minLength} characters` };
  }

  if (maxLength !== undefined && value.length > maxLength) {
    return { field: fieldName, message: `${fieldName} must be at most ${maxLength} characters` };
  }

  if (pattern && !pattern.test(value)) {
    return { field: fieldName, message: `${fieldName} has invalid format` };
  }

  return null;
}

/**
 * Validates an ISO 8601 date string
 */
function validateISODateString(
  value: unknown,
  fieldName: string,
  options: { required?: boolean } = {}
): ValidationError | null {
  const { required = false } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      return { field: fieldName, message: `${fieldName} is required` };
    }
    return null;
  }

  if (typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} must be a string` };
  }

  // ISO 8601 date pattern (allows various valid formats)
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})?)?$/;

  if (!isoDatePattern.test(value)) {
    return { field: fieldName, message: `${fieldName} must be a valid ISO 8601 date string` };
  }

  // Also verify it parses to a valid date
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return { field: fieldName, message: `${fieldName} must be a valid date` };
  }

  // Reasonable date range check (not before year 2000, not after year 3000)
  const minDate = new Date('2000-01-01T00:00:00Z');
  const maxDate = new Date('3000-01-01T00:00:00Z');
  if (parsed < minDate || parsed > maxDate) {
    return { field: fieldName, message: `${fieldName} is outside acceptable date range` };
  }

  return null;
}

/**
 * Validates the sync subscription request payload
 */
function validateSyncSubscriptionPayload(payload: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!payload || typeof payload !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'payload', message: 'Request body must be a JSON object' }]
    };
  }

  const data = payload as Record<string, unknown>;

  // Validate isPro - required boolean
  const isProError = validateBoolean(data.isPro, 'isPro', { required: true });
  if (isProError) errors.push(isProError);

  // Validate activeSubscription - optional string (product ID)
  const activeSubscriptionError = validateString(data.activeSubscription, 'activeSubscription', {
    maxLength: 255,
  });
  if (activeSubscriptionError) errors.push(activeSubscriptionError);

  // Validate expirationDate - optional ISO date string
  const expirationDateError = validateISODateString(data.expirationDate, 'expirationDate');
  if (expirationDateError) errors.push(expirationDateError);

  // Validate willRenew - optional boolean
  const willRenewError = validateBoolean(data.willRenew, 'willRenew');
  if (willRenewError) errors.push(willRenewError);

  // Cross-field validation: if isPro is true, activeSubscription should be provided
  if (data.isPro === true && !data.activeSubscription) {
    errors.push({
      field: 'activeSubscription',
      message: 'activeSubscription is required when isPro is true'
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Creates a validation error response
 */
function createValidationErrorResponse(errors: ValidationError[], cors: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      details: errors,
    }),
    {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' }
    }
  );
}

// ============================================================================
// Rate Limiting
// ============================================================================

// Simple in-memory rate limiting (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per hour per user

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const record = rateLimitMap.get(userId);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetInSeconds: 3600 };
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

// ============================================================================
// Main Handler
// ============================================================================

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

serve(async (req) => {
  const cors = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit (per user)
    const rateLimit = checkRateLimit(user.id);
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

    // Parse JSON body with error handling
    let rawPayload: unknown;
    try {
      rawPayload = await req.json();
    } catch (parseError) {
      console.error('Failed to parse JSON body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the request payload
    const validationResult = validateSyncSubscriptionPayload(rawPayload);
    if (!validationResult.valid) {
      console.error('Sync subscription validation failed:', validationResult.errors);
      return createValidationErrorResponse(validationResult.errors, cors);
    }

    // Type-safe extraction after validation
    const body = rawPayload as SyncSubscriptionPayload;
    const { isPro, activeSubscription, expirationDate, willRenew } = body;

    console.log(`Syncing subscription for user ${user.id}:`, { isPro, activeSubscription, expirationDate });

    // Create service role client for writing
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    if (isPro) {
      // Upsert subscription record
      const { error: upsertError } = await adminSupabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          status: 'active',
          tier: 'pro',
          product_id: activeSubscription,
          expires_at: expirationDate,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (upsertError) {
        console.error('Error upserting subscription:', upsertError);
        throw upsertError;
      }

      // Update profile
      await adminSupabase
        .from('profiles')
        .update({ subscription_tier: 'pro' })
        .eq('id', user.id);

      console.log(`Subscription synced as Pro for user ${user.id}`);
    } else {
      // Check if user has existing subscription and downgrade if needed
      const { data: existing } = await adminSupabase
        .from('subscriptions')
        .select('id, tier')
        .eq('user_id', user.id)
        .single();

      if (existing && existing.tier === 'pro') {
        // Downgrade to free
        await adminSupabase
          .from('subscriptions')
          .update({
            status: 'expired',
            tier: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        await adminSupabase
          .from('profiles')
          .update({ subscription_tier: 'free' })
          .eq('id', user.id);

        console.log(`Subscription synced as Free for user ${user.id}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
