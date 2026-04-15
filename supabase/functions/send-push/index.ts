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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
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

// APNs errors that mean "this token is dead — stop using it".
const DEAD_TOKEN_REASONS = new Set([
  'BadDeviceToken',
  'Unregistered',
  'DeviceTokenNotForTopic',
  'TopicDisallowed',
]);

// Time-sensitive types: if the device isn't reachable within a few minutes,
// the notification is no longer worth delivering (stale presses, late joins, etc.).
const EPHEMERAL_TYPES = new Set([
  'pressTriggered',
  'friendStartedRound',
  'watch_party',
  'scoreEnteredForYou',
]);

function getApnsExpiration(type: string): number {
  if (EPHEMERAL_TYPES.has(type)) {
    return Math.floor(Date.now() / 1000) + 5 * 60; // 5 minutes
  }
  return Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours
}

function getCollapseId(type: string, data: Record<string, unknown>): string {
  const roundId = typeof data.roundId === 'string' ? data.roundId : null;
  return roundId ? `${type}:${roundId}` : type;
}

function getThreadId(type: string, data: Record<string, unknown>): string {
  const roundId = typeof data.roundId === 'string' ? data.roundId : null;
  return roundId ?? type;
}

function parseApnsReason(status: number, bodyText: string): string | null {
  if (status === 200) return null;
  try {
    const parsed = JSON.parse(bodyText);
    return typeof parsed?.reason === 'string' ? parsed.reason : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    // Persistent rate limit: 50 sends per hour per user (atomic upsert in Postgres).
    const { data: allowed, error: rateErr } = await adminClient.rpc('check_push_rate_limit', {
      p_user_id: user.id,
    });
    if (rateErr) {
      console.error('send-push: rate limit check failed', rateErr);
      return new Response(
        JSON.stringify({ error: 'Rate limit check failed' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }
    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: 'Too many push requests. Please try again later.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const { profileIds, title, body, data, type } = await req.json();

    if (!Array.isArray(profileIds) || profileIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'profileIds must be a non-empty array' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }
    if (typeof title !== 'string' || typeof body !== 'string') {
      return new Response(
        JSON.stringify({ error: 'title and body are required strings' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }
    if (typeof type !== 'string' || type.length === 0) {
      return new Response(
        JSON.stringify({ error: 'type is required' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    // Server-side token + preference lookup (no client pre-fetch).
    // Pull every device_token row for the target profiles, plus each profile's
    // notification_preferences, then filter by type. Supports multi-device.
    const [profilesResult, tokensResult] = await Promise.all([
      adminClient
        .from('profiles')
        .select('id, notification_preferences')
        .in('id', profileIds),
      adminClient
        .from('device_tokens')
        .select('profile_id, token')
        .in('profile_id', profileIds),
    ]);

    if (profilesResult.error || tokensResult.error) {
      console.error(
        'send-push: lookup failed',
        profilesResult.error ?? tokensResult.error,
      );
      return new Response(
        JSON.stringify({ error: 'Profile lookup failed' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const prefsByProfile = new Map<string, Record<string, boolean> | null>(
      (profilesResult.data ?? []).map((p) => [
        p.id as string,
        p.notification_preferences as Record<string, boolean> | null,
      ]),
    );

    const targets = (tokensResult.data ?? [])
      .filter((row) => {
        const prefs = prefsByProfile.get(row.profile_id as string);
        if (prefs === undefined) return false;
        return prefs === null || prefs[type] !== false;
      })
      .map((row) => ({
        profileId: row.profile_id as string,
        token: row.token as string,
      }));

    if (targets.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, skipped: profileIds.length }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
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

    const safeData = (data ?? {}) as Record<string, unknown>;
    const threadId = getThreadId(type, safeData);
    const collapseId = getCollapseId(type, safeData);
    const expiration = getApnsExpiration(type);

    const payload = JSON.stringify({
      aps: {
        alert: { title, body },
        sound: 'default',
        'thread-id': threadId,
      },
      ...safeData,
      type,
    });

    const results = await Promise.all(
      targets.map(async ({ profileId, token }) => {
        try {
          const res = await fetch(`${apnsHost}/3/device/${token}`, {
            method: 'POST',
            headers: {
              authorization: `bearer ${jwt}`,
              'apns-topic': bundleId,
              'apns-push-type': 'alert',
              'apns-priority': '10',
              'apns-expiration': String(expiration),
              'apns-collapse-id': collapseId,
              'content-type': 'application/json',
            },
            body: payload,
          });

          const responseText = res.status !== 200 ? await res.text() : '';
          return {
            profileId,
            token,
            tokenTail: token.slice(-8),
            status: res.status,
            reason: parseApnsReason(res.status, responseText),
            error: responseText || undefined,
          };
        } catch (err) {
          return {
            profileId,
            token,
            tokenTail: token.slice(-8),
            status: 0,
            reason: null,
            error: String(err),
          };
        }
      }),
    );

    // Remove dead tokens so we don't keep hammering APNs with known-bad ones.
    // Delete from device_tokens directly (multi-device safe — unaffected devices
    // for the same profile are preserved).
    const deadTokens = results
      .filter((r) => r.reason && DEAD_TOKEN_REASONS.has(r.reason))
      .map((r) => r.token);

    if (deadTokens.length > 0) {
      const { error: clearErr } = await adminClient
        .from('device_tokens')
        .delete()
        .in('token', deadTokens);
      if (clearErr) {
        console.warn('send-push: failed to clear dead tokens', clearErr);
      }
    }

    const failed = results.filter((r) => r.status !== 200);
    if (failed.length > 0) {
      // Log without full token (tail only) to avoid leaking device identifiers.
      console.warn(
        'send-push: some deliveries failed',
        JSON.stringify(
          failed.map(({ token: _t, ...rest }) => rest),
        ),
      );
    }

    return new Response(
      JSON.stringify({
        sent: results.length - failed.length,
        failed: failed.length,
        cleared: deadTokens.length,
      }),
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
