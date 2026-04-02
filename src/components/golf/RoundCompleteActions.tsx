import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Share2, Plus, Home, Loader2, Image, Send, ClipboardList } from 'lucide-react';
import { hapticLight } from '@/lib/haptics';

interface RoundCompleteActionsProps {
  roundId?: string;
  isSharing: boolean;
  shareMode: 'image' | 'text' | null;
  onShareImage: () => void;
  onShareText: () => void;
  onShowShareSheet: () => void;
}

export function RoundCompleteActions({
  roundId,
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
    <div className="fixed bottom-0 left-0 right-0 border-t border-[rgba(0,0,0,0.06)] bg-background/95 backdrop-blur-md px-5 pt-3 pb-safe z-50 pointer-events-auto">
      <div className="space-y-2 pb-2">
        {/* View Scorecard Button (primary CTA) */}
        {roundId && (
          <motion.button
            variants={buttonVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.04 }}
            onClick={() => {
              hapticLight();
              navigate(`/round/${roundId}/dashboard`);
            }}
            className="w-full bg-foreground text-background rounded-2xl h-[48px] font-bold text-[15px] flex items-center justify-center gap-2"
          >
            <ClipboardList className="w-5 h-5" />
            View Scorecard
          </motion.button>
        )}

        {/* Share row — Send + Image + Text side by side */}
        <div className="flex gap-1.5">
          <motion.button
            variants={buttonVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.08 }}
            onClick={() => {
              hapticLight();
              onShowShareSheet();
            }}
            className="flex-1 border border-foreground rounded-xl h-10 font-semibold text-[12px] text-foreground flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </motion.button>

          <motion.button
            variants={buttonVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.1 }}
            onClick={onShareImage}
            disabled={isSharing}
            className="flex-1 bg-white border border-border rounded-xl h-10 font-medium text-[12px] flex items-center justify-center gap-1.5"
          >
            {isSharing && shareMode === 'image' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Image className="w-3.5 h-3.5" />
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
            className="flex-1 bg-white border border-border rounded-xl h-10 font-medium text-[12px] flex items-center justify-center gap-1.5"
          >
            {isSharing && shareMode === 'text' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            Text
          </motion.button>
        </div>

        {/* New Round + Home row */}
        <div className="flex gap-1.5">
          <motion.button
            variants={buttonVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.16 }}
            onClick={() => {
              hapticLight();
              navigate('/new-round');
            }}
            className="flex-1 border border-border rounded-xl h-10 font-semibold text-[13px] text-foreground flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Round
          </motion.button>

          <motion.button
            variants={buttonVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.18 }}
            onClick={() => {
              hapticLight();
              navigate('/');
            }}
            className="flex-1 text-muted-foreground rounded-xl h-10 font-medium text-[13px] flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            Home
          </motion.button>
        </div>
      </div>
    </div>
  );
}
