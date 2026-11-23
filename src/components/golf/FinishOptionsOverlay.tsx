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
          className="fixed inset-x-0 bottom-0 z-40 bg-[#FAFAF7] rounded-t-[28px] border-t border-[#E7E9E3] shadow-[0_-12px_40px_rgba(15,31,23,0.12)] pt-6"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
        >
          <div className="px-5 mb-4">
            <h3 className="text-[28px] font-extrabold tracking-[-0.02em] text-[#0F1F17] leading-tight">Round complete</h3>
            <p className="text-[14px] font-medium text-[#5A6B61] mt-1">Every hole is in. Settle up or play it off.</p>
          </div>

          {/* Settlement Preview */}
          {settlements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[20px] border border-[#E7E9E3] mx-3.5 mb-3 overflow-hidden"
            >
              <button
                onClick={() => setShowSettlements(!showSettlements)}
                className="px-4 min-h-[52px] flex items-center justify-between cursor-pointer w-full"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#14532D]" />
                  <span className="text-[15px] font-semibold text-[#0F1F17]">Who pays who</span>
                  <span className="bg-[#F0F2EC] text-[12px] font-semibold px-2 py-0.5 rounded-full text-[#5A6B61]">
                    {settlements.length}
                  </span>
                </div>
                <motion.div animate={{ rotate: showSettlements ? 180 : 0 }}>
                  <ChevronDown className="w-5 h-5 text-[#5A6B61]" />
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
                        className="px-4 min-h-[44px] flex items-center gap-2 border-t border-[#E7E9E3]"
                      >
                        <span className="text-[15px] font-semibold text-[#0F1F17]">{s.fromPlayerName.split(' ')[0]}</span>
                        <ArrowRight className="text-[#5A6B61] w-3.5 h-3.5" />
                        <span className="text-[15px] font-semibold text-[#0F1F17] flex-1">{s.toPlayerName.split(' ')[0]}</span>
                        <span className="text-[15px] font-extrabold text-[#0F1F17] tabular-nums">
                          ${s.amount.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          <div className="mx-3.5 space-y-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onFinishRound}
              className="w-full bg-[#14532D] text-white rounded-[20px] h-[60px] font-bold text-[17px] flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5 text-[#BEF264]" />
              Finish round
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onStartPlayoff}
              className="w-full bg-white border border-[#E7E9E3] rounded-[20px] h-14 font-semibold text-[16px] text-[#0F1F17] flex items-center justify-center gap-2"
            >
              <Swords className="w-5 h-5" />
              Play a playoff hole
            </motion.button>

            <button
              onClick={onContinue}
              className="w-full text-[#5A6B61] text-[15px] font-semibold min-h-[48px] flex items-center justify-center"
            >
              Keep scoring
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
