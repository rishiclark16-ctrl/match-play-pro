import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Delete Account Edge Function
 *
 * Permanently deletes a user's account and all associated data.
 * Requires the user to be authenticated. Uses the service role key
 * to perform admin-level deletion of auth user and all related data.
 */

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

// Rate limiting: 3 delete attempts per hour per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
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

serve(async (req) => {
  const cors = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth to verify identity
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit: 3 delete attempts per hour per user
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`Account deletion requested for user ${userId}`);

    // Create admin client with service role key for deletion operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user data from all tables (order matters due to foreign keys)
    // Scores reference players, players reference rounds, etc.

    // 1. Delete scores (references players)
    const { error: scoresError } = await adminSupabase
      .from('scores')
      .delete()
      .eq('player_id', userId);
    if (scoresError) console.error('Error deleting scores:', scoresError);

    // 2. Delete prop bets created by user
    const { error: propBetsError } = await adminSupabase
      .from('prop_bets')
      .delete()
      .eq('created_by', userId);
    if (propBetsError) console.error('Error deleting prop_bets:', propBetsError);

    // 3. Delete players entries (user as player in rounds)
    const { error: playersError } = await adminSupabase
      .from('players')
      .delete()
      .eq('user_id', userId);
    if (playersError) console.error('Error deleting players:', playersError);

    // 4. Delete rounds created by user
    const { error: roundsError } = await adminSupabase
      .from('rounds')
      .delete()
      .eq('created_by', userId);
    if (roundsError) console.error('Error deleting rounds:', roundsError);

    // 5. Delete round spectator entries
    const { error: spectatorsError } = await adminSupabase
      .from('round_spectators')
      .delete()
      .eq('user_id', userId);
    if (spectatorsError) console.error('Error deleting round_spectators:', spectatorsError);

    // 6. Delete friendships (both directions)
    const { error: friendships1Error } = await adminSupabase
      .from('friendships')
      .delete()
      .eq('user_id', userId);
    if (friendships1Error) console.error('Error deleting friendships (user_id):', friendships1Error);

    const { error: friendships2Error } = await adminSupabase
      .from('friendships')
      .delete()
      .eq('friend_id', userId);
    if (friendships2Error) console.error('Error deleting friendships (friend_id):', friendships2Error);

    // 7. Delete group memberships
    const { error: groupMembersError } = await adminSupabase
      .from('group_members')
      .delete()
      .eq('user_id', userId);
    if (groupMembersError) console.error('Error deleting group_members:', groupMembersError);

    // 8. Delete groups created by user
    const { error: groupsError } = await adminSupabase
      .from('golf_groups')
      .delete()
      .eq('created_by', userId);
    if (groupsError) console.error('Error deleting golf_groups:', groupsError);

    // 9. Delete subscription
    const { error: subscriptionError } = await adminSupabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);
    if (subscriptionError) console.error('Error deleting subscriptions:', subscriptionError);

    // 10. Delete avatar from storage
    try {
      const { data: avatarFiles } = await adminSupabase.storage
        .from('avatars')
        .list(userId);
      if (avatarFiles && avatarFiles.length > 0) {
        const filePaths = avatarFiles.map(f => `${userId}/${f.name}`);
        await adminSupabase.storage.from('avatars').remove(filePaths);
      }
    } catch (storageError) {
      console.error('Error deleting avatar storage:', storageError);
    }

    // 11. Delete profile (should be last before auth deletion)
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profileError) console.error('Error deleting profile:', profileError);

    // 12. Delete the auth user (must be last)
    const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete account. Please try again.' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Account successfully deleted for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Account deletion error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
