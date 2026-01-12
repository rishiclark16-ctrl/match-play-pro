import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, X, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoundCard } from '@/components/golf/RoundCard';
import { useRounds } from '@/hooks/useRounds';
import { useJoinRound } from '@/hooks/useJoinRound';
import { useAuth } from '@/hooks/useAuth';
import { useDeleteRound } from '@/hooks/useDeleteRound';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Round } from '@/types/golf';

export default function Home() {
  const navigate = useNavigate();
  const { deleteRound: deleteLocalRound } = useRounds();
  const { user, signOut } = useAuth();
  const { joinRound, loading: joinLoading, error: joinError, clearError } = useJoinRound();
  const { deleteRound: deleteSupabaseRound, loading: deleteLoading } = useDeleteRound();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [deletingRoundId, setDeletingRoundId] = useState<string | null>(null);
  
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

  const handleSignOut = async () => {
    setIsSigningOut(true);
    hapticLight();
    const { error } = await signOut();
    if (error) {
      toast.error('Failed to sign out');
      hapticError();
    } else {
      hapticSuccess();
      toast.success('Signed out');
    }
    setIsSigningOut(false);
  };

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="pt-12 pb-6 px-6 safe-top flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary tracking-tight">MATCH</h1>
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isSigningOut ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 pb-32 overflow-auto">
        {loadingRounds ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : rounds.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Recent Rounds
              </h2>
              <button
                onClick={fetchRounds}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
            {rounds.map((round) => (
              <RoundCard
                key={round.id}
                round={round}
                onClick={() => navigate(
                  round.status === 'active' 
                    ? `/round/${round.id}` 
                    : `/round/${round.id}/complete`
                )}
                onDelete={handleDeleteRound}
                isDeleting={deletingRoundId === round.id}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center mb-4">
              <span className="text-4xl">⛳</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">No rounds yet</h2>
            <p className="text-muted-foreground">Start your first round to track scores with your group!</p>
          </div>
        )}
      </main>

      {/* Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent safe-bottom">
        <div className="space-y-3">
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={() => {
                hapticLight();
                navigate('/new-round');
              }}
              className="w-full py-6 text-lg font-semibold rounded-xl"
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
              className="w-full py-6 text-lg font-semibold rounded-xl border-primary text-primary hover:bg-primary-light"
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
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowJoinModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-6 top-1/2 -translate-y-1/2 bg-background rounded-2xl p-6 z-50 shadow-xl"
            >
              <button
                onClick={() => setShowJoinModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="text-xl font-semibold mb-2">Join a Round</h3>
              <p className="text-muted-foreground mb-4">
                Enter the 6-character code shared by the round creator.
              </p>
              
              <Input
                placeholder="Enter code (e.g. ABC123)"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  clearError();
                }}
                maxLength={6}
                className="py-6 text-center text-2xl font-bold tracking-widest uppercase"
              />
              
              {joinError && (
                <p className="text-danger text-sm mt-2">{joinError}</p>
              )}
              
              <Button 
                onClick={handleJoinRound}
                disabled={joinCode.length !== 6 || joinLoading}
                className="w-full mt-4 py-6 text-lg font-semibold rounded-xl"
              >
                {joinLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : null}
                Join Round
              </Button>
              
              <p className="text-xs text-muted-foreground text-center mt-3">
                You'll be able to follow along live and see scores in real-time
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
