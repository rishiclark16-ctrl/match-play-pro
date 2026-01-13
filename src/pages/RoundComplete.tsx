import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Share2, Plus, Home, Medal, Award, Loader2, Image } from 'lucide-react';
import { useRounds } from '@/hooks/useRounds';
import { useRoundSharing } from '@/hooks/useRoundSharing';
import { formatRelativeToPar, getScoreColor, PlayerWithScores, Score, Player } from '@/types/golf';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { shareResults, shareText } from '@/lib/shareResults';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { supabase } from '@/integrations/supabase/client';

export default function RoundComplete() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRoundById, getPlayersWithScores, completeRound, getScoresForRound } = useRounds();
  const { shareRoundWithFriends } = useRoundSharing();
  const [isSharing, setIsSharing] = useState(false);
  const [shareMode, setShareMode] = useState<'image' | 'text' | null>(null);
  const [sharedWithFriends, setSharedWithFriends] = useState(false);

  const round = getRoundById(id || '');

  // Ensure round is marked complete and share with friends
  useEffect(() => {
    if (round && round.status !== 'complete') {
      completeRound(round.id);
    }
  }, [round, completeRound]);

  // Auto-share with friends who were in the round
  useEffect(() => {
    const autoShare = async () => {
      if (!round || sharedWithFriends) return;
      
      // Get players with profile_ids from the database
      const { data: dbPlayers } = await supabase
        .from('players')
        .select('profile_id')
        .eq('round_id', round.id)
        .not('profile_id', 'is', null);
      
      if (dbPlayers && dbPlayers.length > 0) {
        const profileIds = dbPlayers
          .map(p => p.profile_id)
          .filter((id): id is string => id !== null);
        
        const sharedCount = await shareRoundWithFriends(round.id, profileIds);
        if (sharedCount > 0) {
          toast.success(`Shared with ${sharedCount} friend${sharedCount > 1 ? 's' : ''}`);
        }
      }
      setSharedWithFriends(true);
    };
    
    autoShare();
  }, [round, sharedWithFriends, shareRoundWithFriends]);

  const playersWithScores = useMemo(() => {
    if (!round) return [];
    return getPlayersWithScores(round.id, round.holeInfo);
  }, [round, getPlayersWithScores]);

  // Sort by total strokes (lowest first)
  const sortedPlayers = useMemo(() => {
    return [...playersWithScores].sort((a, b) => a.totalStrokes - b.totalStrokes);
  }, [playersWithScores]);

  const winner = sortedPlayers[0];
  const hasTie = sortedPlayers.length > 1 && sortedPlayers[0]?.totalStrokes === sortedPlayers[1]?.totalStrokes;

  // Match play calculation (if enabled and 2 players)
  const matchPlayResult = useMemo(() => {
    if (!round?.matchPlay || playersWithScores.length !== 2) return null;
    
    const [p1, p2] = playersWithScores;
    let p1Wins = 0;
    let p2Wins = 0;

    for (let hole = 1; hole <= round.holes; hole++) {
      const p1Score = p1.scores.find(s => s.holeNumber === hole)?.strokes;
      const p2Score = p2.scores.find(s => s.holeNumber === hole)?.strokes;
      
      if (p1Score !== undefined && p2Score !== undefined) {
        if (p1Score < p2Score) p1Wins++;
        else if (p2Score < p1Score) p2Wins++;
      }
    }

    const diff = p1Wins - p2Wins;
    if (diff === 0) {
      return { status: 'Match Halved', winner: null };
    }
    
    const matchWinner = diff > 0 ? p1 : p2;
    const upBy = Math.abs(diff);
    const holesRemaining = round.holes - (p1Wins + p2Wins + (round.holes - Math.max(p1.holesPlayed, p2.holesPlayed)));
    
    // Format like "3 & 2" if match ended early, or just "2 UP"
    if (holesRemaining > 0 && upBy > holesRemaining) {
      return { 
        status: `${matchWinner.name} wins ${upBy} & ${holesRemaining}`, 
        winner: matchWinner 
      };
    }
    
    return { 
      status: `${matchWinner.name} wins ${upBy} UP`, 
      winner: matchWinner 
    };
  }, [round, playersWithScores]);

  if (!round) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6">
          <h2 className="text-xl font-semibold mb-2">Round not found</h2>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const totalPar = round.holeInfo.reduce((sum, h) => sum + h.par, 0);
  const dateStr = format(new Date(round.createdAt), 'MMMM d, yyyy');

  // Get raw scores and players for share image
  const scores = getScoresForRound(round.id);
  const players: Player[] = playersWithScores.map(p => ({
    id: p.id,
    roundId: round.id,
    name: p.name,
    handicap: p.handicap,
    orderIndex: 0,
  }));

  const handleShareImage = async () => {
    hapticLight();
    setIsSharing(true);
    setShareMode('image');
    
    try {
      await shareResults(round, players, scores);
      hapticSuccess();
      toast.success('Results shared!');
    } catch (error) {
      console.error('Share failed:', error);
      hapticError();
      toast.error('Failed to share. Trying text instead...');
      // Fall back to text share
      try {
        await shareText(round, playersWithScores);
        hapticSuccess();
        toast.success('Results copied to clipboard!');
      } catch {
        toast.error('Share failed. Please try again.');
      }
    } finally {
      setIsSharing(false);
      setShareMode(null);
    }
  };

  const handleShareText = async () => {
    hapticLight();
    setIsSharing(true);
    setShareMode('text');
    
    try {
      await shareText(round, playersWithScores);
      hapticSuccess();
      toast.success(navigator.share ? 'Results shared!' : 'Results copied to clipboard!');
    } catch (error) {
      hapticError();
      toast.error('Failed to share');
    } finally {
      setIsSharing(false);
      setShareMode(null);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="w-5 h-5" />;
    if (rank === 1) return <Medal className="w-5 h-5" />;
    if (rank === 2) return <Award className="w-5 h-5" />;
    return null;
  };

  const getPlayerRow = (player: PlayerWithScores, rank: number) => {
    const isWinner = rank === 0;
    const isTied = hasTie && player.totalStrokes === winner?.totalStrokes;
    
    return (
      <motion.div
        key={player.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 + rank * 0.1 }}
        className={cn(
          "flex items-center gap-4 p-4 rounded-2xl transition-all",
          isWinner ? "bg-primary-light border-2 border-primary/20" : "bg-card border border-border"
        )}
      >
        {/* Rank Circle */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0",
          isWinner 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-muted-foreground"
        )}>
          {getRankIcon(rank) || (rank + 1)}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-lg truncate">{player.name}</h4>
          {player.handicap && (
            <p className="text-xs text-muted-foreground">HCP: {player.handicap}</p>
          )}
        </div>

        {/* Score */}
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold tabular-nums">{player.totalStrokes}</p>
          <p className={cn(
            "text-sm font-semibold",
            getScoreColor(player.totalStrokes, totalPar)
          )}>
            {formatRelativeToPar(player.totalRelativeToPar)}
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header Section */}
      <header className="pt-safe pt-16 pb-8 px-4 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/30"
        >
          <Trophy className="w-10 h-10 text-primary-foreground" />
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold tracking-tight"
        >
          Round Complete
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-muted-foreground mt-2"
        >
          {round.courseName} • {round.holes} holes
        </motion.p>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground"
        >
          {dateStr}
        </motion.p>
      </header>

      {/* Winner Card */}
      {winner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', delay: 0.35 }}
          className="mx-4 mb-6"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-light via-background to-primary-light/50 border-2 border-primary/20 p-6 shadow-xl">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-3">
                <Trophy className="w-4 h-4" />
                {hasTie ? 'Tied' : 'Winner'}
              </div>
              
              <h2 className="text-2xl font-bold mb-3">
                {hasTie 
                  ? sortedPlayers.filter(p => p.totalStrokes === winner.totalStrokes).map(p => p.name).join(' & ')
                  : winner.name
                }
              </h2>
              
              <div className="flex items-center justify-center gap-4">
                <div>
                  <span className="text-4xl font-bold tabular-nums text-primary">
                    {winner.totalStrokes}
                  </span>
                  <p className="text-sm text-muted-foreground">strokes</p>
                </div>
                <div className="h-12 w-px bg-border" />
                <div>
                  <span className={cn(
                    "text-2xl font-bold",
                    getScoreColor(winner.totalStrokes, totalPar)
                  )}>
                    {formatRelativeToPar(winner.totalRelativeToPar)}
                  </span>
                  <p className="text-sm text-muted-foreground">to par</p>
                </div>
              </div>
              
              {round.stakes && sortedPlayers.length > 1 && !hasTie && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success font-semibold"
                >
                  💰 Wins ${round.stakes * (sortedPlayers.length - 1)}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Match Play Result */}
      {matchPlayResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mx-4 mb-6 p-4 rounded-2xl bg-card border border-border"
        >
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Match Play
          </h3>
          <p className="text-lg font-bold text-foreground">{matchPlayResult.status}</p>
        </motion.div>
      )}

      {/* Final Standings */}
      <main className="flex-1 px-4 pb-40 overflow-auto">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1"
        >
          Final Standings
        </motion.h3>
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => getPlayerRow(player, index))}
        </div>
      </main>

      {/* Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-gradient-to-t from-background via-background to-transparent">
        <div className="space-y-3">
          {/* Share Image Button */}
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              onClick={handleShareImage}
              disabled={isSharing}
              className="w-full py-6 text-base font-semibold rounded-2xl border-2 border-primary/30 text-primary hover:bg-primary-light"
            >
              {isSharing && shareMode === 'image' ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Image className="w-5 h-5 mr-2" />
              )}
              Share as Image
            </Button>
          </motion.div>
          
          {/* Share Text Button */}
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              onClick={handleShareText}
              disabled={isSharing}
              className="w-full py-4 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {isSharing && shareMode === 'text' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4 mr-2" />
              )}
              Share as Text
            </Button>
          </motion.div>
          
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => {
                hapticLight();
                navigate('/new-round');
              }}
              className="w-full py-6 text-base font-semibold rounded-2xl shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Round
            </Button>
          </motion.div>
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              hapticLight();
              navigate('/');
            }}
            className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </motion.button>
        </div>
      </div>
    </div>
  );
}
