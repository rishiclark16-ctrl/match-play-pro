import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
        className="flex-shrink-0 bg-primary/10 border-b-2 border-primary px-4 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Swords className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="heading-md text-primary">Playoff Hole #{playoffHole}</h2>
              <p className="text-xs text-muted-foreground">
                Lowest score wins • Par {currentHolePar}
              </p>
            </div>
          </div>
          {allPlayoffScored && !playoffWinnerId && (
            <Button
              onClick={onNextPlayoffHole}
              size="sm"
              variant="outline"
              className="border-2 border-primary text-primary"
            >
              Still Tied → Next Hole
            </Button>
          )}
        </div>
      </motion.div>

      {/* Playoff Scoring */}
      <div className="space-y-3 pt-2">
        {players.map((player, index) => {
          const playoffScore = getPlayoffScore(player.id, playoffHole);
          const hasScored = playoffScore !== undefined;

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'bg-card border-2 rounded-xl p-4 transition-all',
                hasScored ? 'border-primary/30' : 'border-border',
                playoffWinnerId === player.id && 'border-primary bg-primary/5'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold',
                      hasScored
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {player.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold">{player.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {player.handicap !== null &&
                        player.handicap !== undefined &&
                        `HCP ${player.handicap}`}
                    </p>
                  </div>
                </div>

                {hasScored ? (
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-3xl font-black tabular-nums',
                        playoffScore < currentHolePar && 'text-red-600',
                        playoffScore === currentHolePar && 'text-foreground',
                        playoffScore > currentHolePar && 'text-blue-600'
                      )}
                    >
                      {playoffScore}
                    </span>
                    <button
                      onClick={() => onClearPlayoffScore(player.id)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
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
                          'w-11 h-11 rounded-lg font-bold text-lg border-2 transition-colors',
                          score < currentHolePar &&
                            'bg-red-100 border-red-300 text-red-700',
                          score === currentHolePar &&
                            'bg-muted border-border text-foreground',
                          score > currentHolePar &&
                            'bg-blue-100 border-blue-300 text-blue-700'
                        )}
                      >
                        {score}
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
          <div className="bg-muted/50 rounded-xl p-4 mt-4">
            <h4 className="label-sm mb-2">Playoff History</h4>
            <div className="space-y-1">
              {Array.from({ length: playoffHole }).map((_, holeIdx) => {
                const holeNum = holeIdx + 1;
                const scores = players
                  .map(p => ({
                    name: p.name.split(' ')[0],
                    score: getPlayoffScore(p.id, holeNum),
                  }))
                  .filter(s => s.score !== undefined);

                if (scores.length === 0) return null;

                return (
                  <div key={holeNum} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Hole {holeNum}:</span>
                    {scores.map((s, i) => (
                      <span key={i} className="font-mono">
                        {s.name} {s.score}
                        {i < scores.length - 1 && ', '}
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
