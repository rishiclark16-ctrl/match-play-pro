import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, X, Loader2, RefreshCw, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoundCard } from '@/components/golf/RoundCard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { GeometricBackground } from '@/components/ui/geometric-background';
import { GlassCard } from '@/components/ui/glass-card';
import { useRounds } from '@/hooks/useRounds';
import { useJoinRound } from '@/hooks/useJoinRound';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useDeleteRound } from '@/hooks/useDeleteRound';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Round } from '@/types/golf';
import { staggerContainer, staggerItem, popIn, pageVariants } from '@/lib/animations';

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
        status: r.status as 'active' | 'complete',
        createdAt: new Date(r.created_at || Date.now()),
        joinCode: r.join_code,
        holeInfo: r.hole_info as any,
        slope: r.slope ?? undefined,
        rating: r.rating ?? undefined,
        games: (r.games as any) || [],
        presses: [],
      }));
      
      setRounds(transformedRounds);
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
      deleteLocalRound(roundId); // Also clean up local storage
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
      // Navigate with spectator flag
      navigate(`/round/${round.id}?spectator=true`);
      setShowJoinModal(false);
      setJoinCode('');
    } else {
      hapticError();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Subtle geometric background */}
      <GeometricBackground variant="radial" animated={false} className="opacity-40" />
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="pt-safe px-5 pt-14 pb-8 flex items-center justify-between relative z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Flag className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="headline-lg text-gradient">MATCH</h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            hapticLight();
            navigate('/profile');
          }}
          className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
        >
          <Avatar className="h-11 w-11 border-2 border-primary/20 shadow-lg">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'Profile'} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm font-bold">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
        </motion.button>
      </motion.header>

      {/* Content */}
      <main className="flex-1 px-5 pb-36 overflow-auto relative z-10">
        {loadingRounds ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground">Loading your rounds...</p>
          </motion.div>
        ) : rounds.length > 0 ? (
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-3"
          >
            <motion.div 
              variants={staggerItem}
              className="flex items-center justify-between mb-4"
            >
              <h2 className="label-sm">Recent Rounds</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchRounds}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </motion.button>
            </motion.div>
            {rounds.map((round, index) => (
              <motion.div
                key={round.id}
                variants={staggerItem}
                custom={index}
              >
                <RoundCard
                  round={round}
                  onClick={() => navigate(
                    round.status === 'active' 
                      ? `/round/${round.id}` 
                      : `/round/${round.id}/complete`
                  )}
                  onDelete={handleDeleteRound}
                  isDeleting={deletingRoundId === round.id}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            variants={pageVariants}
            initial="initial"
            animate="animate"
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6 relative"
            >
              <span className="text-5xl">⛳</span>
              <div className="absolute inset-0 rounded-3xl border border-primary/10" />
            </motion.div>
            <h2 className="headline-md mb-2">No rounds yet</h2>
            <p className="text-muted-foreground max-w-xs">
              Start your first round to track scores with your group!
            </p>
          </motion.div>
        )}
      </main>

      {/* Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-5 pb-safe bg-gradient-to-t from-background via-background/95 to-transparent z-20">
        <div className="space-y-3">
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={() => {
                hapticLight();
                navigate('/new-round');
              }}
              className="w-full py-7 text-lg font-semibold rounded-2xl bg-gradient-primary shadow-xl shadow-primary/25"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Round
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button 
              variant="outline"
              onClick={() => {
                hapticLight();
                setShowJoinModal(true);
              }}
              className="w-full py-7 text-lg font-semibold rounded-2xl border-2 border-primary/20 text-primary hover:bg-primary-light hover:border-primary/30 transition-all"
            >
              <Users className="w-5 h-5 mr-2" />
              Join Round
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Join Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowJoinModal(false)}
            />
            <motion.div
              variants={popIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed inset-x-5 top-1/2 -translate-y-1/2 z-50"
            >
              <GlassCard variant="elevated" className="p-6 relative">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowJoinModal(false)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
                
                <h3 className="headline-md mb-2">Join a Round</h3>
                <p className="text-muted-foreground mb-5">
                  Enter the 6-character code shared by the round creator.
                </p>
                
                <Input
                  placeholder="Enter code"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    clearError();
                  }}
                  maxLength={6}
                  className="py-7 text-center text-2xl font-bold tracking-[0.3em] uppercase rounded-2xl bg-muted/30 border-border/50"
                />
                
                {joinError && (
                  <p className="text-destructive text-sm mt-3">{joinError}</p>
                )}
                
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={handleJoinRound}
                    disabled={joinCode.length !== 6 || joinLoading}
                    className="w-full mt-5 py-6 text-lg font-semibold rounded-2xl bg-gradient-primary shadow-lg shadow-primary/20"
                  >
                    {joinLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : null}
                    Join Round
                  </Button>
                </motion.div>
                
                <p className="text-xs text-muted-foreground text-center mt-4">
                  You'll be able to follow along and see scores in real-time
                </p>
              </GlassCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
