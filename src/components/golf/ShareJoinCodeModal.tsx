import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Share2, Check, Eye, Users, QrCode } from 'lucide-react';
import { toast } from 'sonner';

const QRCodeSVG = lazy(() => import('qrcode.react').then(m => ({ default: m.QRCodeSVG })));

interface ShareJoinCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  joinCode: string;
  courseName: string;
  roundId?: string;
}

export function ShareJoinCodeModal({ isOpen, onClose, joinCode, courseName, roundId }: ShareJoinCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const navigate = useNavigate();

  const spectatorUrl = roundId
    ? `${window.location.origin}/join?code=${joinCode}`
    : joinCode;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleShareAsPlayer = async () => {
    const shareText = `Join my golf round on MATCH!\n\n📍 ${courseName}\n🔑 Code: ${joinCode}\n\nOpen the MATCH app and enter this code to join as a player.`;

    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('Share message copied!');
      }
    } catch (err) {
      // User cancelled share
    }
  };

  const handleShareAsSpectator = async () => {
    const spectatorUrl = roundId
      ? `${window.location.origin}/join?code=${joinCode}`
      : `Join code: ${joinCode}`;

    const shareText = `Watch my golf round live on MATCH! 🏌️‍♂️\n\n📍 ${courseName}\n👁️ Watch Live: ${spectatorUrl}\n\nFollow along in real-time!`;

    try {
      if (navigator.share) {
        await navigator.share({
          text: shareText,
          url: roundId ? `${window.location.origin}/join?code=${joinCode}` : undefined
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('Spectator link copied!');
      }
    } catch (err) {
      // User cancelled share
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl p-5 mx-6 z-50 max-w-sm mx-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-black tracking-[-0.03em]">Share this round</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Invite players or let friends watch live
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 ml-3"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Code display */}
            <div className="bg-muted/40 rounded-2xl py-6 px-4 text-center mb-4 relative">
              <AnimatePresence mode="wait">
                {showQR ? (
                  <motion.div
                    key="qr"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center"
                  >
                    <div className="bg-white rounded-2xl p-4 border border-border">
                      <Suspense fallback={<div className="w-[160px] h-[160px] bg-muted rounded-lg animate-pulse" />}>
                        <QRCodeSVG
                          value={spectatorUrl}
                          size={160}
                          level="M"
                          includeMargin={false}
                        />
                      </Suspense>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Scan to watch live
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="code"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <p className="font-mono text-3xl font-black tracking-[0.3em] text-foreground">
                      {joinCode}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              {!showQR && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleCopyCode}
                  className="absolute top-2 right-2 w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-[#22C55E]" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </motion.button>
              )}
            </div>

            {/* Toggle QR/Code */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowQR(!showQR)}
              className="w-full text-sm font-medium text-muted-foreground flex items-center justify-center gap-2 mb-3"
            >
              <QrCode className="w-4 h-4" />
              {showQR ? 'Show Code' : 'Show QR Code'}
            </motion.button>

            {/* 2-column action buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCopyCode}
                className="bg-white border border-border rounded-2xl py-3 flex items-center justify-center gap-2 text-sm font-bold"
              >
                <Copy className="w-4 h-4" />
                Copy Code
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleShareAsPlayer}
                className="bg-white border border-border rounded-2xl py-3 flex items-center justify-center gap-2 text-sm font-bold"
              >
                <Users className="w-4 h-4" />
                Invite Player
              </motion.button>
            </div>

            {/* Spectator share button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleShareAsSpectator}
              className="w-full bg-foreground text-background rounded-2xl py-3.5 font-bold text-sm flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Share Watch Link
            </motion.button>

            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Spectators can follow live but can't edit scores
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
