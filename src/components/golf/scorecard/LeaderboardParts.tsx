import { motion } from 'framer-motion';
import { HoleInfo, PlayerWithScores } from '@/types/golf';
import { cn } from '@/lib/utils';

interface ScoreMix {
  birdies: number;
  pars: number;
  bogeys: number;
  doubles: number;
}

function countMix(scores: { holeNumber: number; strokes: number }[], holeInfo: HoleInfo[]): ScoreMix {
  const mix: ScoreMix = { birdies: 0, pars: 0, bogeys: 0, doubles: 0 };
  for (const s of scores) {
    const hole = holeInfo.find(h => h.number === s.holeNumber);
    if (!hole) continue;
    const diff = s.strokes - hole.par;
    if (diff < 0) mix.birdies++;
    else if (diff === 0) mix.pars++;
    else if (diff === 1) mix.bogeys++;
    else mix.doubles++;
  }
  return mix;
}

const toPar = (n: number) => (n === 0 ? 'E' : n > 0 ? `+${n}` : `−${Math.abs(n)}`);

interface LeaderHeroCardProps {
  leaders: PlayerWithScores[];
  relativeToPar: number;
  displayScore: number;
  holeInfo: HoleInfo[];
  isNet: boolean;
}

/** Forest hero: who's leading, by how much, and their round so far. */
export function LeaderHeroCard({ leaders, relativeToPar, displayScore, holeInfo, isNet }: LeaderHeroCardProps) {
  const leader = leaders[0];
  const names = leaders.map(p => (p.name || 'Player').split(' ')[0]);
  const title = leaders.length > 1 ? `${names.join(' & ')} tied` : `${names[0]} leads`;
  const mix = countMix(leader.scores, holeInfo);
  const tiles: { label: string; value: number; hot?: boolean }[] = [
    { label: 'Birdies', value: mix.birdies, hot: true },
    { label: 'Pars', value: mix.pars },
    { label: 'Bogeys', value: mix.bogeys },
    { label: 'Doubles+', value: mix.doubles },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="rounded-[28px] bg-[#14532D] text-white px-5 pt-5 pb-4"
      aria-label="Leader"
    >
      <p className="text-sm font-semibold text-[#CFE3D6] truncate">{title}</p>
      <div className="flex items-end justify-between gap-3 mt-1">
        <p className="text-[52px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{toPar(relativeToPar)}</p>
        <p className="text-sm font-medium text-[#CFE3D6] text-right tabular-nums pb-1">
          {displayScore} {isNet ? 'net' : 'strokes'}
          <br />
          thru {leader.holesPlayed}
        </p>
      </div>
      {leaders.length === 1 && (
        <div className="grid grid-cols-4 gap-2 mt-4">
          {tiles.map(t => (
            <div
              key={t.label}
              className={cn(
                'rounded-[14px] px-2 py-2.5 text-center',
                t.hot ? 'bg-[#BEF264] text-[#14532D]' : 'bg-white/10 text-white',
              )}
            >
              <p className="text-[20px] font-extrabold leading-none tabular-nums">{t.value}</p>
              <p className={cn('text-[11px] font-semibold mt-1', t.hot ? 'text-[#14532D]/80' : 'text-[#CFE3D6]')}>{t.label}</p>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}

interface StandingRowProps {
  player: PlayerWithScores;
  position: string;
  isLeader: boolean;
  relativeToPar: number;
  displayScore: number;
  isNet: boolean;
  index: number;
}

/** White ranked row: position, name + thru, to-par numeral. */
export function StandingRow({ player, position, isLeader, relativeToPar, displayScore, isNet, index }: StandingRowProps) {
  const started = player.holesPlayed > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
      className="bg-white rounded-[20px] border border-[#E7E9E3] px-4 py-3 flex items-center gap-3 min-h-[64px]"
    >
      <span
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold tabular-nums shrink-0',
          isLeader ? 'bg-[#14532D] text-white' : 'bg-[#F0F2EC] text-[#5A6B61]',
        )}
      >
        {position}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-[#0F1F17] truncate leading-tight">{player.name}</p>
        <p className="text-[12px] font-medium text-[#5A6B61] mt-0.5 tabular-nums">
          {started ? `Thru ${player.holesPlayed} · ${displayScore} ${isNet ? 'net' : 'strokes'}` : 'Not started'}
        </p>
      </div>
      <span
        className={cn(
          'text-[24px] font-extrabold tabular-nums tracking-[-0.02em]',
          !started && 'text-[#B4BDB7]',
          started && (relativeToPar < 0 ? 'text-[#14532D]' : 'text-[#0F1F17]'),
        )}
      >
        {started ? toPar(relativeToPar) : '–'}
      </span>
    </motion.div>
  );
}

interface RoundMixCardProps {
  birdies: number;
  pars: number;
  bogeys: number;
  doubles: number;
}

/** Whole-group score mix, keyed with the scorecard's own score marks. */
export function RoundMixCard({ birdies, pars, bogeys, doubles }: RoundMixCardProps) {
  const items = [
    { label: 'Birdies', value: birdies, glyph: 'w-4 h-4 rounded-full border-2 border-[#14532D] bg-[#ECFCCB]' },
    { label: 'Pars', value: pars, glyph: 'w-4 h-[3px] rounded-full bg-[#0F1F17] my-[6.5px]' },
    { label: 'Bogeys', value: bogeys, glyph: 'w-4 h-4 rounded-[4px] border-2 border-[#0F1F17]' },
    { label: 'Doubles+', value: doubles, glyph: 'w-4 h-4 rounded-[4px] border-2 border-[#0F1F17] shadow-[0_0_0_2px_#FFFFFF,0_0_0_4px_#0F1F17]' },
  ];
  return (
    <section className="bg-white rounded-[20px] border border-[#E7E9E3] p-4" aria-label="Round statistics">
      <p className="text-[12px] font-semibold text-[#5A6B61] mb-3">Round so far</p>
      <div className="grid grid-cols-4 divide-x divide-[#E7E9E3]">
        {items.map(item => (
          <div key={item.label} className="flex flex-col items-center gap-1.5">
            <span className={cn('block', item.glyph)} aria-hidden="true" />
            <span className="text-[20px] font-extrabold leading-none tabular-nums text-[#0F1F17]">{item.value}</span>
            <span className="text-[12px] font-medium text-[#5A6B61]">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
