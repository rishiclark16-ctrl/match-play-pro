import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Swords, DollarSign, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { NetSettlement } from '@/lib/games/settlement';
import { cn } from '@/lib/utils';

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
          className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background to-transparent pt-12 pb-4"
        >
          <div className="px-4 space-y-3">
            <div className="text-center mb-4">
              <h3 className="heading-md">Round Complete! 🎉</h3>
              <p className="text-sm text-muted-foreground">All 18 holes scored</p>
            </div>

            {/* Settlement Preview */}
            {settlements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setShowSettlements(!showSettlements)}
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-success" />
                    <span className="font-semibold text-sm">Settlement Preview</span>
                    <span className="text-xs text-muted-foreground">
                      ({settlements.length} payment{settlements.length > 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-success">${totalSettlementAmount.toFixed(0)}</span>
                    {showSettlements ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {showSettlements && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
                        {settlements.map((s, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{s.fromPlayerName.split(' ')[0]}</span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium">{s.toPlayerName.split(' ')[0]}</span>
                            </div>
                            <span className="font-bold text-primary tabular-nums">
                              ${s.amount.toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                onClick={onFinishRound}
                className="w-full py-6 text-lg font-bold rounded-xl"
                size="lg"
              >
                <Trophy className="w-5 h-5 mr-2" />
                Finish Round
              </Button>
            </motion.div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                onClick={onStartPlayoff}
                className="w-full py-6 text-lg font-bold rounded-xl border-2"
                size="lg"
              >
                <Swords className="w-5 h-5 mr-2" />
                Playoff Hole #1
              </Button>
            </motion.div>

            <button
              onClick={onContinue}
              className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Continue Scoring
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
