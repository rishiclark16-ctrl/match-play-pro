import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, Trophy, DollarSign, Target, MapPin, 
  Flag, TrendingUp, Loader2, Crown
} from 'lucide-react';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
import { GeometricBackground } from '@/components/ui/geometric-background';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface GolfStats {
  holesWon: number;
  holesPlayed: number;
  matchesWon: number;
  matchesPlayed: number;
  totalMoneyWon: number;
  bestCourse: { name: string; wins: number } | null;
  hotHole: { course: string; hole: number; wins: number } | null;
  roundsPlayed: number;
}

export default function Stats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<GolfStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      
      try {
        // Get all players for this user
        const { data: playerData } = await supabase
          .from('players')
          .select('id, round_id, name')
          .eq('profile_id', user.id);
        
        if (!playerData || playerData.length === 0) {
          setStats({
            holesWon: 0,
            holesPlayed: 0,
            matchesWon: 0,
            matchesPlayed: 0,
            totalMoneyWon: 0,
            bestCourse: null,
            hotHole: null,
            roundsPlayed: 0,
          });
          setLoading(false);
          return;
        }

        const playerIds = playerData.map(p => p.id);
        const roundIds = [...new Set(playerData.map(p => p.round_id).filter(Boolean))] as string[];

        // Get rounds info
        const { data: roundsData } = await supabase
          .from('rounds')
          .select('id, course_name, status, games, stakes')
          .in('id', roundIds);

        // Get all scores for rounds the user participated in
        const { data: allScoresData } = await supabase
          .from('scores')
          .select('id, round_id, player_id, hole_number, strokes')
          .in('round_id', roundIds);

        // Calculate holes won
        let holesWon = 0;
        let holesPlayed = 0;
        const courseWins: Record<string, number> = {};
        const holeWins: Record<string, Record<number, number>> = {};

        if (allScoresData && roundsData) {
          // Group scores by round and hole
          const scoresByRoundHole: Record<string, Record<number, Array<{ playerId: string; strokes: number }>>> = {};
          
          allScoresData.forEach(score => {
            if (!score.round_id || !score.player_id) return;
            
            if (!scoresByRoundHole[score.round_id]) {
              scoresByRoundHole[score.round_id] = {};
            }
            if (!scoresByRoundHole[score.round_id][score.hole_number]) {
              scoresByRoundHole[score.round_id][score.hole_number] = [];
            }
            scoresByRoundHole[score.round_id][score.hole_number].push({
              playerId: score.player_id,
              strokes: score.strokes,
            });
          });

          // Determine hole winners
          Object.entries(scoresByRoundHole).forEach(([roundId, holes]) => {
            const round = roundsData.find(r => r.id === roundId);
            const courseName = round?.course_name || 'Unknown';
            
            Object.entries(holes).forEach(([holeNum, scores]) => {
              if (scores.length < 2) return; // Need at least 2 players to win
              
              const userScore = scores.find(s => playerIds.includes(s.playerId));
              if (!userScore) return;
              
              holesPlayed++;
              
              const minStrokes = Math.min(...scores.map(s => s.strokes));
              const winners = scores.filter(s => s.strokes === minStrokes);
              
              // User wins if they have lowest score (outright or tied)
              if (userScore.strokes === minStrokes && winners.length === 1) {
                holesWon++;
                
                // Track course wins
                courseWins[courseName] = (courseWins[courseName] || 0) + 1;
                
                // Track hole wins per course
                if (!holeWins[courseName]) holeWins[courseName] = {};
                const hole = parseInt(holeNum);
                holeWins[courseName][hole] = (holeWins[courseName][hole] || 0) + 1;
              }
            });
          });
        }

        // Find best course
        let bestCourse: { name: string; wins: number } | null = null;
        Object.entries(courseWins).forEach(([name, wins]) => {
          if (!bestCourse || wins > bestCourse.wins) {
            bestCourse = { name, wins };
          }
        });

        // Find hot hole (most won hole at any course)
        let hotHole: { course: string; hole: number; wins: number } | null = null;
        Object.entries(holeWins).forEach(([course, holes]) => {
          Object.entries(holes).forEach(([hole, wins]) => {
            if (!hotHole || wins > hotHole.wins) {
              hotHole = { course, hole: parseInt(hole), wins };
            }
          });
        });

        // Calculate matches won (completed rounds where user had best total)
        let matchesWon = 0;
        let matchesPlayed = 0;
        let totalMoneyWon = 0;

        if (roundsData && allScoresData) {
          const completedRounds = roundsData.filter(r => r.status === 'complete');
          
          completedRounds.forEach(round => {
            const roundScores = allScoresData.filter(s => s.round_id === round.id);
            const playerTotals: Record<string, number> = {};
            
            roundScores.forEach(score => {
              if (!score.player_id) return;
              playerTotals[score.player_id] = (playerTotals[score.player_id] || 0) + score.strokes;
            });
            
            const userPlayerId = playerData.find(p => p.round_id === round.id)?.id;
            if (!userPlayerId || !playerTotals[userPlayerId]) return;
            
            matchesPlayed++;
            
            const userTotal = playerTotals[userPlayerId];
            const allTotals = Object.values(playerTotals);
            const minTotal = Math.min(...allTotals);
            
            if (userTotal === minTotal && allTotals.filter(t => t === minTotal).length === 1) {
              matchesWon++;
              // Estimate money won based on stakes and other players
              if (round.stakes) {
                const otherPlayers = Object.keys(playerTotals).length - 1;
                totalMoneyWon += (round.stakes as number) * otherPlayers;
              }
            }
          });
        }

        setStats({
          holesWon,
          holesPlayed,
          matchesWon,
          matchesPlayed,
          totalMoneyWon,
          bestCourse,
          hotHole,
          roundsPlayed: roundIds.length,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <GeometricBackground />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Crunching numbers...</p>
        </div>
      </div>
    );
  }

  const winRate = stats && stats.holesPlayed > 0 
    ? Math.round((stats.holesWon / stats.holesPlayed) * 100) 
    : 0;

  const headerContent = (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-6 pb-2"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
        <BarChart3 className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Stats</h1>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {stats?.roundsPlayed || 0} Rounds Tracked
        </p>
      </div>
    </motion.div>
  );

  return (
    <AppLayout
      header={headerContent}
      background={<GeometricBackground />}
      mainClassName="px-6 space-y-4"
    >
        {/* Hero Stats */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <TechCard variant="elevated" className="h-full">
              <TechCardContent className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-3">
                  <Trophy className="w-6 h-6 text-success" />
                </div>
                <span className="text-3xl font-black tabular-nums text-foreground">
                  {stats?.holesWon || 0}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-1">
                  Holes Won
                </span>
                {stats && stats.holesPlayed > 0 && (
                  <span className="text-xs font-mono text-success mt-2">
                    {winRate}% win rate
                  </span>
                )}
              </TechCardContent>
            </TechCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <TechCard variant="elevated" className="h-full">
              <TechCardContent className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <span className="text-3xl font-black tabular-nums text-foreground">
                  ${stats?.totalMoneyWon || 0}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-1">
                  Money Won
                </span>
              </TechCardContent>
            </TechCard>
          </motion.div>
        </div>

        {/* Matches */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <TechCard>
            <TechCardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Matches Won</p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.matchesPlayed || 0} rounds completed
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black tabular-nums text-foreground">
                  {stats?.matchesWon || 0}
                </span>
                {stats && stats.matchesPlayed > 0 && (
                  <p className="text-xs font-mono text-muted-foreground">
                    {Math.round((stats.matchesWon / stats.matchesPlayed) * 100)}%
                  </p>
                )}
              </div>
            </TechCardContent>
          </TechCard>
        </motion.div>

        {/* Best Course */}
        {stats?.bestCourse && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <TechCard accentBar="left">
              <TechCardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Best Course
                    </p>
                    <p className="font-bold text-foreground truncate max-w-[180px]">
                      {stats.bestCourse.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black tabular-nums text-success">
                    {stats.bestCourse.wins}
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Wins
                  </p>
                </div>
              </TechCardContent>
            </TechCard>
          </motion.div>
        )}

        {/* Hot Hole */}
        {stats?.hotHole && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <TechCard accentBar="left">
              <TechCardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <Flag className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Your Money Hole
                    </p>
                    <p className="font-bold text-foreground">
                      Hole {stats.hotHole.hole}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                      {stats.hotHole.course}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black tabular-nums text-destructive">
                    {stats.hotHole.wins}
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Wins
                  </p>
                </div>
              </TechCardContent>
            </TechCard>
          </motion.div>
        )}

        {/* Empty State */}
        {(!stats || (stats.holesPlayed === 0 && stats.roundsPlayed === 0)) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <TechCard variant="elevated" className="mt-4">
              <TechCardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4 border border-border">
                  <TrendingUp className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-foreground mb-2">No Stats Yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Play some rounds with friends to start tracking your wins, money earned, and favorite holes.
                </p>
              </TechCardContent>
            </TechCard>
        </motion.div>
      )}
    </AppLayout>
  );
}
