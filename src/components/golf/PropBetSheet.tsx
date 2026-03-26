import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Flame, Dices, Check, X, Trophy } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlayerWithScores, HoleInfo } from '@/types/golf';
import { PropBet, PROP_BET_TEMPLATES, getPropBetLabel, getPropBetIcon } from '@/types/betting';
import { PropBetCelebration } from './PropBetCelebration';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface PropBetSheetProps {
  roundId: string;
  players: PlayerWithScores[];
  currentHole: number;
  holeInfo: HoleInfo[];
  propBets: PropBet[];
  onPropBetAdded: (propBet: PropBet) => void;
  onPropBetUpdated: (propBet: PropBet) => void;
}

export function PropBetSheet({
  roundId,
  players,
  currentHole,
  holeInfo,
  propBets,
  onPropBetAdded,
  onPropBetUpdated,
}: PropBetSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<PropBet['type'] | null>(null);
  const [stakes, setStakes] = useState('5');
  const [customDescription, setCustomDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectingWinner, setSelectingWinner] = useState<string | null>(null);

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    winnerName: string;
    betType: string;
    amount: number;
  } | null>(null);

  // Filter prop bets for current hole
  const currentHoleBets = propBets.filter(pb => pb.holeNumber === currentHole);
  const currentHoleInfo = holeInfo.find(h => h.number === currentHole);
  const isPar3 = currentHoleInfo?.par === 3;

  const handleCreatePropBet = async () => {
    if (!selectedType) return;

    setIsSaving(true);
    hapticLight();

    try {
      const { data, error } = await supabase
        .from('prop_bets')
        .insert({
          round_id: roundId,
          type: selectedType,
          hole_number: currentHole,
          stakes: parseFloat(stakes) || 5,
          description: selectedType === 'custom' ? customDescription : undefined,
        })
        .select()
        .single();

      if (error) throw error;

      const newPropBet: PropBet = {
        id: data.id,
        roundId: data.round_id,
        type: data.type as PropBet['type'],
        holeNumber: data.hole_number,
        stakes: data.stakes,
        description: data.description,
        winnerId: data.winner_id,
        createdBy: data.created_by,
        createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      };

      // Don't call onPropBetAdded - realtime subscription handles it
      hapticSuccess();
      toast.success(`${getPropBetLabel(selectedType)} added!`);

      // Reset form
      setSelectedType(null);
      setCustomDescription('');
    } catch (error) {
      // Error handled by toast
      toast.error('Failed to create prop bet');
      hapticError();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectWinner = async (propBetId: string, winnerId: string) => {
    setSelectingWinner(propBetId);
    hapticMedium();

    try {
      const { error } = await supabase
        .from('prop_bets')
        .update({ winner_id: winnerId })
        .eq('id', propBetId);

      if (error) throw error;

      // Find the bet and winner details
      const bet = currentHoleBets.find(b => b.id === propBetId);
      const winner = players.find(p => p.id === winnerId);

      // Don't call onPropBetUpdated - realtime subscription handles it
      hapticSuccess();

      // Trigger celebration animation
      if (winner && bet) {
        setCelebrationData({
          winnerName: winner.name,
          betType: bet.type,
          amount: bet.stakes,
        });
        setShowCelebration(true);
      } else {
        toast.success(`${winner?.name.split(' ')[0]} wins!`);
      }
    } catch (error) {
      // Error handled by toast
      toast.error('Failed to update winner');
      hapticError();
    } finally {
      setSelectingWinner(null);
    }
  };

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false);
    setCelebrationData(null);
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 bg-card px-4 h-12 min-h-[48px] rounded-xl text-sm font-semibold shadow-sm touch-manipulation border-border"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Dices className="w-5 h-5" />
          <span className="hidden xs:inline">Props</span>
          {currentHoleBets.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
              {currentHoleBets.length}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[85vh] bg-[#F8F8F6] rounded-t-3xl p-0 border-0 [&>button]:hidden">
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4 mt-3" />

        {/* Header */}
        <div className="px-6 pb-3 flex items-center justify-between">
          <div>
            <SheetTitle className="text-[20px] font-black tracking-[-0.04em] text-foreground">
              Prop Bets
            </SheetTitle>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Hole {currentHole}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto max-h-[calc(85vh-120px)]">
          {/* Active Bets */}
          {currentHoleBets.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-6">
                Active Bets
              </p>

              {currentHoleBets.map((bet, index) => (
                <motion.div
                  key={bet.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-6 overflow-hidden",
                    bet.winnerId ? "bg-[#F0FFF4]" : ""
                  )}
                >
                  {/* Bet header row */}
                  <div className="px-4 py-3 flex items-center justify-between border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-sm">
                        <span>{getPropBetIcon(bet.type)}</span>
                      </div>
                      <div>
                        <span className="font-bold text-foreground text-[15px]">
                          {getPropBetLabel(bet.type)}
                        </span>
                        {bet.description && (
                          <p className="text-[12px] text-muted-foreground">{bet.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[#22C55E] font-black tabular-nums">${bet.stakes}</span>
                  </div>

                  {/* Winner Selection */}
                  <div className="px-4 py-3">
                    {bet.winnerId ? (
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-[#22C55E]" />
                        <span className="text-sm text-[#22C55E] font-bold">
                          {players.find(p => p.id === bet.winnerId)?.name} wins!
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                          Select winner:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {players.map(player => (
                            <motion.button
                              key={player.id}
                              whileTap={{ scale: 0.97 }}
                              disabled={selectingWinner === bet.id}
                              onClick={() => handleSelectWinner(bet.id, player.id)}
                              className="bg-muted rounded-xl px-3 py-2 text-sm font-medium text-foreground"
                            >
                              {selectingWinner === bet.id ? (
                                <span className="animate-pulse">...</span>
                              ) : (
                                player.name.split(' ')[0]
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Add New Bet */}
          <div className="space-y-3 px-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Add Side Bet
            </p>

            {/* Standard Bets */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
                Standard
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PROP_BET_TEMPLATES.filter(t => t.category === 'standard').map(template => {
                  // Only show CTP and Greenie on par 3s
                  if ((template.type === 'ctp' || template.type === 'greenie') && !isPar3) return null;

                  const isSelected = selectedType === template.type;

                  return (
                    <motion.button
                      key={template.type}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setSelectedType(isSelected ? null : template.type);
                        hapticLight();
                      }}
                      className={cn(
                        "p-3 rounded-2xl transition-all text-center",
                        isSelected
                          ? "bg-foreground text-background"
                          : "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                      )}
                    >
                      <span className="text-2xl block mb-1">{template.icon}</span>
                      <span className={cn(
                        "text-xs font-semibold",
                        isSelected ? "text-background" : "text-foreground"
                      )}>{template.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Junk/Save Bets */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
                Junk / Saves
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PROP_BET_TEMPLATES.filter(t => t.category === 'junk').map(template => {
                  const isSelected = selectedType === template.type;

                  return (
                    <motion.button
                      key={template.type}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setSelectedType(isSelected ? null : template.type);
                        hapticLight();
                      }}
                      className={cn(
                        "p-3 rounded-2xl transition-all text-center",
                        isSelected
                          ? "bg-foreground text-background"
                          : "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                      )}
                    >
                      <span className="text-2xl block mb-1">{template.icon}</span>
                      <span className={cn(
                        "text-xs font-semibold",
                        isSelected ? "text-background" : "text-foreground"
                      )}>{template.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Negative Bets & Custom */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
                Penalty / Custom
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PROP_BET_TEMPLATES.filter(t => t.category === 'negative' || t.category === 'custom').map(template => {
                  const isSelected = selectedType === template.type;

                  return (
                    <motion.button
                      key={template.type}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setSelectedType(isSelected ? null : template.type);
                        hapticLight();
                      }}
                      className={cn(
                        "p-3 rounded-2xl transition-all text-center",
                        isSelected
                          ? "bg-foreground text-background"
                          : "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                      )}
                    >
                      <span className="text-2xl block mb-1">{template.icon}</span>
                      <span className={cn(
                        "text-xs font-semibold",
                        isSelected ? "text-background" : "text-foreground"
                      )}>{template.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Stakes */}
            <AnimatePresence>
              {selectedType && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div>
                    <Label htmlFor="stakes" className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      Stakes ($)
                    </Label>
                    <Input
                      id="stakes"
                      type="number"
                      value={stakes}
                      onChange={(e) => setStakes(e.target.value)}
                      className="mt-1 bg-muted/50 rounded-xl border-0 py-3 px-4 text-foreground"
                      min="1"
                      step="1"
                    />
                  </div>

                  {selectedType === 'custom' && (
                    <div>
                      <Label htmlFor="description" className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                        What's the bet?
                      </Label>
                      <Textarea
                        id="description"
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder="e.g., First one to 3-putt..."
                        className="mt-1 bg-muted/50 rounded-xl border-0 py-3 px-4 text-foreground"
                        rows={2}
                      />
                    </div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCreatePropBet}
                    disabled={isSaving || (selectedType === 'custom' && !customDescription)}
                    className="w-full bg-foreground text-background rounded-2xl h-[52px] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <span className="animate-pulse">Adding...</span>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add {getPropBetLabel(selectedType)}
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Tips */}
          {!selectedType && currentHoleBets.length === 0 && (
            <div className="mx-6 p-4 rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <h4 className="text-[14px] font-bold text-foreground mb-2">Side Bet Ideas</h4>
              <ul className="text-[12px] text-muted-foreground space-y-1">
                {isPar3 && <li>• Closest to the pin</li>}
                <li>• Longest drive</li>
                <li>• First to make birdie</li>
                <li>• First to 3-putt</li>
                <li>• Sand save challenge</li>
              </ul>
            </div>
          )}
        </div>
      </SheetContent>

      {/* Winner Celebration Animation */}
      {celebrationData && (
        <PropBetCelebration
          isVisible={showCelebration}
          winnerName={celebrationData.winnerName}
          betType={celebrationData.betType}
          amount={celebrationData.amount}
          onComplete={handleCelebrationComplete}
        />
      )}
    </Sheet>
  );
}
