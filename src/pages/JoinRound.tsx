import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TechCard } from '@/components/ui/tech-card';
import { useJoinRound } from '@/hooks/useJoinRound';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';

export default function JoinRound() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { joinRound, loading, error, clearError } = useJoinRound();
  
  const codeFromUrl = searchParams.get('code') || '';
  const [joinCode, setJoinCode] = useState(codeFromUrl.toUpperCase());
  const [joining, setJoining] = useState(false);

  // Auto-join if code is in URL
  useEffect(() => {
    if (codeFromUrl && codeFromUrl.length === 6) {
      handleWatchLive();
    }
  }, []);

  const handleWatchLive = async () => {
    if (joinCode.length !== 6) return;
    
    setJoining(true);
    hapticLight();
    
    const round = await joinRound(joinCode.trim());
    
    if (round && user) {
      // Add user as spectator
      try {
        await supabase
          .from('round_spectators')
          .upsert({
            round_id: round.id,
            profile_id: user.id,
          }, {
            onConflict: 'round_id,profile_id'
          });
        
        hapticSuccess();
        toast.success('Joined as spectator');
        navigate(`/round/${round.id}?spectator=true`);
      } catch (err) {
        console.error('Error adding spectator:', err);
        hapticSuccess();
        navigate(`/round/${round.id}?spectator=true`);
      }
    } else {
      hapticError();
    }
    
    setJoining(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Technical Grid Background */}
      <div className="absolute inset-0 pointer-events-none">
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
        <div 
          className="absolute top-0 left-0 right-0 h-80"
          style={{
            background: 'linear-gradient(180deg, hsl(var(--primary) / 0.04) 0%, transparent 100%)',
          }}
        />
      </div>

      {/* Header */}
      <header className="pt-safe px-6 pt-14 pb-6 relative z-10">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </motion.button>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 flex items-center justify-center relative z-10">
        <TechCard variant="elevated" corners className="p-8 max-w-sm w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Eye className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Watch Live</h1>
            <p className="text-sm text-muted-foreground">
              Enter the round code to follow along in real-time
            </p>
          </div>

          {/* Code Input */}
          <div className="space-y-4">
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
            
            {error && (
              <p className="text-danger text-sm font-medium text-center">{error}</p>
            )}

            <Button
              onClick={handleWatchLive}
              disabled={joinCode.length !== 6 || loading || joining}
              className="w-full py-6 text-base font-bold rounded-xl"
            >
              {(loading || joining) ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Joining...
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5 mr-2" />
                  Watch Live
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              You'll see scores update in real-time as the scorekeeper enters them
            </p>
          </div>
        </TechCard>
      </main>
    </div>
  );
}
