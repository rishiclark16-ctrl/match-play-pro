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

  // Auto-join if code is in URL — one-shot on mount only.
  // codeFromUrl/handleWatchLive are intentionally omitted: re-running on
  // change would double-fire joins as the page re-renders.
  useEffect(() => {
    if (codeFromUrl && codeFromUrl.length === 6) {
      handleWatchLive();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="h-screen flex flex-col bg-[#FAFAF7]">
      {/* Header */}
      <header className="flex-shrink-0 px-3.5 pt-safe-content pb-2">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/')}
            className="w-11 h-11 rounded-[14px] bg-white border border-[#E7E9E3] flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-[#0F1F17]" />
          </motion.button>
          <div>
            <p className="text-[12px] font-medium text-[#5A6B61] leading-tight">MATCH Golf</p>
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-[#0F1F17] leading-tight">Watch live</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto flex items-center justify-center px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="w-full max-w-sm"
        >
          {/* Icon + title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-[20px] bg-[#14532D] flex items-center justify-center mx-auto mb-4">
              <Eye className="w-7 h-7 text-[#BEF264]" />
            </div>
            <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-[#0F1F17] mb-2">Watch a round</h2>
            <p className="text-[14px] text-[#5A6B61]">
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
                className="h-16 text-center text-[26px] font-bold tracking-[0.3em] rounded-[20px] bg-white border border-[#E7E9E3] text-[#0F1F17] tabular-nums pr-14"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => setShowScanner(true)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-[14px] bg-[#F0F2EC] flex items-center justify-center"
                aria-label="Scan QR code"
              >
                <ScanLine className="w-5 h-5 text-[#0F1F17]" />
              </motion.button>
            </div>

            {error && (
              <p className="text-[#B42318] text-sm font-medium text-center">{error}</p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleWatchLive}
              disabled={joinCode.length !== 6 || loading || joining}
              className="w-full bg-[#0F1F17] text-white rounded-[20px] h-[60px] font-bold text-[17px] flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {(loading || joining) ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  Watch live
                </>
              )}
            </motion.button>
          </div>

          {/* Info */}
          <p className="text-[13px] text-[#5A6B61] text-center mt-6">
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
