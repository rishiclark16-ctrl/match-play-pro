/**
 * Weekly recap push — fires once per week via pg_cron.
 *
 * Computes per-profile summary of the last 7 days of golf activity:
 *   - rounds played
 *   - net money (won − lost across all bet_settlements)
 *   - best round relative to par
 * and sends a push via APNs to every device_token for each profile that has
 * `notification_preferences.weeklyRecap !== false`.
 *
 * Auth: requires `x-recap-secret` header matching the `WEEKLY_RECAP_SECRET` env var.
 * This function is intended to be called by pg_cron via `pg_net`, not by clients.
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  signApnsJwt,
  DEAD_TOKEN_REASONS,
  parseApnsReason,
  getApnsHost,
} from '../_shared/apns.ts';

interface RoundRow {
  id: string;
  completed_at: string | null;
  hole_info: Array<{ number: number; par: number }> | null;
}

interface PlayerRow {
  id: string;
  profile_id: string | null;
  round_id: string | null;
}

interface ScoreRow {
  player_id: string;
  strokes: number;
  hole_number: number;
  round_id: string;
}

interface SettlementRow {
  from_player_id: string;
  to_player_id: string;
  amount: number;
}

interface ProfileRow {
  id: string;
  notification_preferences: Record<string, boolean> | null;
}

interface RecapStats {
  rounds: number;
  net: number;
  bestToPar: number | null;
}

function buildBody(stats: RecapStats): { title: string; body: string } {
  const TEE = '⛳';
  if (stats.rounds === 0) {
    return {
      title: `Your week on the course ${TEE}`,
      body: `Zero rounds this week. Time to tee it up ${TEE}`,
    };
  }

  const roundsLabel = stats.rounds === 1 ? '1 round' : `${stats.rounds} rounds`;

  let moneyLine: string;
  if (stats.net > 0.01) {
    moneyLine = `up $${stats.net.toFixed(2)}`;
  } else if (stats.net < -0.01) {
    moneyLine = `down $${Math.abs(stats.net).toFixed(2)}`;
  } else {
    moneyLine = 'even on the books';
  }

  let bestLine = '';
  if (stats.bestToPar !== null) {
    if (stats.bestToPar < 0) {
      bestLine = `, best round ${stats.bestToPar} under`;
    } else if (stats.bestToPar === 0) {
      bestLine = ', best round even par';
    } else {
      bestLine = `, best round +${stats.bestToPar}`;
    }
  }

  return {
    title: `Your week on the course ${TEE}`,
    body: `${roundsLabel}, ${moneyLine}${bestLine} ${TEE}`,
  };
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const recapSecret = Deno.env.get('WEEKLY_RECAP_SECRET');
  if (!recapSecret) {
    console.error('weekly-recap: WEEKLY_RECAP_SECRET not configured');
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 503 });
  }
  if (req.headers.get('x-recap-secret') !== recapSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const teamId = Deno.env.get('APNS_TEAM_ID');
  const keyId = Deno.env.get('APNS_KEY_ID');
  const privateKey = Deno.env.get('APNS_PRIVATE_KEY');
  const bundleId = Deno.env.get('APNS_BUNDLE_ID') ?? 'dev.matchgolf.app';
  const isProduction = Deno.env.get('APNS_ENV') === 'production';

  if (!teamId || !keyId || !privateKey) {
    console.error('weekly-recap: APNs env vars not configured');
    return new Response(JSON.stringify({ error: 'APNs not configured' }), { status: 503 });
  }

  // 1. Fetch rounds completed in the last 7 days.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rounds, error: roundsErr } = await adminClient
    .from('rounds')
    .select('id, completed_at, hole_info')
    .eq('status', 'complete')
    .gte('completed_at', sevenDaysAgo);

  if (roundsErr) {
    console.error('weekly-recap: rounds query failed', roundsErr);
    return new Response(JSON.stringify({ error: 'Query failed' }), { status: 500 });
  }

  const roundIds = (rounds ?? []).map((r: RoundRow) => r.id);
  if (roundIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no rounds in window' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const parsByRound = new Map<string, Map<number, number>>();
  for (const r of (rounds ?? []) as RoundRow[]) {
    const parMap = new Map<number, number>();
    for (const h of r.hole_info ?? []) {
      parMap.set(h.number, h.par);
    }
    parsByRound.set(r.id, parMap);
  }

  // 2. Fetch all players in those rounds.
  const { data: players, error: playersErr } = await adminClient
    .from('players')
    .select('id, profile_id, round_id')
    .in('round_id', roundIds)
    .not('profile_id', 'is', null);

  if (playersErr) {
    console.error('weekly-recap: players query failed', playersErr);
    return new Response(JSON.stringify({ error: 'Query failed' }), { status: 500 });
  }

  const playerById = new Map<string, PlayerRow>();
  const playerIdsByProfile = new Map<string, string[]>();
  const roundsByProfile = new Map<string, Set<string>>();
  for (const p of (players ?? []) as PlayerRow[]) {
    if (!p.profile_id || !p.round_id) continue;
    playerById.set(p.id, p);
    const list = playerIdsByProfile.get(p.profile_id) ?? [];
    list.push(p.id);
    playerIdsByProfile.set(p.profile_id, list);
    const rset = roundsByProfile.get(p.profile_id) ?? new Set<string>();
    rset.add(p.round_id);
    roundsByProfile.set(p.profile_id, rset);
  }

  const allPlayerIds = Array.from(playerById.keys());
  if (allPlayerIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no profile players' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Fetch scores for those players to compute best round.
  const { data: scores, error: scoresErr } = await adminClient
    .from('scores')
    .select('player_id, strokes, hole_number, round_id')
    .in('round_id', roundIds);

  if (scoresErr) {
    console.error('weekly-recap: scores query failed', scoresErr);
    return new Response(JSON.stringify({ error: 'Query failed' }), { status: 500 });
  }

  // Aggregate best-round-to-par per profile
  const bestToParByProfile = new Map<string, number>();
  const toParByPlayerRound = new Map<string, number>();
  for (const s of (scores ?? []) as ScoreRow[]) {
    const parMap = parsByRound.get(s.round_id);
    if (!parMap) continue;
    const par = parMap.get(s.hole_number) ?? 4;
    const key = `${s.player_id}:${s.round_id}`;
    toParByPlayerRound.set(key, (toParByPlayerRound.get(key) ?? 0) + (s.strokes - par));
  }
  for (const [key, toPar] of toParByPlayerRound) {
    const playerId = key.split(':')[0];
    const player = playerById.get(playerId);
    if (!player?.profile_id) continue;
    const current = bestToParByProfile.get(player.profile_id);
    if (current === undefined || toPar < current) {
      bestToParByProfile.set(player.profile_id, toPar);
    }
  }

  // 4. Fetch settlements for those rounds to compute net money.
  const { data: settlements, error: settlementsErr } = await adminClient
    .from('bet_settlements')
    .select('from_player_id, to_player_id, amount')
    .in('round_id', roundIds);

  if (settlementsErr) {
    console.error('weekly-recap: settlements query failed', settlementsErr);
    return new Response(JSON.stringify({ error: 'Query failed' }), { status: 500 });
  }

  const netByProfile = new Map<string, number>();
  for (const s of (settlements ?? []) as SettlementRow[]) {
    const amount = Number(s.amount);
    if (!Number.isFinite(amount)) continue;
    const fromPlayer = playerById.get(s.from_player_id);
    const toPlayer = playerById.get(s.to_player_id);
    if (fromPlayer?.profile_id) {
      netByProfile.set(fromPlayer.profile_id, (netByProfile.get(fromPlayer.profile_id) ?? 0) - amount);
    }
    if (toPlayer?.profile_id) {
      netByProfile.set(toPlayer.profile_id, (netByProfile.get(toPlayer.profile_id) ?? 0) + amount);
    }
  }

  // 5. Fetch profiles + device tokens for every profile that played.
  const profileIds = Array.from(roundsByProfile.keys());
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
    console.error('weekly-recap: profile/token lookup failed', profilesResult.error ?? tokensResult.error);
    return new Response(JSON.stringify({ error: 'Lookup failed' }), { status: 500 });
  }

  const prefsByProfile = new Map<string, Record<string, boolean> | null>(
    ((profilesResult.data ?? []) as ProfileRow[]).map((p) => [p.id, p.notification_preferences]),
  );
  const tokensByProfile = new Map<string, string[]>();
  for (const row of (tokensResult.data ?? []) as Array<{ profile_id: string; token: string }>) {
    const list = tokensByProfile.get(row.profile_id) ?? [];
    list.push(row.token);
    tokensByProfile.set(row.profile_id, list);
  }

  // 6. Build send list, respecting weeklyRecap preference and token availability.
  const jwt = await signApnsJwt(teamId, keyId, privateKey);
  const apnsHost = getApnsHost(isProduction);
  const expiration = Math.floor(Date.now() / 1000) + 6 * 60 * 60; // 6h

  const deadTokens: string[] = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const profileId of profileIds) {
    const prefs = prefsByProfile.get(profileId);
    if (prefs && prefs.weeklyRecap === false) {
      skipped++;
      continue;
    }
    const tokens = tokensByProfile.get(profileId) ?? [];
    if (tokens.length === 0) {
      skipped++;
      continue;
    }

    const stats: RecapStats = {
      rounds: (roundsByProfile.get(profileId) ?? new Set()).size,
      net: netByProfile.get(profileId) ?? 0,
      bestToPar: bestToParByProfile.get(profileId) ?? null,
    };
    const { title, body } = buildBody(stats);
    const payload = JSON.stringify({
      aps: {
        alert: { title, body },
        sound: 'default',
        'thread-id': 'weeklyRecap',
      },
      type: 'weeklyRecap',
      route: '/stats',
    });

    for (const token of tokens) {
      try {
        const res = await fetch(`${apnsHost}/3/device/${token}`, {
          method: 'POST',
          headers: {
            authorization: `bearer ${jwt}`,
            'apns-topic': bundleId,
            'apns-push-type': 'alert',
            'apns-priority': '5', // not time-sensitive
            'apns-expiration': String(expiration),
            'apns-collapse-id': 'weeklyRecap',
            'content-type': 'application/json',
          },
          body: payload,
        });
        if (res.status === 200) {
          sent++;
        } else {
          failed++;
          const reason = parseApnsReason(res.status, await res.text());
          if (reason && DEAD_TOKEN_REASONS.has(reason)) {
            deadTokens.push(token);
          }
        }
      } catch (err) {
        failed++;
        console.error('weekly-recap: send error', err);
      }
    }
  }

  // 7. Clean up dead tokens.
  if (deadTokens.length > 0) {
    const { error: deleteErr } = await adminClient
      .from('device_tokens')
      .delete()
      .in('token', deadTokens);
    if (deleteErr) {
      console.error('weekly-recap: dead token cleanup failed', deleteErr);
    }
  }

  return new Response(
    JSON.stringify({
      sent,
      failed,
      skipped,
      dead: deadTokens.length,
      profilesProcessed: profileIds.length,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
