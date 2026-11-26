import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { GameConfig, HoleInfo, PlayerWithScores, Score } from '@/types/golf';
import { settleCustomGame } from '@/lib/games/custom/engine';
import { describeSpec } from '@/lib/games/custom/describe';
import { strokesFromPlayers } from '@/lib/games/custom/round';
import { cn } from '@/lib/utils';
import { LiveDot } from './shared';
import { signedMoney } from './money';

/**
 * A custom game on the scorecard: its rules in plain words (the same text the
 * golfer confirmed), each player's points and their money "if it ended here".
 */
export function CustomGameSection({ game, players, scores, holeInfo }: {
  game: GameConfig;
  players: PlayerWithScores[];
  scores: Score[];
  holeInfo: HoleInfo[];
}) {
  const [open, setOpen] = useState(false);
  const spec = game.spec!;
  const firstName = (id: string) => (players.find(p => p.id === id)?.name ?? '?').split(' ')[0];

  const { result, money } = useMemo(() => {
    const { result, transfers } = settleCustomGame({
      spec, playerIds: players.map(p => p.id), scores, holeInfo,
      strokes: strokesFromPlayers(players), stake: game.stakes, final: false,
    });
    const money: Record<string, number> = {};
    for (const t of transfers) {
      money[t.from] = (money[t.from] ?? 0) - t.amount;
      money[t.to] = (money[t.to] ?? 0) + t.amount;
    }
    return { result, money };
  }, [spec, players, scores, holeInfo, game.stakes]);

  const rules = describeSpec(spec, firstName, game.stakes);
  const unit = spec.scoring === 'holes' ? 'holes' : 'pts';
  const standings = players
    .map(p => ({ id: p.id, points: Math.round((result.byPlayer[p.id] ?? 0) * 100) / 100, money: Math.round((money[p.id] ?? 0) * 100) / 100 }))
    .sort((a, b) => b.money - a.money || b.points - a.points);

  return (
    <div className="space-y-3" data-testid="custom-game">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <LiveDot />
          <span className="text-[15px] font-semibold text-[#0F1F17] truncate">{spec.name}</span>
        </div>
        <span className="text-[12px] text-[#5A6B61] flex-shrink-0">Thru {result.holesPlayed}</span>
      </div>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full min-h-[44px] flex items-center justify-between rounded-[14px] bg-[#FAFAF7] px-3 text-left"
      >
        <span className="text-[13px] font-semibold text-[#0F1F17]">{open ? 'The rules' : rules[0]}</span>
        <ChevronDown className={cn('w-4 h-4 text-[#5A6B61] transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="space-y-1 px-1">
          {rules.map(line => (
            <li key={line} className="flex gap-2 text-[13px] leading-snug text-[#0F1F17]">
              <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#14532D]" />{line}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5">
        {standings.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-[14px] bg-[#FAFAF7]">
            <span className="text-[11px] font-bold w-4 text-center text-[#5A6B61]">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#0F1F17] truncate">{firstName(s.id)}</p>
              <p className="text-[12px] text-[#5A6B61]">{s.points} {unit}</p>
            </div>
            {game.stakes > 0 && (
              <span className={cn('text-sm font-bold tabular-nums',
                s.money > 0 && 'text-[#14532D]', s.money < 0 && 'text-[#B42318]', s.money === 0 && 'text-[#5A6B61]')}>
                {signedMoney(s.money)}
              </span>
            )}
          </div>
        ))}
      </div>

      {spec.segments.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {result.segments.map(seg => (
            <span key={seg.label} className="rounded-full bg-[#FAFAF7] border border-[#E7E9E3] px-2.5 py-1 text-[12px] font-semibold text-[#0F1F17]">
              {seg.label}: {seg.leaders.length ? seg.leaders.map(firstName).join(' & ') : 'all square'}{seg.complete ? '' : ' (live)'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
