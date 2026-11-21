import { Player } from '@/types/golf';
import { NetSettlement } from '@/lib/games/settlement';

export interface LedgerEntry {
  profileId: string;
  amount: number;
  gameBreakdown: { round: number };
}

export type BuildLedgerResult =
  | { ok: true; entries: LedgerEntry[]; guestNames: string[] }
  | { ok: false; error: string };

const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * Turns round settlements into per-profile group-tab entries.
 *
 * Guests have no account, so they can't hold a balance on a tab. Their net is
 * attributed to the round's host (the person who added them), so the tab still
 * sums to zero (Notion 09.2 M8). If the host isn't in the round while a guest has
 * a non-zero balance, the operation is refused rather than silently unbalanced.
 */
export function buildLedgerEntries(
  settlements: NetSettlement[],
  players: Player[],
  hostProfileId: string | null | undefined,
): BuildLedgerResult {
  const netByPlayer = new Map<string, number>();
  settlements.forEach(s => {
    netByPlayer.set(s.fromPlayerId, (netByPlayer.get(s.fromPlayerId) ?? 0) - s.amount);
    netByPlayer.set(s.toPlayerId, (netByPlayer.get(s.toPlayerId) ?? 0) + s.amount);
  });

  const hostIsPlaying = !!hostProfileId && players.some(x => x.profileId === hostProfileId);
  const byProfile = new Map<string, number>();
  const guestNames: string[] = [];

  for (const p of players) {
    const net = netByPlayer.get(p.id) ?? 0;
    if (p.profileId) {
      byProfile.set(p.profileId, (byProfile.get(p.profileId) ?? 0) + net);
      continue;
    }
    if (cents(net) === 0) continue;
    if (!hostIsPlaying || !hostProfileId) {
      const amount = Math.abs(cents(net)).toFixed(2);
      return { ok: false, error: `${p.name} doesn't have an account, so their $${amount} can't go on the tab` };
    }
    byProfile.set(hostProfileId, (byProfile.get(hostProfileId) ?? 0) + net);
    guestNames.push(p.name);
  }

  if (byProfile.size === 0) {
    return { ok: false, error: 'No linked profiles — players must have accounts to add to tab' };
  }

  const entries = [...byProfile].map(([profileId, amount]) => ({
    profileId,
    amount: cents(amount),
    gameBreakdown: { round: cents(amount) },
  }));
  return { ok: true, entries, guestNames };
}
