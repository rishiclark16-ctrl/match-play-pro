import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Redeem Promo Code
 *
 * Validates a promo code and grants lifetime Pro access.
 * Creates/updates the subscription record with product_id = 'promo_lifetime'.
 */

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

// Rate limit: 5 attempts per hour per user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(userId);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
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
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Too many attempts. Please try again later.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    let body: { code?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const code = (body.code ?? '').trim().toUpperCase();
    if (!code || code.length < 3 || code.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Invalid promo code' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Service role client for writes
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Look up promo code (case-insensitive — stored uppercase)
    const { data: promo, error: promoError } = await admin
      .from('promo_codes')
      .select('*')
      .eq('code', code)
      .single();

    if (promoError || !promo) {
      return new Response(
        JSON.stringify({ error: 'Invalid promo code' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Validate promo is usable
    if (!promo.active) {
      return new Response(
        JSON.stringify({ error: 'This promo code is no longer active' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    if (promo.current_uses >= promo.max_uses) {
      return new Response(
        JSON.stringify({ error: 'This promo code has reached its usage limit' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This promo code has expired' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already redeemed this code
    const { data: existing } = await admin
      .from('promo_redemptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('promo_code_id', promo.id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'You have already redeemed this code' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has Pro (via any method)
    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('tier, status, product_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingSub?.tier === 'pro' && existingSub?.status === 'active') {
      return new Response(
        JSON.stringify({ error: 'You already have an active Pro subscription' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // ── Grant Pro access ──────────────────────────────────────────────

    // 1. Record the redemption
    const { error: redemptionError } = await admin
      .from('promo_redemptions')
      .insert({ user_id: user.id, promo_code_id: promo.id });

    if (redemptionError) {
      console.error('Failed to record redemption:', redemptionError);
      return new Response(
        JSON.stringify({ error: 'Failed to redeem code' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Increment usage count
    await admin
      .from('promo_codes')
      .update({ current_uses: promo.current_uses + 1 })
      .eq('id', promo.id);

    // 3. Upsert subscription as lifetime Pro
    const { error: subError } = await admin
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        status: 'active',
        tier: 'pro',
        product_id: 'promo_lifetime',
        expires_at: '2099-12-31T23:59:59Z',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (subError) {
      console.error('Failed to create subscription:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to activate Pro' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Update profile tier
    await admin
      .from('profiles')
      .update({ subscription_tier: 'pro' })
      .eq('id', user.id);

    console.log(`Promo redeemed: user=${user.id}, code=${code}, type=${promo.type}`);

    return new Response(
      JSON.stringify({ success: true, type: promo.type }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Redeem promo error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
