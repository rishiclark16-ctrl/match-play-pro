import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dog, Crown, Users, Zap, Check, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Player, Score } from '@/types/golf';
import { cn } from '@/lib/utils';
import { hapticMedium, hapticSuccess, hapticWarning } from '@/lib/haptics';

interface WolfSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  wolf: Player;
  hunters: Player[];
  currentHole: number;
  stakes: number;
  carryovers: number;
  onSelectPartner: (partnerId: string | null, isBlindWolf: boolean) => void;
  blindWolfAvailable: boolean;
}

const springTransition = { type: 'spring', stiffness: 300, damping: 28 };

export function WolfSelection({
  isOpen,
  onClose,
  wolf,
  hunters,
  currentHole,
  stakes,
  carryovers,
  onSelectPartner,
  blindWolfAvailable,
}: WolfSelectionProps) {
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [confirmingLoneWolf, setConfirmingLoneWolf] = useState(false);

  const baseValue = stakes * 4;
  const potValue = baseValue + (carryovers * baseValue);
  const loneWolfValue = potValue * 3; // 3 hunters
  const blindWolfValue = loneWolfValue * 2;

  const handleSelectHunter = (hunterId: string) => {
    hapticMedium();
    setSelectedPartner(hunterId);
    setConfirmingLoneWolf(false);
  };

  const handleLoneWolf = () => {
    hapticWarning();
    setSelectedPartner(null);
    setConfirmingLoneWolf(true);
  };

  const handleBlindWolf = () => {
    hapticWarning();
    onSelectPartner(null, true);
    onClose();
  };

  const handleConfirm = () => {
    hapticSuccess();
    onSelectPartner(selectedPartner, false);
    setSelectedPartner(null);
    setConfirmingLoneWolf(false);
    onClose();
  };

  const handleConfirmLoneWolf = () => {
    hapticSuccess();
    onSelectPartner(null, false);
    setSelectedPartner(null);
    setConfirmingLoneWolf(false);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] bg-[#F8F8F6] rounded-t-3xl p-0 border-0">
        {/* Handle */}
        <div className="w-10 h-1 bg-muted-foreground/25 rounded-full mx-auto mt-3 mb-2" />

        {/* Header */}
        <div className="px-5 pb-3 flex items-center gap-2">
          <Crown className="w-5 h-5 text-[#F0EE3A]" />
          <span className="text-lg font-black tracking-[-0.03em] text-foreground">
            {wolf.name.split(' ')[0]} is the Wolf
          </span>
        </div>

        <div className="pb-6">
          {/* Pot Info Card */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-5 mb-4 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Hole {currentHole} Stakes
            </p>
            <p className="text-2xl font-black text-foreground tabular-nums">${potValue}</p>
            {carryovers > 0 && (
              <p className="text-sm text-muted-foreground">
                +{carryovers} carryover{carryovers > 1 ? 's' : ''} included
              </p>
            )}
          </div>

          {/* Blind Wolf Option */}
          {blindWolfAvailable && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleBlindWolf}
              className="w-full rounded-2xl mx-5 mb-3 p-4 bg-gradient-to-r from-warning/20 to-danger/20 border-2 border-warning/50 flex items-center justify-between"
              style={{ width: 'calc(100% - 2.5rem)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-warning" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Blind Wolf!</p>
                  <p className="text-xs text-muted-foreground">Declare before anyone tees off</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-warning">${blindWolfValue}</p>
                <p className="text-xs text-muted-foreground">2x Lone Wolf</p>
              </div>
            </motion.button>
          )}

          {!blindWolfAvailable && (
            <>
              {/* "Choose a Partner" section label */}
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-5 mb-2">
                Choose a Partner
              </p>

              {/* Partner Buttons */}
              {hunters.map((hunter, index) => (
                <motion.button
                  key={hunter.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectHunter(hunter.id)}
                  className={cn(
                    "bg-white rounded-2xl border-2 mx-5 mb-2 p-4 flex items-center gap-3 w-[calc(100%-2.5rem)] transition-all",
                    selectedPartner === hunter.id
                      ? "border-foreground bg-muted/20 shadow-[0_0_0_1px_#0A0A0A]"
                      : "border-border"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-black text-base",
                    selectedPartner === hunter.id
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-foreground text-sm">{hunter.name}</p>
                    {hunter.handicap !== undefined && (
                      <p className="text-[11px] text-muted-foreground">
                        Handicap: {hunter.handicap}
                      </p>
                    )}
                  </div>
                  <AnimatePresence>
                    {selectedPartner === hunter.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={springTransition}
                      >
                        <Check className="w-5 h-5 text-[#22C55E]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}

              {/* Lone Wolf Button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleLoneWolf}
                className={cn(
                  "rounded-2xl mx-5 mb-2 p-4 flex items-center gap-3 w-[calc(100%-2.5rem)] border-2 transition-all",
                  confirmingLoneWolf
                    ? "bg-[#FFFBEB] border-[#F59E0B] shadow-[0_0_0_1px_#F59E0B]"
                    : "bg-[#FFFBEB] border-[#FDE68A]"
                )}
              >
                <Dog className="text-[#D97706] w-5 h-5" />
                <div className="text-left flex-1">
                  <p className="font-bold text-[#92400E]">Go Lone Wolf</p>
                  <p className="text-xs text-muted-foreground">1 vs 3 - Triple points!</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-[#D97706]">${loneWolfValue}</p>
                  <p className="text-xs text-muted-foreground">Win/Lose</p>
                </div>
              </motion.button>
            </>
          )}

          {/* Confirm Button */}
          <AnimatePresence>
            {(selectedPartner || confirmingLoneWolf) && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={springTransition}
                onClick={confirmingLoneWolf ? handleConfirmLoneWolf : handleConfirm}
                className="bg-foreground text-background rounded-2xl mx-5 mb-5 py-4 font-bold text-[15px] flex items-center justify-center gap-2 w-[calc(100%-2.5rem)]"
              >
                {confirmingLoneWolf ? (
                  <>
                    <Dog className="w-5 h-5" />
                    Confirm Lone Wolf
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5" />
                    Partner with {hunters.find(h => h.id === selectedPartner)?.name.split(' ')[0]}
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Compact Wolf indicator for the scorecard header
export function WolfIndicator({
  wolfName,
  currentHole,
  onTap,
  isDecisionPending,
}: {
  wolfName: string;
  currentHole: number;
  onTap?: () => void;
  isDecisionPending: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onTap}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
        isDecisionPending
          ? "bg-warning/20 text-warning border border-warning/50 animate-pulse"
          : "bg-muted/80 text-foreground"
      )}
    >
      <Crown className="w-4 h-4" />
      <span>{wolfName}</span>
      {isDecisionPending && (
        <span className="text-xs">Pick partner</span>
      )}
    </motion.button>
  );
}
