import { supabase } from '@/integrations/supabase/client';
import { sendPushToProfiles } from '@/lib/pushUtils';

/**
 * Broadcasts a Watch Party push notification to all friends of all players in a round.
 * Called once per round when the first score is entered.
 * Idempotent — checks watch_party_notifications to prevent double-sends.
 */
export async function broadcastWatchPartyNotification(
  roundId: string,
  courseName: string,
  playerNames: string[],
): Promise<void> {
  try {
    // 1. Check if notification already sent for this round
    const { data: existing } = await supabase
      .from('watch_party_notifications')
      .select('round_id')
      .eq('round_id', roundId)
      .maybeSingle();

    if (existing) return;

    // 2. Get recipient profile IDs (friends of players, minus players)
    const { data: recipients, error: rpcError } = await supabase
      .rpc('get_watch_party_recipients', { p_round_id: roundId });

    if (rpcError || !recipients?.length) return;

    const profileIds = (recipients as { profile_id: string }[]).map(r => r.profile_id);

    // 3. Format player names for notification body
    const nameList = formatPlayerNames(playerNames);

    // 4. Send push notification
    await sendPushToProfiles({
      profileIds,
      title: 'Friends teed off ⛳',
      body: `${nameList} just started at ${courseName} — join the peanut gallery`,
      data: { roundId, route: `/watch/${roundId}`, type: 'watch_party' },
      type: 'watch_party',
    });

    // 5. Record that notification was sent (prevent re-sends)
    await supabase
      .from('watch_party_notifications')
      .insert({ round_id: roundId, recipient_count: profileIds.length });
  } catch {
    // Watch Party notifications are non-critical — never throw
  }
}

function formatPlayerNames(names: string[]): string {
  if (names.length === 0) return 'Your friends';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  if (names.length <= 4) {
    return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
  }
  return `${names[0]}, ${names[1]} & ${names.length - 2} others`;
}
