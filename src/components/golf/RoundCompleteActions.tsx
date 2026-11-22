import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Share2, Plus, Loader2, Image, Send, ClipboardList } from 'lucide-react';
import { hapticLight } from '@/lib/haptics';

interface RoundCompleteActionsProps {
  roundId?: string;
  isSharing: boolean;
  shareMode: 'image' | 'text' | null;
  onShareImage: () => void;
  onShareText: () => void;
  onShowShareSheet: () => void;
}

const secondary =
  'flex-1 h-12 rounded-[14px] bg-muted text-foreground text-[14px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50';

export function RoundCompleteActions({
  roundId,
  isSharing,
  shareMode,
  onShareImage,
  onShareText,
  onShowShareSheet,
}: RoundCompleteActionsProps) {
  const navigate = useNavigate();

  const goNewRound = () => {
    hapticLight();
    navigate('/new-round');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 28 }}
      className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-5 pt-3 pb-safe z-50 pointer-events-auto"
    >
      <div className="space-y-2 pb-2">
        {/* Lime send button + Ink primary CTA */}
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              hapticLight();
              onShowShareSheet();
            }}
            aria-label="Send results"
            className="w-[60px] h-[60px] rounded-[20px] bg-[#BEF264] flex items-center justify-center shrink-0"
          >
            <Send className="w-6 h-6 text-[#14532D]" strokeWidth={2.4} />
          </motion.button>

          {roundId ? (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                hapticLight();
                navigate(`/round/${roundId}/dashboard`);
              }}
              className="flex-1 h-[60px] rounded-[20px] bg-[#0F1F17] text-white text-[16px] font-semibold flex items-center justify-center gap-2"
            >
              <ClipboardList className="w-5 h-5" />
              View scorecard
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={goNewRound}
              className="flex-1 h-[60px] rounded-[20px] bg-[#0F1F17] text-white text-[16px] font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New round
            </motion.button>
          )}
        </div>

        {/* Secondary actions */}
        <div className="flex gap-2">
          <motion.button whileTap={{ scale: 0.97 }} onClick={onShareImage} disabled={isSharing} className={secondary}>
            {isSharing && shareMode === 'image' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Image className="w-4 h-4" />
            )}
            Image
          </motion.button>

          <motion.button whileTap={{ scale: 0.97 }} onClick={onShareText} disabled={isSharing} className={secondary}>
            {isSharing && shareMode === 'text' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            Text
          </motion.button>

          {roundId && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={goNewRound} className={secondary}>
              <Plus className="w-4 h-4" />
              New round
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
