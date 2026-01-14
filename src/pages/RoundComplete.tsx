import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Share2, Plus, Home, Medal, Award, Loader2, Image, DollarSign, Target, Flame, ChevronDown, ChevronUp, Users, ArrowRight } from 'lucide-react';
import { useRounds } from '@/hooks/useRounds';
import { useRoundSharing } from '@/hooks/useRoundSharing';
import { formatRelativeToPar, getScoreColor, getScoreType, PlayerWithScores, Score, Player, Round, HoleInfo, GameConfig, Press } from '@/types/golf';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { shareResults, shareText } from '@/lib/shareResults';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { supabase } from '@/integrations/supabase/client';
import { calculateSkins, SkinsResult } from '@/lib/games/skins';
import { calculateNassau, NassauResult } from '@/lib/games/nassau';
import { calculateWolfStandings, WolfStanding } from '@/lib/games/wolf';
import { calculateSettlement, getTotalWinnings } from '@/lib/games/settlement';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';

export default function RoundComplete() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRoundById, getPlayersWithScores, completeRound, getScoresForRound, getPlayersForRound, getPressesForRound } = useRounds();
  const { shareRoundWithFriends } = useRoundSharing();
  const [isSharing, setIsSharing] = useState(false);
  const [shareMode, setShareMode] = useState<'image' | 'text' | null>(null);
  const [sharedWithFriends, setSharedWithFriends] = useState(false);
  const [showSettlements, setShowSettlements] = useState(true);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showGames, setShowGames] = useState(true);
  
  // State for Supabase data
  const [supabaseRound, setSupabaseRound] = useState<Round | null>(null);
  const [supabasePlayers, setSupabasePlayers] = useState<Player[]>([]);
  const [supabaseScores, setSupabaseScores] = useState<Score[]>([]);
  const [supabasePresses, setSupabasePresses] = useState<Press[]>([]);
  const [loading, setLoading] = useState(true);

  // Try local storage first, then Supabase
  const localRound = getRoundById(id || '');

  // Fetch from Supabase if not in local storage
  useEffect(() => {
    const fetchFromSupabase = async () => {
      if (localRound) {
        setLoading(false);
        return;
      }

      if (!id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch round
        const { data: roundData, error: roundError } = await supabase
          .from('rounds')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (roundError) throw roundError;
        if (!roundData) {
          setLoading(false);
          return;
        }

        // Transform round data
        const transformedRound: Round = {
          id: roundData.id,
          courseId: roundData.course_id || '',
          courseName: roundData.course_name,
          holes: roundData.holes as 9 | 18,
          holeInfo: (roundData.hole_info as unknown) as HoleInfo[],
          strokePlay: roundData.stroke_play ?? true,
          matchPlay: roundData.match_play ?? false,
          stakes: roundData.stakes ?? undefined,
          slope: roundData.slope ?? undefined,
          rating: roundData.rating ?? undefined,
          status: roundData.status as 'active' | 'complete',
          createdAt: new Date(roundData.created_at || ''),
          joinCode: roundData.join_code,
          games: (roundData.games as unknown as GameConfig[]) || [],
          presses: [],
        };

        setSupabaseRound(transformedRound);

        // Fetch players
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('round_id', id)
          .order('order_index');

        if (playersError) throw playersError;

        const transformedPlayers: Player[] = (playersData || []).map(p => ({
          id: p.id,
          roundId: p.round_id || '',
          name: p.name,
          handicap: p.handicap ?? undefined,
          orderIndex: p.order_index,
          teamId: p.team_id ?? undefined,
          profileId: p.profile_id ?? undefined,
        }));

        setSupabasePlayers(transformedPlayers);

        // Fetch scores
        const { data: scoresData, error: scoresError } = await supabase
          .from('scores')
          .select('*')
          .eq('round_id', id);

        if (scoresError) throw scoresError;

        const transformedScores: Score[] = (scoresData || []).map(s => ({
          id: s.id,
          roundId: s.round_id || '',
          playerId: s.player_id || '',
          holeNumber: s.hole_number,
          strokes: s.strokes,
        }));

        setSupabaseScores(transformedScores);

        // Fetch presses
        const { data: pressesData, error: pressesError } = await supabase
          .from('presses')
          .select('*')
          .eq('round_id', id);

        if (!pressesError && pressesData) {
          const transformedPresses: Press[] = pressesData.map(p => ({
            id: p.id,
            startHole: p.start_hole,
            initiatedBy: p.initiated_by || undefined,
            stakes: Number(p.stakes),
            status: (p.status === 'complete' ? 'won' : p.status) as 'active' | 'won' | 'lost' | 'pushed',
            winnerId: p.winner_id || undefined,
          }));
          setSupabasePresses(transformedPresses);
        }

      } catch (error) {
        console.error('Error fetching round from Supabase:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFromSupabase();
  }, [id, localRound]);

  // Use local or Supabase data
  const round = localRound || supabaseRound;
  const rawScores = localRound ? getScoresForRound(id || '') : supabaseScores;
  const rawPlayers = localRound ? getPlayersForRound(id || '') : supabasePlayers;
  const presses = localRound ? getPressesForRound(id || '') : supabasePresses;

  // Ensure round is marked complete and share with friends
  useEffect(() => {
    if (round && round.status !== 'complete' && localRound) {
      completeRound(round.id);
    }
  }, [round, completeRound, localRound]);

  // Auto-share with friends who were in the round
  useEffect(() => {
    const autoShare = async () => {
      if (!round || sharedWithFriends) return;
      
      const { data: dbPlayers } = await supabase
        .from('players')
        .select('profile_id')
        .eq('round_id', round.id)
        .not('profile_id', 'is', null);
      
      if (dbPlayers && dbPlayers.length > 0) {
        const profileIds = dbPlayers
          .map(p => p.profile_id)
          .filter((profileId): profileId is string => profileId !== null);
        
        const sharedCount = await shareRoundWithFriends(round.id, profileIds);
        if (sharedCount > 0) {
          toast.success(`Shared with ${sharedCount} friend${sharedCount > 1 ? 's' : ''}`);
        }
      }
      setSharedWithFriends(true);
    };
    
    autoShare();
  }, [round, sharedWithFriends, shareRoundWithFriends]);

  // Calculate players with scores
  const playersWithScores = useMemo(() => {
    if (!round || rawPlayers.length === 0) return [];
    
    return rawPlayers.map(player => {
      const playerScores = rawScores.filter(s => s.playerId === player.id);
      const totalStrokes = playerScores.reduce((sum, s) => sum + s.strokes, 0);
      
      const totalRelativeToPar = playerScores.reduce((sum, s) => {
        const hole = round.holeInfo.find(h => h.number === s.holeNumber);
        return sum + (s.strokes - (hole?.par || 4));
      }, 0);

      return {
        ...player,
        scores: playerScores,
        totalStrokes,
        totalRelativeToPar,
        holesPlayed: playerScores.length,
      };
    });
  }, [round, rawPlayers, rawScores]);

  // Sort by total strokes (lowest first)
  const sortedPlayers = useMemo(() => {
    return [...playersWithScores].sort((a, b) => a.totalStrokes - b.totalStrokes);
  }, [playersWithScores]);

  const winner = sortedPlayers[0];
  const hasTie = sortedPlayers.length > 1 && sortedPlayers[0]?.totalStrokes === sortedPlayers[1]?.totalStrokes;

  // Calculate game results
  const gameResults = useMemo(() => {
    if (!round || playersWithScores.length === 0) return null;

    const skinsGame = round.games?.find(g => g.type === 'skins');
    const nassauGame = round.games?.find(g => g.type === 'nassau');
    const wolfGame = round.games?.find(g => g.type === 'wolf');

    let skinsResult: SkinsResult | undefined;
    let nassauResult: NassauResult | undefined;
    let wolfStandings: WolfStanding[] | undefined;

    const holesPlayed = Math.max(...playersWithScores.map(p => p.holesPlayed));

    if (skinsGame) {
      skinsResult = calculateSkins(
        rawScores,
        rawPlayers,
        holesPlayed,
        skinsGame.stakes || 1,
        skinsGame.carryover !== false
      );
    }

    if (nassauGame) {
      nassauResult = calculateNassau(
        rawScores,
        rawPlayers,
        nassauGame.stakes || 1,
        presses,
        round.holes
      );
    }

    if (wolfGame && rawPlayers.length === 4) {
      const wolfResults = (round as any).wolfResults || [];
      wolfStandings = calculateWolfStandings(wolfResults, rawPlayers, wolfGame.stakes || 1);
    }

    return { skinsResult, nassauResult, wolfStandings };
  }, [round, playersWithScores, rawScores, rawPlayers, presses]);

  // Calculate settlements
  const settlements = useMemo(() => {
    if (!round || playersWithScores.length === 0) return [];

    // Get match play winner
    let matchPlayWinnerId: string | null = null;
    if (round.matchPlay && playersWithScores.length === 2) {
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

      if (p1Wins !== p2Wins) {
        matchPlayWinnerId = p1Wins > p2Wins ? p1.id : p2.id;
      }
    }

    const wolfResults = (round as any).wolfResults || [];

    return calculateSettlement(
      rawPlayers,
      gameResults?.skinsResult,
      gameResults?.nassauResult,
      matchPlayWinnerId,
      round.stakes,
      wolfResults,
      round.games?.find(g => g.type === 'wolf')?.stakes
    );
  }, [round, playersWithScores, rawPlayers, gameResults]);

  // Calculate highlights
  const highlights = useMemo(() => {
    if (!round || rawScores.length === 0) return [];

    const highlights: { icon: string; text: string; type: 'great' | 'bad' | 'neutral' }[] = [];

    // Find birdies, eagles, pars
    rawScores.forEach(score => {
      const hole = round.holeInfo.find(h => h.number === score.holeNumber);
      if (!hole) return;
      
      const player = rawPlayers.find(p => p.id === score.playerId);
      if (!player) return;

      const scoreType = getScoreType(score.strokes, hole.par);
      
      if (scoreType === 'eagle' || scoreType === 'albatross') {
        highlights.push({
          icon: '🦅',
          text: `${player.name} made ${scoreType} on hole ${score.holeNumber}!`,
          type: 'great'
        });
      } else if (scoreType === 'birdie') {
        highlights.push({
          icon: '🐦',
          text: `${player.name} birdied hole ${score.holeNumber}`,
          type: 'great'
        });
      }
    });

    // Find worst holes (triple bogey or worse)
    rawScores.forEach(score => {
      const hole = round.holeInfo.find(h => h.number === score.holeNumber);
      if (!hole) return;
      
      const player = rawPlayers.find(p => p.id === score.playerId);
      if (!player) return;

      if (score.strokes >= hole.par + 3) {
        highlights.push({
          icon: '💀',
          text: `${player.name} scored ${score.strokes} on hole ${score.holeNumber} (par ${hole.par})`,
          type: 'bad'
        });
      }
    });

    // Count birdies per player
    const birdiesPerPlayer: Record<string, number> = {};
    rawScores.forEach(score => {
      const hole = round.holeInfo.find(h => h.number === score.holeNumber);
      if (!hole) return;
      
      if (score.strokes < hole.par) {
        birdiesPerPlayer[score.playerId] = (birdiesPerPlayer[score.playerId] || 0) + 1;
      }
    });

    const mostBirdies = Object.entries(birdiesPerPlayer).sort((a, b) => b[1] - a[1])[0];
    if (mostBirdies && mostBirdies[1] > 1) {
      const player = rawPlayers.find(p => p.id === mostBirdies[0]);
      if (player) {
        highlights.push({
          icon: '🔥',
          text: `${player.name} had the most under-par holes (${mostBirdies[1]})`,
          type: 'great'
        });
      }
    }

    // Skins highlights
    if (gameResults?.skinsResult) {
      const topSkins = gameResults.skinsResult.standings[0];
      if (topSkins && topSkins.skins > 0) {
        highlights.push({
          icon: '🏆',
          text: `${topSkins.playerName} won ${topSkins.skins} skin${topSkins.skins > 1 ? 's' : ''} ($${topSkins.earnings > 0 ? '+' : ''}${topSkins.earnings.toFixed(0)})`,
          type: 'neutral'
        });
      }
    }

    return highlights.slice(0, 8);
  }, [round, rawScores, rawPlayers, gameResults]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground font-medium">Loading round...</p>
        </div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6 space-y-4">
          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto">
            <span className="text-3xl">🏌️</span>
          </div>
          <h2 className="text-xl font-bold">Round not found</h2>
          <p className="text-muted-foreground text-sm">This round may have been deleted or doesn't exist</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const totalPar = round.holeInfo.reduce((sum, h) => sum + h.par, 0);
  const dateStr = format(new Date(round.createdAt), 'MMM d, yyyy');

  // Get raw scores and players for share image
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
      await shareResults(round, players, rawScores);
      hapticSuccess();
      toast.success('Results shared!');
    } catch (error) {
      console.error('Share failed:', error);
      hapticError();
      toast.error('Failed to share. Trying text instead...');
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

  const getRankDisplay = (rank: number) => {
    if (rank === 0) return <Trophy className="w-4 h-4 text-gold" />;
    if (rank === 1) return <Medal className="w-4 h-4 text-muted-foreground" />;
    if (rank === 2) return <Award className="w-4 h-4 text-amber-600" />;
    return <span className="text-xs font-bold text-muted-foreground">{rank + 1}</span>;
  };

  const CollapsibleSection = ({ 
    title, 
    icon: Icon, 
    isOpen, 
    onToggle, 
    children,
    count 
  }: { 
    title: string; 
    icon: any; 
    isOpen: boolean; 
    onToggle: () => void;
    children: React.ReactNode;
    count?: number;
  }) => (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-primary/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
              {count}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-1.5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background relative">
      {/* Technical Grid Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/3 to-transparent" />
      </div>

      {/* Fixed Header Section */}
      <header 
        className="flex-shrink-0 relative z-10 pt-3 pb-4 px-4"
      >
        {/* Corner Accents */}
        <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-primary/30" />
        <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-primary/20" />
        
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
            className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3"
          >
            <Trophy className="w-7 h-7 text-primary-foreground" />
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1"
          >
            Round Complete
          </motion.p>
          
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg font-bold tracking-tight"
          >
            {round.courseName}
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex items-center justify-center gap-2 mt-1 text-xs text-muted-foreground"
          >
            <span>{round.holes} holes</span>
            <span>•</span>
            <span>Par {totalPar}</span>
            <span>•</span>
            <span>{dateStr}</span>
          </motion.div>
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto overscroll-y-contain relative z-10 px-4 pb-52" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Winner Card */}
        {winner && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mx-4 mb-4"
        >
          <TechCard variant="winner" accentBar="top">
            <TechCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-gold" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
                      {hasTie ? 'Tied' : 'Winner'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {hasTie 
                      ? sortedPlayers.filter(p => p.totalStrokes === winner.totalStrokes).map(p => p.name).join(' & ')
                      : winner.name
                    }
                  </h2>
                </div>
                
                <div className="text-right">
                  <div className="text-3xl font-black tabular-nums tracking-tight">
                    {winner.totalStrokes}
                  </div>
                  <div className={cn(
                    "text-sm font-bold",
                    winner.totalRelativeToPar < 0 ? "text-success" : 
                    winner.totalRelativeToPar > 0 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {formatRelativeToPar(winner.totalRelativeToPar)}
                  </div>
                </div>
              </div>
            </TechCardContent>
          </TechCard>
        </motion.div>
      )}

      {/* Match Play Result */}
      {matchPlayResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mx-4 mb-4"
        >
          <TechCard>
            <TechCardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Match Play</span>
                <span className="font-bold text-sm">{matchPlayResult.status}</span>
              </div>
            </TechCardContent>
          </TechCard>
        </motion.div>
      )}

        {/* Settlements Section */}
        {/* Settlements Section */}
        {settlements.length > 0 && (
          <CollapsibleSection
            title="Settlements"
            icon={DollarSign}
            isOpen={showSettlements}
            onToggle={() => setShowSettlements(!showSettlements)}
            count={settlements.length}
          >
            {settlements.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{s.fromPlayerName}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium">{s.toPlayerName}</span>
                </div>
                <span className="font-bold text-primary tabular-nums">${s.amount.toFixed(0)}</span>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* Game Results */}
        {(gameResults?.skinsResult || gameResults?.nassauResult || gameResults?.wolfStandings) && (
          <CollapsibleSection
            title="Games"
            icon={Target}
            isOpen={showGames}
            onToggle={() => setShowGames(!showGames)}
          >
            {/* Skins Results */}
            {gameResults.skinsResult && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🎯</span>
                  <span className="font-bold text-xs uppercase tracking-wider">Skins</span>
                </div>
                <div className="space-y-1">
                  {gameResults.skinsResult.standings.map((s, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{s.playerName}</span>
                      <span className={cn(
                        "font-semibold tabular-nums",
                        s.earnings > 0 ? "text-success" : s.earnings < 0 ? "text-destructive" : ""
                      )}>
                        {s.skins} ({s.earnings > 0 ? '+' : ''}${s.earnings.toFixed(0)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nassau Results */}
            {gameResults.nassauResult && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🏌️</span>
                  <span className="font-bold text-xs uppercase tracking-wider">Nassau</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Front 9</span>
                    <span className="font-semibold">
                      {gameResults.nassauResult.front9.winnerId 
                        ? rawPlayers.find(p => p.id === gameResults.nassauResult!.front9.winnerId)?.name
                        : 'Tied'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Back 9</span>
                    <span className="font-semibold">
                      {gameResults.nassauResult.back9.winnerId 
                        ? rawPlayers.find(p => p.id === gameResults.nassauResult!.back9.winnerId)?.name
                        : 'Tied'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overall</span>
                    <span className="font-semibold">
                      {gameResults.nassauResult.overall.winnerId 
                        ? rawPlayers.find(p => p.id === gameResults.nassauResult!.overall.winnerId)?.name
                        : 'Tied'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Wolf Results */}
            {gameResults.wolfStandings && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🐺</span>
                  <span className="font-bold text-xs uppercase tracking-wider">Wolf</span>
                </div>
                <div className="space-y-1">
                  {gameResults.wolfStandings.map((s, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{s.playerName}</span>
                      <span className={cn(
                        "font-semibold tabular-nums",
                        s.earnings > 0 ? "text-success" : s.earnings < 0 ? "text-destructive" : ""
                      )}>
                        {s.totalPoints}pts ({s.earnings > 0 ? '+' : ''}${s.earnings.toFixed(0)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* Highlights Section */}
        {highlights.length > 0 && (
          <CollapsibleSection
            title="Highlights"
            icon={Flame}
            isOpen={showHighlights}
            onToggle={() => setShowHighlights(!showHighlights)}
            count={highlights.length}
          >
            {highlights.map((h, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2.5 p-2.5 rounded-lg border",
                  h.type === 'great' ? "bg-success/5 border-success/20" :
                  h.type === 'bad' ? "bg-destructive/5 border-destructive/20" :
                  "bg-muted/50 border-border/50"
                )}
              >
                <span className="text-lg">{h.icon}</span>
                <span className="text-sm">{h.text}</span>
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* Final Standings */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Final Standings
            </span>
          </div>
          
          <div className="space-y-2">
            {sortedPlayers.map((player, rank) => {
              const isWinner = rank === 0;
              const isLast = rank === sortedPlayers.length - 1 && sortedPlayers.length > 2;
              const netWinnings = getTotalWinnings(player.id, settlements);
              
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + rank * 0.05 }}
                >
                  <TechCard 
                    variant={isWinner ? 'highlighted' : 'default'}
                    className={cn(
                      isLast && "border-destructive/30"
                    )}
                  >
                    <TechCardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          isWinner ? "bg-primary text-primary-foreground" :
                          isLast ? "bg-destructive/10" :
                          "bg-muted"
                        )}>
                          {getRankDisplay(rank)}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate">
                            {player.name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {player.handicap && (
                              <span>HCP {player.handicap}</span>
                            )}
                            {netWinnings !== 0 && (
                              <span className={cn(
                                "font-bold",
                                netWinnings > 0 ? "text-success" : "text-destructive"
                              )}>
                                {netWinnings > 0 ? '+' : ''}${netWinnings.toFixed(0)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right shrink-0">
                          <p className="text-xl font-black tabular-nums">{player.totalStrokes}</p>
                          <p className={cn(
                            "text-xs font-bold",
                            player.totalRelativeToPar < 0 ? "text-success" : 
                            player.totalRelativeToPar > 0 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {formatRelativeToPar(player.totalRelativeToPar)}
                          </p>
                        </div>
                      </div>
                    </TechCardContent>
                  </TechCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-gradient-to-t from-background via-background to-transparent">
        <div className="space-y-2">
          {/* Share Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleShareImage}
              disabled={isSharing}
              className="flex-1 h-11 text-sm font-semibold rounded-lg border-2"
            >
              {isSharing && shareMode === 'image' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Image className="w-4 h-4 mr-2" />
              )}
              Image
            </Button>
            
            <Button
              variant="outline"
              onClick={handleShareText}
              disabled={isSharing}
              className="flex-1 h-11 text-sm font-semibold rounded-lg"
            >
              {isSharing && shareMode === 'text' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4 mr-2" />
              )}
              Text
            </Button>
          </div>
          
          {/* New Round Button */}
          <Button
            onClick={() => {
              hapticLight();
              navigate('/new-round');
            }}
            className="w-full h-12 text-base font-bold rounded-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Round
          </Button>
          
          {/* Home Link */}
          <button
            onClick={() => {
              hapticLight();
              navigate('/');
            }}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
