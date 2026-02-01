import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * RevenueCat Webhook Handler
 *
 * This function receives webhook events from RevenueCat when subscription
 * status changes occur (purchases, renewals, cancellations, etc.)
 *
 * RevenueCat Webhook Events:
 * - INITIAL_PURCHASE: New subscription started
 * - RENEWAL: Subscription renewed
 * - CANCELLATION: User cancelled (still active until expiration)
 * - UNCANCELLATION: User re-enabled auto-renew
 * - EXPIRATION: Subscription expired
 * - BILLING_ISSUE_DETECTED: Payment failed, entering grace period
 * - PRODUCT_CHANGE: User changed subscription tier
 */

// CORS headers - restrict to RevenueCat webhook requests only
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://api.revenuecat.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-revenuecat-signature',
};

// RevenueCat webhook authorization header - REQUIRED for security
const REVENUECAT_WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook authorization - REQUIRED
    if (!REVENUECAT_WEBHOOK_AUTH) {
      console.error('REVENUECAT_WEBHOOK_AUTH environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${REVENUECAT_WEBHOOK_AUTH}`) {
      console.error('Unauthorized webhook request');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const event = await req.json();
    console.log('Received RevenueCat webhook:', JSON.stringify(event, null, 2));

    // Extract event data
    const {
      event: eventData,
      api_version,
    } = event;

    if (!eventData) {
      console.error('Missing event data');
      return new Response(
        JSON.stringify({ error: 'Missing event data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      type: eventType,
      app_user_id: userId,
      product_id: productId,
      expiration_at_ms: expirationMs,
      original_transaction_id: originalTransactionId,
      transaction_id: transactionId,
      purchased_at_ms: purchasedAtMs,
    } = eventData;

    console.log(`Processing event: ${eventType} for user: ${userId}`);

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate dates
    const expiresAt = expirationMs ? new Date(expirationMs).toISOString() : null;
    const purchasedAt = purchasedAtMs ? new Date(purchasedAtMs).toISOString() : new Date().toISOString();

    // Handle different event types
    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION': {
        // Activate/renew subscription
        const { error: upsertError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            status: 'active',
            tier: 'pro',
            product_id: productId,
            original_transaction_id: originalTransactionId,
            latest_transaction_id: transactionId,
            expires_at: expiresAt,
            cancellation_date: null,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (upsertError) {
          console.error('Error upserting subscription:', upsertError);
          throw upsertError;
        }

        // Update profile for quick access
        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'pro',
          })
          .eq('id', userId);

        // Log transaction
        await logTransaction(supabase, userId, {
          transactionId,
          originalTransactionId,
          productId,
          purchasedAt,
          expiresAt,
          transactionType: eventType === 'INITIAL_PURCHASE' ? 'initial_purchase' : 'renewal',
          rawReceipt: event,
        });

        console.log(`Subscription activated for user ${userId}`);
        break;
      }

      case 'CANCELLATION': {
        // User cancelled but subscription still active until expiration
        const { error: cancelError } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancellation_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (cancelError) {
          console.error('Error cancelling subscription:', cancelError);
          throw cancelError;
        }

        await logTransaction(supabase, userId, {
          transactionId,
          originalTransactionId,
          productId,
          purchasedAt,
          expiresAt,
          transactionType: 'cancellation',
          rawReceipt: event,
        });

        console.log(`Subscription cancelled for user ${userId}`);
        break;
      }

      case 'EXPIRATION': {
        // Subscription has expired - downgrade to free
        const { error: expireError } = await supabase
          .from('subscriptions')
          .update({
            status: 'expired',
            tier: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (expireError) {
          console.error('Error expiring subscription:', expireError);
          throw expireError;
        }

        // Update profile
        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
          })
          .eq('id', userId);

        console.log(`Subscription expired for user ${userId}`);
        break;
      }

      case 'BILLING_ISSUE_DETECTED': {
        // Enter grace period - still has access but payment failed
        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 16); // Apple's grace period

        const { error: billingError } = await supabase
          .from('subscriptions')
          .update({
            status: 'grace_period',
            grace_period_expires_at: gracePeriodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (billingError) {
          console.error('Error setting grace period:', billingError);
          throw billingError;
        }

        await logTransaction(supabase, userId, {
          transactionId,
          originalTransactionId,
          productId,
          purchasedAt,
          expiresAt,
          transactionType: 'grace_period_start',
          rawReceipt: event,
        });

        console.log(`Grace period started for user ${userId}`);
        break;
      }

      case 'PRODUCT_CHANGE': {
        // User upgraded/downgraded plan
        const { error: changeError } = await supabase
          .from('subscriptions')
          .update({
            product_id: productId,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (changeError) {
          console.error('Error updating product:', changeError);
          throw changeError;
        }

        const changeType = productId?.includes('annual') ? 'upgrade' : 'downgrade';
        await logTransaction(supabase, userId, {
          transactionId,
          originalTransactionId,
          productId,
          purchasedAt,
          expiresAt,
          transactionType: changeType,
          rawReceipt: event,
        });

        console.log(`Product changed for user ${userId} to ${productId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ received: true, event_type: eventType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper to log transactions
async function logTransaction(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  data: {
    transactionId: string;
    originalTransactionId: string;
    productId: string;
    purchasedAt: string;
    expiresAt: string | null;
    transactionType: string;
    rawReceipt: unknown;
  }
) {
  try {
    // Get subscription ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (subscription) {
      await supabase.from('subscription_transactions').insert({
        subscription_id: subscription.id,
        transaction_id: data.transactionId || 'unknown',
        original_transaction_id: data.originalTransactionId || 'unknown',
        product_id: data.productId || 'unknown',
        purchase_date: data.purchasedAt,
        expires_date: data.expiresAt,
        transaction_type: data.transactionType,
        raw_receipt: data.rawReceipt,
      });
    }
  } catch (err) {
    console.error('Error logging transaction:', err);
  }
}
