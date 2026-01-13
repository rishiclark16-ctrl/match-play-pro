import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Flame, Dices, Check, X, Trophy } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlayerWithScores, HoleInfo } from '@/types/golf';
import { PropBet, PROP_BET_TEMPLATES, getPropBetLabel, getPropBetIcon } from '@/types/betting';
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
        createdAt: new Date(data.created_at),
      };

      onPropBetAdded(newPropBet);
      hapticSuccess();
      toast.success(`${getPropBetLabel(selectedType)} added!`);
      
      // Reset form
      setSelectedType(null);
      setCustomDescription('');
    } catch (error) {
      console.error('Error creating prop bet:', error);
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

      const propBet = propBets.find(pb => pb.id === propBetId);
      if (propBet) {
        onPropBetUpdated({ ...propBet, winnerId });
      }

      const winner = players.find(p => p.id === winnerId);
      hapticSuccess();
      toast.success(`${winner?.name.split(' ')[0]} wins!`);
    } catch (error) {
      console.error('Error updating prop bet:', error);
      toast.error('Failed to update winner');
      hapticError();
    } finally {
      setSelectingWinner(null);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 bg-card/50"
        >
          <Dices className="w-4 h-4" />
          <span>Props</span>
          {currentHoleBets.length > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              {currentHoleBets.length}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Dices className="w-5 h-5 text-primary" />
            Prop Bets - Hole {currentHole}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(85vh-120px)]">
          {/* Active Bets */}
          {currentHoleBets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Active Bets</h3>
              
              {currentHoleBets.map(bet => (
                <motion.div
                  key={bet.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-4 rounded-xl border",
                    bet.winnerId 
                      ? "bg-success/10 border-success/30" 
                      : "bg-card border-border"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getPropBetIcon(bet.type)}</span>
                      <div>
                        <span className="font-semibold text-foreground">
                          {getPropBetLabel(bet.type)}
                        </span>
                        {bet.description && (
                          <p className="text-xs text-muted-foreground">{bet.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-success">${bet.stakes}</span>
                  </div>

                  {/* Winner Selection */}
                  {bet.winnerId ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-success/20">
                      <Trophy className="w-4 h-4 text-success" />
                      <span className="text-sm font-semibold text-success">
                        {players.find(p => p.id === bet.winnerId)?.name} wins!
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground">Select winner:</span>
                      <div className="flex flex-wrap gap-2">
                        {players.map(player => (
                          <Button
                            key={player.id}
                            variant="outline"
                            size="sm"
                            disabled={selectingWinner === bet.id}
                            onClick={() => handleSelectWinner(bet.id, player.id)}
                            className="gap-1"
                          >
                            {selectingWinner === bet.id ? (
                              <span className="animate-pulse">...</span>
                            ) : (
                              <>
                                <Check className="w-3 h-3" />
                                {player.name.split(' ')[0]}
                              </>
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* Add New Bet */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Add Side Bet</h3>

            {/* Bet Type Selection */}
            <div className="grid grid-cols-3 gap-2">
              {PROP_BET_TEMPLATES.map(template => {
                // Only show CTP on par 3s
                if (template.type === 'ctp' && !isPar3) return null;
                
                const isSelected = selectedType === template.type;
                
                return (
                  <motion.button
                    key={template.type}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedType(isSelected ? null : template.type);
                      hapticLight();
                    }}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all text-center",
                      isSelected 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl block mb-1">{template.icon}</span>
                    <span className="text-xs font-semibold">{template.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Stakes */}
            <AnimatePresence>
              {selectedType && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="stakes" className="text-sm">Stakes ($)</Label>
                    <Input
                      id="stakes"
                      type="number"
                      value={stakes}
                      onChange={(e) => setStakes(e.target.value)}
                      className="mt-1"
                      min="1"
                      step="1"
                    />
                  </div>

                  {selectedType === 'custom' && (
                    <div>
                      <Label htmlFor="description" className="text-sm">What's the bet?</Label>
                      <Textarea
                        id="description"
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder="e.g., First one to 3-putt..."
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleCreatePropBet}
                    disabled={isSaving || (selectedType === 'custom' && !customDescription)}
                    className="w-full gap-2"
                  >
                    {isSaving ? (
                      <span className="animate-pulse">Adding...</span>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add {getPropBetLabel(selectedType)}
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Tips */}
          {!selectedType && currentHoleBets.length === 0 && (
            <div className="p-4 rounded-xl bg-muted/30 border border-border">
              <h4 className="text-sm font-semibold text-foreground mb-2">💡 Side Bet Ideas</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
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
    </Sheet>
  );
}
