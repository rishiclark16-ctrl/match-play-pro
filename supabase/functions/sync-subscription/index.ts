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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
