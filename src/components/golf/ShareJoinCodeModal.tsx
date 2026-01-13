import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Share2, Check, Eye, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareJoinCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  joinCode: string;
  courseName: string;
  roundId?: string;
}

export function ShareJoinCodeModal({ isOpen, onClose, joinCode, courseName, roundId }: ShareJoinCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

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
      ? `${window.location.origin}/round/${roundId}?spectator=true`
      : `Join code: ${joinCode}`;
    
    const shareText = `Watch my golf round live on MATCH! 🏌️‍♂️\n\n📍 ${courseName}\n👁️ Watch Live: ${spectatorUrl}\n\nFollow along in real-time!`;
    
    try {
      if (navigator.share) {
        await navigator.share({ 
          text: shareText,
          url: roundId ? `${window.location.origin}/round/${roundId}?spectator=true` : undefined
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
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-background rounded-3xl p-6 z-50 shadow-2xl max-w-sm mx-auto"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Share this round</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Invite players or let friends watch live
              </p>
              
              {/* Large join code display */}
              <motion.div 
                whileTap={{ scale: 0.98 }}
                onClick={handleCopyCode}
                className="relative bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 mb-6 cursor-pointer border-2 border-primary/20 hover:border-primary/40 transition-colors"
              >
                <p className="text-4xl font-bold tracking-[0.3em] text-primary font-mono">
                  {joinCode}
                </p>
                <div className="absolute top-2 right-2">
                  {copied ? (
                    <Check className="w-5 h-5 text-success" />
                  ) : (
                    <Copy className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </motion.div>

              {/* Share options */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCopyCode}
                    className="py-5 rounded-xl font-semibold"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button
                    onClick={handleShareAsPlayer}
                    className="py-5 rounded-xl font-semibold"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Invite Player
                  </Button>
                </div>
                
                {/* Spectator share option */}
                <Button
                  variant="secondary"
                  onClick={handleShareAsSpectator}
                  className="w-full py-5 rounded-xl font-semibold"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Share Watch Link
                </Button>
                
                <p className="text-xs text-muted-foreground pt-2">
                  👁️ Spectators can follow live but can't edit scores
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
