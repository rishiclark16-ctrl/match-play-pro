import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Minus, Crown } from 'lucide-react';
import { PlayerWithScores } from '@/types/golf';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LiveLeaderboardProps {
  players: PlayerWithScores[];
  useNetScoring?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeToPar(score: number): string {
  if (score === 0) return 'E';
  if (score > 0) return `+${score}`;
  return score.toString();
}

export function LiveLeaderboard({ players, useNetScoring = false }: LiveLeaderboardProps) {
  // Sort players by score (relative to par)
  const sortedPlayers = useMemo(() => {
    const playersWithHoles = players.filter(p => p.holesPlayed > 0);
    
    if (playersWithHoles.length === 0) return [];
    
    return [...playersWithHoles].sort((a, b) => {
      const aScore = useNetScoring && a.netRelativeToPar !== undefined 
        ? a.netRelativeToPar 
        : a.totalRelativeToPar;
      const bScore = useNetScoring && b.netRelativeToPar !== undefined 
        ? b.netRelativeToPar 
        : b.totalRelativeToPar;
      return aScore - bScore;
    });
  }, [players, useNetScoring]);

  if (sortedPlayers.length === 0) {
    return null;
  }

  const leader = sortedPlayers[0];
  const leaderScore = useNetScoring && leader.netRelativeToPar !== undefined 
    ? leader.netRelativeToPar 
    : leader.totalRelativeToPar;

  // Check for ties
  const isTied = sortedPlayers.length > 1 && (
    (useNetScoring && sortedPlayers[1].netRelativeToPar !== undefined 
      ? sortedPlayers[1].netRelativeToPar 
      : sortedPlayers[1].totalRelativeToPar) === leaderScore
  );

  // Get all tied leaders
  const tiedLeaders = sortedPlayers.filter(p => {
    const score = useNetScoring && p.netRelativeToPar !== undefined 
      ? p.netRelativeToPar 
      : p.totalRelativeToPar;
    return score === leaderScore;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border"
    >
      <div className="px-4 py-3">
        {/* Leader Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {isTied ? (
                <div className="flex -space-x-2">
                  {tiedLeaders.slice(0, 3).map((p, i) => (
                    <Avatar 
                      key={p.id} 
                      className={cn(
                        "w-10 h-10 border-2 border-background ring-2 ring-primary/30",
                        i > 0 && "relative"
                      )}
                      style={{ zIndex: 3 - i }}
                    >
                      <AvatarImage src={(p as any).avatarUrl} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">
                        {getInitials(p.name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              ) : (
                <Avatar className="w-12 h-12 border-2 border-primary ring-2 ring-primary/30">
                  <AvatarImage src={(leader as any).avatarUrl} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                    {getInitials(leader.name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                <Crown className="w-3 h-3 text-amber-900" />
              </div>
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isTied ? (
                  <p className="font-bold text-foreground truncate">
                    {tiedLeaders.map(p => p.name.split(' ')[0]).join(' & ')}
                  </p>
                ) : (
                  <p className="font-bold text-foreground truncate">{leader.name}</p>
                )}
                {isTied && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    TIED
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {isTied ? 'Leading' : 'Leader'} • Thru {leader.holesPlayed}
                {useNetScoring && ' (Net)'}
              </p>
            </div>
          </div>
          
          {/* Score Display */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "text-3xl font-black tabular-nums",
              leaderScore < 0 && "text-red-600",
              leaderScore === 0 && "text-foreground",
              leaderScore > 0 && "text-blue-600"
            )}>
              {formatRelativeToPar(leaderScore)}
            </div>
          </div>
        </div>

        {/* Mini Standings - show other players if more than 2 */}
        {sortedPlayers.length > 2 && (
          <div className="mt-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
              {sortedPlayers.slice(isTied ? tiedLeaders.length : 1).map((player, index) => {
                const score = useNetScoring && player.netRelativeToPar !== undefined 
                  ? player.netRelativeToPar 
                  : player.totalRelativeToPar;
                const diff = score - leaderScore;
                const position = (isTied ? tiedLeaders.length : 1) + index + 1;
                
                return (
                  <div 
                    key={player.id}
                    className="flex items-center gap-2 shrink-0"
                  >
                    <span className="text-xs font-mono text-muted-foreground w-4">
                      {position}.
                    </span>
                    <Avatar className="w-6 h-6 border border-border">
                      <AvatarImage src={(player as any).avatarUrl} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-bold">
                        {getInitials(player.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate max-w-[60px]">
                      {player.name.split(' ')[0]}
                    </span>
                    <span className={cn(
                      "text-sm font-bold tabular-nums",
                      diff === 0 && "text-amber-600",
                      diff > 0 && "text-muted-foreground"
                    )}>
                      {diff === 0 ? 'E' : `+${diff}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2 player head-to-head */}
        {sortedPlayers.length === 2 && (
          <div className="mt-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6 border border-border">
                  <AvatarImage src={(sortedPlayers[1] as any).avatarUrl} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-bold">
                    {getInitials(sortedPlayers[1].name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {sortedPlayers[1].name.split(' ')[0]}
                </span>
              </div>
              
              {(() => {
                const score2 = useNetScoring && sortedPlayers[1].netRelativeToPar !== undefined 
                  ? sortedPlayers[1].netRelativeToPar 
                  : sortedPlayers[1].totalRelativeToPar;
                const diff = score2 - leaderScore;
                
                return (
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-lg font-bold tabular-nums",
                      score2 < 0 && "text-red-600",
                      score2 === 0 && "text-foreground",
                      score2 > 0 && "text-blue-600"
                    )}>
                      {formatRelativeToPar(score2)}
                    </span>
                    {!isTied && (
                      <span className="text-xs text-muted-foreground">
                        ({diff > 0 ? '+' : ''}{diff} back)
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
