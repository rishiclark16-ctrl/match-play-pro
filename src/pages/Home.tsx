import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, X, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoundCard } from '@/components/golf/RoundCard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TechCard } from '@/components/ui/tech-card';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useRounds } from '@/hooks/useRounds';
import { useJoinRound } from '@/hooks/useJoinRound';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useDeleteRound } from '@/hooks/useDeleteRound';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Round } from '@/types/golf';
import { popIn } from '@/lib/animations';

export default function Home() {
  const navigate = useNavigate();
  const { deleteRound: deleteLocalRound } = useRounds();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { joinRound, loading: joinLoading, error: joinError, clearError } = useJoinRound();
  const { deleteRound: deleteSupabaseRound, loading: deleteLoading } = useDeleteRound();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [deletingRoundId, setDeletingRoundId] = useState<string | null>(null);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  // Fetch rounds from Supabase
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loadingRounds, setLoadingRounds] = useState(true);
  const [roundStats, setRoundStats] = useState<Map<string, { playerCount: number; currentHole: number }>>(new Map());
  
  const fetchRounds = useCallback(async () => {
    setLoadingRounds(true);
    try {
      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      const transformedRounds: Round[] = (data || []).map(r => ({
        id: r.id,
        courseId: r.course_id || '',
        courseName: r.course_name,
        holes: r.holes as 9 | 18,
        strokePlay: r.stroke_play ?? true,
        matchPlay: r.match_play ?? false,
        stakes: r.stakes ?? undefined,
        status: (r.status === 'active' ? 'active' : 'complete') as 'active' | 'complete',
        createdAt: new Date(r.created_at || Date.now()),
        joinCode: r.join_code,
        holeInfo: r.hole_info as any,
        slope: r.slope ?? undefined,
        rating: r.rating ?? undefined,
        games: (r.games as any) || [],
        presses: [],
      }));
      
      setRounds(transformedRounds);
      
      // Fetch player counts and current holes for each round
      if (data && data.length > 0) {
        const roundIds = data.map(r => r.id);
        
        // Fetch players for all rounds
        const { data: playersData } = await supabase
          .from('players')
          .select('round_id')
          .in('round_id', roundIds);
        
        // Fetch scores to determine current hole (max hole with scores)
        const { data: scoresData } = await supabase
          .from('scores')
          .select('round_id, hole_number')
          .in('round_id', roundIds);
        
        const statsMap = new Map<string, { playerCount: number; currentHole: number }>();
        
        roundIds.forEach(roundId => {
          const playerCount = playersData?.filter(p => p.round_id === roundId).length || 0;
          const roundScores = scoresData?.filter(s => s.round_id === roundId) || [];
          const currentHole = roundScores.length > 0 
            ? Math.max(...roundScores.map(s => s.hole_number))
            : 0;
          
          statsMap.set(roundId, { playerCount, currentHole });
        });
        
        setRoundStats(statsMap);
      }
    } catch (err) {
      console.error('Error fetching rounds:', err);
    } finally {
      setLoadingRounds(false);
    }
  }, []);
  
  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  const handleDeleteRound = async (roundId: string) => {
    setDeletingRoundId(roundId);
    hapticLight();
    
    const success = await deleteSupabaseRound(roundId);
    
    if (success) {
      deleteLocalRound(roundId);
      setRounds(prev => prev.filter(r => r.id !== roundId));
      hapticSuccess();
      toast.success('Round deleted');
    } else {
      hapticError();
      toast.error('Failed to delete round');
    }
    
    setDeletingRoundId(null);
  };

  const handleJoinRound = async () => {
    const round = await joinRound(joinCode.trim());
    if (round) {
      hapticSuccess();
      navigate(`/round/${round.id}?spectator=true`);
      setShowJoinModal(false);
      setJoinCode('');
    } else {
      hapticError();
    }
  };

  const handlePullRefresh = async () => {
    hapticLight();
    await fetchRounds();
    hapticSuccess();
  };

  const activeRounds = rounds.filter(r => r.status === 'active');
  const completedRounds = rounds.filter(r => r.status === 'complete');

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Technical Grid Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle grid */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
        
        {/* Top gradient accent */}
        <div 
          className="absolute top-0 left-0 right-0 h-80"
          style={{
            background: 'linear-gradient(180deg, hsl(var(--primary) / 0.04) 0%, transparent 100%)',
          }}
        />
        
        {/* Corner accents */}
        <div className="absolute top-6 left-6 w-12 h-12 border-l-2 border-t-2 border-primary/20" />
        <div className="absolute top-6 right-6 w-12 h-12 border-r-2 border-t-2 border-primary/10" />
        
        {/* Data lines */}
        <div className="absolute top-32 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="pt-safe px-6 pt-14 pb-6 flex items-center justify-between relative z-10"
      >
        <div className="flex items-center gap-4">
          {/* Logo mark */}
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-2xl font-black text-primary-foreground tracking-tighter">M</span>
            </div>
            {/* Corner accent on logo */}
            <div className="absolute -top-1 -left-1 w-3 h-3 border-l-2 border-t-2 border-primary" />
          </div>
          
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">MATCH</h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Golf Scorecard</p>
          </div>
        </div>
        
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            hapticLight();
            navigate('/profile');
          }}
          className="relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl"
        >
          <Avatar className="h-12 w-12 rounded-xl border-2 border-border">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'Profile'} className="rounded-xl" />
            <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-background" />
        </motion.button>
      </motion.header>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="px-6 py-3 border-y border-border bg-muted/30 relative z-10"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Active</p>
              <p className="text-2xl font-black tabular-nums text-foreground">{activeRounds.length}</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Completed</p>
              <p className="text-2xl font-black tabular-nums text-muted-foreground">{completedRounds.length}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <PullToRefresh onRefresh={handlePullRefresh} className="flex-1 overflow-auto relative z-10">
        <main className="px-6 py-6 pb-24">
          {loadingRounds ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center border border-border">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Loading rounds...</p>
            </motion.div>
          ) : rounds.length > 0 ? (
            <div className="space-y-6">
              {/* Active Rounds Section */}
              {activeRounds.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Live Rounds</h2>
                  </div>
                  {activeRounds.map((round, index) => {
                    const stats = roundStats.get(round.id);
                    return (
                      <motion.div 
                        key={round.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08, duration: 0.3 }}
                      >
                        <RoundCard
                          round={round}
                          onClick={() => navigate(`/round/${round.id}`)}
                          onDelete={handleDeleteRound}
                          isDeleting={deletingRoundId === round.id}
                          playerCount={stats?.playerCount}
                          currentHole={stats?.currentHole}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              )}
              
              {/* Completed Rounds Section */}
              {completedRounds.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">History</h2>
                  {completedRounds.map((round, index) => {
                    const stats = roundStats.get(round.id);
                    return (
                      <motion.div 
                        key={round.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (index + activeRounds.length) * 0.08, duration: 0.3 }}
                      >
                        <RoundCard
                          round={round}
                          onClick={() => navigate(`/round/${round.id}/complete`)}
                          onDelete={handleDeleteRound}
                          isDeleting={deletingRoundId === round.id}
                          playerCount={stats?.playerCount}
                          currentHole={stats?.currentHole}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <TechCard corners className="p-8 max-w-xs mx-auto">
                <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center mx-auto mb-6 border border-border">
                  <span className="text-4xl">⛳</span>
                </div>
                <h2 className="text-xl font-bold mb-2">No rounds yet</h2>
                <p className="text-sm text-muted-foreground">
                  Start your first round to track scores with your group.
                </p>
                <Button 
                  onClick={() => {
                    hapticLight();
                    navigate('/new-round');
                  }}
                  className="w-full mt-6 py-6 font-semibold rounded-xl bg-primary"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  New Round
                </Button>
              </TechCard>
            </motion.div>
          )}
        </main>
      </PullToRefresh>

      {/* Join Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
              onClick={() => setShowJoinModal(false)}
            />
            <motion.div
              variants={popIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-50"
            >
              <TechCard variant="elevated" corners className="p-6 relative">
                {/* Corner accents */}
                <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-primary" />
                <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-primary/50" />
                
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowJoinModal(false)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
                
                <div className="pt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-1">Join</p>
                  <h3 className="text-xl font-bold mb-1">Enter Round Code</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Enter the 6-character code to join as spectator.
                  </p>
                </div>
                
                <Input
                  placeholder="XXXXXX"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    clearError();
                  }}
                  maxLength={6}
                  className="py-6 text-center text-2xl font-black tracking-[0.4em] uppercase rounded-xl bg-muted border-border font-mono"
                />
                
                {joinError && (
                  <p className="text-danger text-sm mt-3 font-medium">{joinError}</p>
                )}
                
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={handleJoinRound}
                    disabled={joinCode.length !== 6 || joinLoading}
                    className="w-full mt-5 py-6 text-base font-bold rounded-xl bg-primary"
                  >
                    {joinLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <ChevronRight className="w-5 h-5 mr-1" />
                    )}
                    Join Round
                  </Button>
                </motion.div>
                
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Follow along and see scores in real-time
                </p>
              </TechCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
