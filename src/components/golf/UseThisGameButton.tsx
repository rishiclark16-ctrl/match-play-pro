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
      className="w-full h-11 flex items-center justify-center gap-1.5 rounded-[14px] bg-gold text-primary text-[14px] font-bold mt-3"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {!isPro && <Crown className="w-4 h-4" />}
      <Sparkles className="w-4 h-4" />
      <span>Use this game</span>
    </motion.button>
  );
}
