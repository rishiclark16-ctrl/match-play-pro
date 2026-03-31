import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlayerWithScores } from '@/types/golf';

interface PlayoffModeProps {
  playoffHole: number;
  currentHolePar: number;
  players: PlayerWithScores[];
  allPlayoffScored: boolean;
  playoffWinnerId?: string;
  getPlayoffScore: (playerId: string, holeNum: number) => number | undefined;
  onPlayoffScore: (playerId: string, score: number) => void;
  onNextPlayoffHole: () => void;
  onClearPlayoffScore: (playerId: string) => void;
}

export function PlayoffMode({
  playoffHole,
  currentHolePar,
  players,
  allPlayoffScored,
  playoffWinnerId,
  getPlayoffScore,
  onPlayoffScore,
  onNextPlayoffHole,
  onClearPlayoffScore,
}: PlayoffModeProps) {
  return (
    <>
      {/* Playoff Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#F0FFF4] border border-[#BBF7D0] rounded-2xl mx-0 mb-4 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#22C55E] flex items-center justify-center flex-shrink-0">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-base tracking-[-0.02em]">Playoff Hole #{playoffHole}</h2>
              <p className="text-[12px] text-muted-foreground">
                Lowest score wins • Par {currentHolePar}
              </p>
            </div>
          </div>
          {allPlayoffScored && !playoffWinnerId && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onNextPlayoffHole}
              className="bg-foreground text-background rounded-xl px-4 py-2 text-sm font-bold"
            >
              Still Tied
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Playoff Scoring */}
      <div className="space-y-3 pt-2">
        {players.map((player, index) => {
          const playoffScore = getPlayoffScore(player.id, playoffHole);
          const hasScored = playoffScore !== undefined;
          const isWinner = playoffWinnerId === player.id;

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'bg-white rounded-2xl p-4 mb-3',
                isWinner
                  ? 'shadow-[0_0_0_2px_rgba(240,238,58,0.5),0_2px_8px_rgba(240,238,58,0.1)]'
                  : 'shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center text-background font-black text-sm">
                    {player.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{player.name}</p>
                    {player.handicap !== null && player.handicap !== undefined && (
                      <span className="bg-muted text-[10px] font-bold px-1.5 py-0.5 rounded-md text-muted-foreground">
                        HCP {player.handicap}
                      </span>
                    )}
                  </div>
                </div>

                {hasScored ? (
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-black text-3xl tabular-nums',
                        playoffScore < currentHolePar && 'text-red-600',
                        playoffScore === currentHolePar && 'text-foreground',
                        playoffScore > currentHolePar && 'text-blue-600'
                      )}
                    >
                      {playoffScore}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onClearPlayoffScore(player.id)}
                      className="bg-muted rounded-xl px-3 py-1.5 text-xs font-bold text-muted-foreground"
                    >
                      Edit
                    </motion.button>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[
                      currentHolePar - 1,
                      currentHolePar,
                      currentHolePar + 1,
                      currentHolePar + 2,
                    ].map(score => (
                      <motion.button
                        key={score}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onPlayoffScore(player.id, score)}
                        className={cn(
                          'rounded-xl py-3 flex flex-col items-center gap-0.5',
                          score < currentHolePar && 'bg-red-100 text-red-700',
                          score === currentHolePar && 'bg-muted text-foreground',
                          score > currentHolePar && 'bg-blue-100 text-blue-700'
                        )}
                      >
                        <span className="text-base font-black">{score}</span>
                        <span className="text-[9px] font-bold uppercase">
                          {score < currentHolePar ? 'Under' : score === currentHolePar ? 'Par' : 'Over'}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Playoff History */}
        {playoffHole > 1 && (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">Playoff History</p>
            <div className="space-y-1">
              {Array.from({ length: playoffHole }).map((_, holeIdx) => {
                const holeNum = holeIdx + 1;
                const scores = players
                  .map(p => ({
                    name: (p.name || 'Player').split(' ')[0],
                    score: getPlayoffScore(p.id, holeNum),
                  }))
                  .filter(s => s.score !== undefined);

                if (scores.length === 0) return null;

                return (
                  <div key={holeNum} className="text-sm text-muted-foreground py-1 border-b border-border/40 last:border-0">
                    <span>Hole {holeNum}:</span>
                    {scores.map((s, i) => (
                      <span key={i} className="font-mono ml-1">
                        {s.name} {s.score}
                        {i < scores.length - 1 && ','}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
