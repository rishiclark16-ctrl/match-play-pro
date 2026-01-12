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
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center justify-center gap-2 text-xl">
            <Crown className="w-6 h-6 text-warning" />
            {wolf.name.split(' ')[0]} is the Wolf
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4 pb-6">
          {/* Pot Info */}
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <p className="text-sm text-muted-foreground">Hole {currentHole} Stakes</p>
            <p className="text-2xl font-bold text-primary">${potValue}</p>
            {carryovers > 0 && (
              <p className="text-xs text-warning">
                +{carryovers} carryover{carryovers > 1 ? 's' : ''} included
              </p>
            )}
          </div>
          
          {/* Blind Wolf Option */}
          {blindWolfAvailable && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleBlindWolf}
              className="w-full p-4 rounded-xl bg-gradient-to-r from-warning/20 to-danger/20 border-2 border-warning/50 flex items-center justify-between"
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
              {/* Partner Selection */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Choose a Partner
                </p>
                
                <div className="space-y-2">
                  {hunters.map((hunter, index) => (
                    <motion.button
                      key={hunter.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectHunter(hunter.id)}
                      className={cn(
                        "w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between",
                        selectedPartner === hunter.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                          selectedPartner === hunter.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {index + 1}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">{hunter.name}</p>
                          {hunter.handicap !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              Handicap: {hunter.handicap}
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedPartner === hunter.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
              
              {/* Lone Wolf Option */}
              <div className="pt-2 border-t border-border/50">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLoneWolf}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between",
                    confirmingLoneWolf
                      ? "border-warning bg-warning/10"
                      : "border-border bg-card hover:border-warning/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      confirmingLoneWolf
                        ? "bg-warning text-warning-foreground"
                        : "bg-muted"
                    )}>
                      <Dog className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Go Lone Wolf</p>
                      <p className="text-xs text-muted-foreground">1 vs 3 - Triple points!</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-bold",
                      confirmingLoneWolf ? "text-warning" : "text-muted-foreground"
                    )}>
                      ${loneWolfValue}
                    </p>
                    <p className="text-xs text-muted-foreground">Win/Lose</p>
                  </div>
                </motion.button>
              </div>
            </>
          )}
          
          {/* Confirm Button */}
          {(selectedPartner || confirmingLoneWolf) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-4"
            >
              <Button
                onClick={confirmingLoneWolf ? handleConfirmLoneWolf : handleConfirm}
                className={cn(
                  "w-full py-6 text-lg font-semibold",
                  confirmingLoneWolf && "bg-warning hover:bg-warning/90 text-warning-foreground"
                )}
              >
                {confirmingLoneWolf ? (
                  <>
                    <Dog className="w-5 h-5 mr-2" />
                    Confirm Lone Wolf
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5 mr-2" />
                    Partner with {hunters.find(h => h.id === selectedPartner)?.name.split(' ')[0]}
                  </>
                )}
              </Button>
            </motion.div>
          )}
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
