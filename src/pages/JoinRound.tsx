import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Loader2, ArrowLeft, ScanLine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { QRCodeScanner } from '@/components/friends/QRCodeScanner';
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
  const [showScanner, setShowScanner] = useState(false);

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
        hapticSuccess();
        navigate(`/round/${round.id}?spectator=true`);
      }
    } else {
      hapticError();
    }

    setJoining(false);
  };

  return (
    <div className="h-screen flex flex-col bg-[#F8F8F6]">
      {/* Header */}
      <header className="flex-shrink-0 px-6 pt-safe-content pb-3 border-b-2 border-foreground">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </motion.button>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">MATCH Golf</p>
            <h1 className="text-[22px] font-black tracking-[-0.04em] text-foreground leading-none">Watch Live</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="w-full max-w-sm"
        >
          {/* Icon + title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-foreground flex items-center justify-center mx-auto mb-4">
              <Eye className="w-7 h-7 text-[#F0EE3A]" />
            </div>
            <h2 className="text-[20px] font-black tracking-[-0.04em] text-foreground mb-2">Watch a Round</h2>
            <p className="text-[14px] text-muted-foreground">
              Enter the round code to follow along in real-time
            </p>
          </div>

          {/* Code Input */}
          <div className="space-y-3">
            <div className="relative">
              <Input
                placeholder="XXXXXX"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  clearError();
                }}
                maxLength={6}
                className="py-6 text-center text-2xl font-black tracking-[0.4em] uppercase rounded-2xl bg-white border-0 shadow-[0_1px_3px_rgba(0,0,0,0.06)] font-mono pr-14"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => setShowScanner(true)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
              >
                <ScanLine className="w-4 h-4 text-foreground" />
              </motion.button>
            </div>

            {error && (
              <p className="text-[#EF4444] text-sm font-medium text-center">{error}</p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleWatchLive}
              disabled={joinCode.length !== 6 || loading || joining}
              className="w-full bg-foreground text-background rounded-2xl h-[52px] font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {(loading || joining) ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  Watch Live
                </>
              )}
            </motion.button>
          </div>

          {/* Info */}
          <p className="text-[12px] text-muted-foreground text-center mt-6">
            You'll see scores update in real-time as the scorekeeper enters them
          </p>
        </motion.div>
      </main>

      {/* QR Scanner */}
      <QRCodeScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(code) => {
          setJoinCode(code.toUpperCase());
          setShowScanner(false);
          hapticSuccess();
        }}
      />
    </div>
  );
}
