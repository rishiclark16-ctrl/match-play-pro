import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Share2, Plus, Home, Loader2, Image, Send } from 'lucide-react';
import { hapticLight } from '@/lib/haptics';

interface RoundCompleteActionsProps {
  isSharing: boolean;
  shareMode: 'image' | 'text' | null;
  onShareImage: () => void;
  onShareText: () => void;
  onShowShareSheet: () => void;
}

export function RoundCompleteActions({
  isSharing,
  shareMode,
  onShareImage,
  onShareText,
  onShowShareSheet,
}: RoundCompleteActionsProps) {
  const navigate = useNavigate();

  const buttonVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-[rgba(0,0,0,0.06)] bg-background px-6 py-4 pb-safe z-50 pointer-events-auto">
      <div className="space-y-2">
        {/* Send Results button (secondary) */}
        <motion.button
          variants={buttonVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.04 }}
          onClick={() => {
            hapticLight();
            onShowShareSheet();
          }}
          className="w-full border-2 border-foreground rounded-2xl h-[52px] font-semibold text-foreground flex items-center justify-center gap-2 mb-2"
        >
          <Send className="w-5 h-5" />
          Send Results to Group
        </motion.button>

        {/* Share Buttons (tertiary) */}
        <div className="flex gap-2">
          <motion.button
            variants={buttonVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.08 }}
            onClick={onShareImage}
            disabled={isSharing}
            className="flex-1 bg-white border border-border rounded-2xl h-11 font-medium text-sm flex items-center justify-center gap-1.5"
          >
            {isSharing && shareMode === 'image' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Image className="w-4 h-4" />
            )}
            Image
          </motion.button>

          <motion.button
            variants={buttonVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.12 }}
            onClick={onShareText}
            disabled={isSharing}
            className="flex-1 bg-white border border-border rounded-2xl h-11 font-medium text-sm flex items-center justify-center gap-1.5"
          >
            {isSharing && shareMode === 'text' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            Text
          </motion.button>
        </div>

        {/* New Round Button (primary) */}
        <motion.button
          variants={buttonVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.16 }}
          onClick={() => {
            hapticLight();
            navigate('/new-round');
          }}
          className="w-full bg-foreground text-background rounded-2xl h-[52px] font-bold text-[15px] flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Round
        </motion.button>

        {/* Back to Home ghost */}
        <motion.button
          variants={buttonVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
          onClick={() => {
            hapticLight();
            navigate('/');
          }}
          className="w-full text-muted-foreground text-sm font-medium flex items-center justify-center gap-1.5 py-2"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </motion.button>
      </div>
    </div>
  );
}
