import { useEffect, useRef } from 'react';
import { Player, Round } from '@/types/golf';
import { NetSettlement } from '@/lib/games/settlement';
import { isSoloRound } from '@/lib/soloRound';
import { maybeRequestReview, recordCompletedRound } from '@/lib/reviewPrompt';

interface Args {
  round: Round | null;
  rawPlayers: Player[];
  settlements: NetSettlement[];
  userId: string | undefined;
}

/**
 * On the round-complete screen, ask for an App Store review at most once per visit,
 * and only when the policy in lib/reviewPrompt allows (returning player, up money).
 * Waits a beat so the results land first.
 */
export function useReviewPrompt({ round, rawPlayers, settlements, userId }: Args) {
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !round || round.status !== 'complete' || !userId || rawPlayers.length === 0) return;
    const me = rawPlayers.find(p => p.profileId === userId);
    if (!me) return;
    done.current = true;

    const completedRounds = recordCompletedRound(round.id);
    const netWinnings = settlements.reduce(
      (sum, s) => sum + (s.toPlayerId === me.id ? s.amount : 0) - (s.fromPlayerId === me.id ? s.amount : 0),
      0,
    );
    const solo = isSoloRound(round, rawPlayers);

    const t = setTimeout(() => {
      void maybeRequestReview({ completedRounds, netWinnings, isSoloRound: solo });
    }, 2500);
    return () => clearTimeout(t);
  }, [round, rawPlayers, settlements, userId]);
}
