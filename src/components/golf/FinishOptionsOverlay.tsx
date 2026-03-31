import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Swords, DollarSign, ArrowRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { NetSettlement } from '@/lib/games/settlement';

interface FinishOptionsOverlayProps {
  isOpen: boolean;
  onFinishRound: () => void;
  onStartPlayoff: () => void;
  onContinue: () => void;
  settlements?: NetSettlement[];
}

export function FinishOptionsOverlay({
  isOpen,
  onFinishRound,
  onStartPlayoff,
  onContinue,
  settlements = [],
}: FinishOptionsOverlayProps) {
  const [showSettlements, setShowSettlements] = useState(false);

  const totalSettlementAmount = settlements.reduce((sum, s) => sum + s.amount, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent pt-16"
        >
          <div className="text-center mb-4">
            <h3 className="text-xl font-black tracking-[-0.03em] text-foreground text-center">Round Complete!</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">All 18 holes scored</p>
          </div>

          {/* Settlement Preview */}
          {settlements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-6 mb-4 overflow-hidden"
            >
              <button
                onClick={() => setShowSettlements(!showSettlements)}
                className="px-4 py-3 flex items-center justify-between cursor-pointer w-full"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#22C55E]" />
                  <span className="text-sm font-bold text-foreground">Settlement Preview</span>
                  <span className="bg-muted text-[11px] font-bold px-2 py-0.5 rounded-full text-muted-foreground">
                    {settlements.length}
                  </span>
                </div>
                <motion.div animate={{ rotate: showSettlements ? 180 : 0 }}>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              </button>

              <AnimatePresence>
                {showSettlements && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    {settlements.map((s, i) => (
                      <div
                        key={i}
                        className="px-4 py-2 flex items-center gap-2 border-t border-border/50"
                      >
                        <span className="text-sm font-semibold text-foreground">{s.fromPlayerName.split(' ')[0]}</span>
                        <ArrowRight className="text-[#F0EE3A] w-3 h-3" />
                        <span className="text-sm font-semibold text-foreground flex-1">{s.toPlayerName.split(' ')[0]}</span>
                        <span className="text-sm font-black text-foreground tabular-nums">
                          ${s.amount.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          <div className="mx-6 space-y-2 mb-safe">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onFinishRound}
              className="w-full bg-[#F0EE3A] text-[#0A0A0A] rounded-2xl h-[52px] font-black text-[15px] flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5" />
              Finish Round
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onStartPlayoff}
              className="w-full border-2 border-foreground rounded-2xl h-[52px] font-bold text-foreground flex items-center justify-center gap-2"
            >
              <Swords className="w-5 h-5" />
              Playoff Hole #1
            </motion.button>

            <button
              onClick={onContinue}
              className="w-full text-muted-foreground text-sm font-medium py-3 flex items-center justify-center"
            >
              Continue Scoring
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
