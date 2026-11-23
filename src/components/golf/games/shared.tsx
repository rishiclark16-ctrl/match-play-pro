import { Round, Player, Score, Press, PlayerWithScores } from '@/types/golf';
import { PropBet } from '@/types/betting';
import { cn } from '@/lib/utils';

// ─── Design tokens ──────────────────────────────────────────────────────────
export const SPRING = { type: 'spring' as const, stiffness: 300, damping: 28 };
export const ACCENT = '#BEF264';

// ─── Shared types ───────────────────────────────────────────────────────────

export interface GamesSectionProps {
  round: Round;
  players: PlayerWithScores[];
  scores: Score[];
  currentHole: number;
  onAddPress: (press: Press) => void;
  propBets?: PropBet[];
}

// ─── Tiny shared sub-components ─────────────────────────────────────────────

export function LiveDot() {
  return (
    <span className="inline-block w-2 h-2 rounded-full bg-[#14532D]" aria-hidden="true" />
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] font-semibold text-[#0F1F17] mb-2">
      {children}
    </p>
  );
}

export function GameCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'bg-white rounded-[20px] border border-[#E7E9E3] p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function NetBadge() {
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F0F2EC] text-[#5A6B61]">
      Net
    </span>
  );
}

// Small W / L / H dot for hole-by-hole rows
export function HoleDot({ result }: { result: 'W' | 'L' | 'H' | null }) {
  if (!result) {
    return <span className="w-5 h-5 rounded-full bg-[#F0F2EC] inline-block" />;
  }
  return (
    <span
      className={cn(
        'w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold text-white',
        result === 'W' && 'bg-[#14532D]',
        result === 'L' && 'bg-[#B42318]',
        result === 'H' && 'bg-[#E7E9E3] text-[#5A6B61]',
      )}
    >
      {result}
    </span>
  );
}

export function Divider() {
  return <div className="border-t border-[#E7E9E3]" />;
}
