import { motion } from 'framer-motion';
import { Crown, Sparkles } from 'lucide-react';

interface UseThisGameButtonProps {
  onUse: () => void;
  isPro: boolean;
  onPaywall: () => void;
}

export function UseThisGameButton({ onUse, isPro, onPaywall }: UseThisGameButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={(e) => {
        e.stopPropagation();
        if (isPro) { onUse(); } else { onPaywall(); }
      }}
      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#BEF264] text-[#0F1F17] text-[12px] font-black mt-2"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {!isPro && <Crown className="w-3 h-3" />}
      <Sparkles className="w-3 h-3" />
      <span>Use This Game</span>
    </motion.button>
  );
}
