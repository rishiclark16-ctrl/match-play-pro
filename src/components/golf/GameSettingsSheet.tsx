import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, X, DollarSign, Check, AlertCircle, Crown } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Round, GameConfig, Team, generateId } from '@/types/golf';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { hapticSuccess } from '@/lib/haptics';

interface GameSettingsSheetProps {
  round: Round;
  onUpdateGames: (games: GameConfig[]) => Promise<void>;
  playerCount: number;
  // Optional controlled props for external trigger
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GameSettingsSheet({
  round,
  onUpdateGames,
  playerCount,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: GameSettingsSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Use controlled props if provided, otherwise use internal state
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? (controlledOnOpenChange || (() => { })) : setInternalOpen;

  // Local state for game settings
  const [games, setGames] = useState<GameConfig[]>(round.games || []);

  // Individual game states
  const skinsGame = games.find(g => g.type === 'skins');
  const nassauGame = games.find(g => g.type === 'nassau');
  const stablefordGame = games.find(g => g.type === 'stableford');
  const bestBallGame = games.find(g => g.type === 'bestball');
  const wolfGame = games.find(g => g.type === 'wolf');

  // Reset when sheet opens
  useEffect(() => {
    if (isOpen) {
      setGames(round.games || []);
      setHasChanges(false);
    }
  }, [isOpen, round.games]);

  const updateGame = (type: GameConfig['type'], updates: Partial<GameConfig> | null) => {
    setHasChanges(true);

    if (updates === null) {
      // Remove game
      setGames(games.filter(g => g.type !== type));
    } else {
      const existing = games.find(g => g.type === type);
      if (existing) {
        // Update existing
        setGames(games.map(g => g.type === type ? { ...g, ...updates } : g));
      } else {
        // Add new game
        const newGame: GameConfig = {
          id: generateId(),
          type,
          stakes: 0,
          ...updates,
        };
        setGames([...games, newGame]);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateGames(games);
      hapticSuccess();
      toast.success('Game settings updated');
      setIsOpen(false);
      setHasChanges(false);
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* Only render trigger when uncontrolled */}
      {!isControlled && (
        <SheetTrigger asChild>
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
            aria-label="Game settings"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        </SheetTrigger>
      )}

      <SheetContent side="bottom" className="h-[85vh] bg-[#F8F8F6] rounded-t-3xl p-0 border-0 [&>button]:hidden">
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4 mt-3" />

        {/* Header */}
        <div className="px-6 pb-3 flex items-center justify-between">
          <SheetTitle className="text-[20px] font-black tracking-[-0.04em] text-foreground">
            Game Settings
          </SheetTitle>
          <button
            onClick={() => setIsOpen(false)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Skins */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-6 overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3 border-b border-border/50">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-base">
                🎯
              </div>
              <div className="flex-1">
                <h4 className="font-black text-[16px] tracking-[-0.02em]">Skins</h4>
                <p className="text-[12px] text-muted-foreground">Win hole outright to claim</p>
              </div>
              <Switch
                checked={!!skinsGame}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateGame('skins', { stakes: 2, carryover: true, useNet: false });
                  } else {
                    updateGame('skins', null);
                  }
                }}
                className="data-[state=checked]:bg-[#22C55E]"
              />
            </div>

            {skinsGame && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="divide-y divide-border/40"
              >
                <div className="px-4 py-3 flex items-center justify-between">
                  <Label className="text-[14px] font-medium text-foreground">Stakes per hole</Label>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={skinsGame.stakes}
                      onChange={(e) => updateGame('skins', { stakes: Number(e.target.value) || 0 })}
                      className="bg-muted/50 rounded-xl border-0 py-2 px-3 text-foreground w-20 text-center font-bold"
                      min={0}
                    />
                  </div>
                </div>

                <div className="px-4 py-3 flex items-center justify-between">
                  <Label htmlFor="skins-carryover" className="text-[14px] font-medium text-foreground">
                    Carryovers
                    <span className="block text-[12px] text-muted-foreground font-normal">Ties roll over</span>
                  </Label>
                  <Checkbox
                    id="skins-carryover"
                    checked={skinsGame.carryover ?? true}
                    onCheckedChange={(checked) => updateGame('skins', { carryover: checked === true })}
                  />
                </div>

                <div className="px-4 py-3 flex items-center justify-between last:border-b-0">
                  <Label htmlFor="skins-net" className="text-[14px] font-medium text-foreground">
                    Net skins
                    <span className="block text-[12px] text-muted-foreground font-normal">Use handicap strokes</span>
                  </Label>
                  <Checkbox
                    id="skins-net"
                    checked={skinsGame.useNet ?? false}
                    onCheckedChange={(checked) => updateGame('skins', { useNet: checked === true })}
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Nassau - only for 2 players */}
          {playerCount === 2 && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-6 overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3 border-b border-border/50">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-base">
                  🏁
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-[16px] tracking-[-0.02em]">Nassau</h4>
                  <p className="text-[12px] text-muted-foreground">Front 9 + Back 9 + Overall</p>
                </div>
                <Switch
                  checked={!!nassauGame}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateGame('nassau', { stakes: 5, autoPress: false, useNet: false });
                    } else {
                      updateGame('nassau', null);
                    }
                  }}
                  className="data-[state=checked]:bg-[#22C55E]"
                />
              </div>

              {nassauGame && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="divide-y divide-border/40"
                >
                  <div className="px-4 py-3 flex items-center justify-between">
                    <Label className="text-[14px] font-medium text-foreground">Stakes per bet</Label>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={nassauGame.stakes}
                        onChange={(e) => updateGame('nassau', { stakes: Number(e.target.value) || 0 })}
                        className="bg-muted/50 rounded-xl border-0 py-2 px-3 text-foreground w-20 text-center font-bold"
                        min={0}
                      />
                    </div>
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between">
                    <Label htmlFor="nassau-autopress" className="text-[14px] font-medium text-foreground">
                      Auto-press
                      <span className="block text-[12px] text-muted-foreground font-normal">When 2 down</span>
                    </Label>
                    <Checkbox
                      id="nassau-autopress"
                      checked={nassauGame.autoPress ?? false}
                      onCheckedChange={(checked) => updateGame('nassau', { autoPress: checked === true })}
                    />
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between last:border-b-0">
                    <Label htmlFor="nassau-net" className="text-[14px] font-medium text-foreground">
                      Net Nassau
                      <span className="block text-[12px] text-muted-foreground font-normal">Use handicap strokes</span>
                    </Label>
                    <Checkbox
                      id="nassau-net"
                      checked={nassauGame.useNet ?? false}
                      onCheckedChange={(checked) => updateGame('nassau', { useNet: checked === true })}
                    />
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Stableford */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-6 overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3 border-b border-border/50">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-base">
                🏆
              </div>
              <div className="flex-1">
                <h4 className="font-black text-[16px] tracking-[-0.02em]">Stableford</h4>
                <p className="text-[12px] text-muted-foreground">Points-based scoring</p>
              </div>
              <Switch
                checked={!!stablefordGame}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateGame('stableford', { stakes: 0, modifiedStableford: false, useNet: false });
                  } else {
                    updateGame('stableford', null);
                  }
                }}
                className="data-[state=checked]:bg-[#22C55E]"
              />
            </div>

            {stablefordGame && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="divide-y divide-border/40"
              >
                <div className="px-4 py-3">
                  <p className="text-[12px] text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
                    Eagle: 4 pts · Birdie: 3 pts · Par: 2 pts · Bogey: 1 pt
                  </p>
                </div>

                <div className="px-4 py-3 flex items-center justify-between">
                  <Label htmlFor="stableford-modified" className="text-[14px] font-medium text-foreground">
                    Modified
                    <span className="block text-[12px] text-muted-foreground font-normal">Aggressive with negatives</span>
                  </Label>
                  <Checkbox
                    id="stableford-modified"
                    checked={stablefordGame.modifiedStableford ?? false}
                    onCheckedChange={(checked) => updateGame('stableford', { modifiedStableford: checked === true })}
                  />
                </div>

                <div className="px-4 py-3 flex items-center justify-between last:border-b-0">
                  <Label htmlFor="stableford-net" className="text-[14px] font-medium text-foreground">
                    Net Stableford
                    <span className="block text-[12px] text-muted-foreground font-normal">Use handicap strokes</span>
                  </Label>
                  <Checkbox
                    id="stableford-net"
                    checked={stablefordGame.useNet ?? false}
                    onCheckedChange={(checked) => updateGame('stableford', { useNet: checked === true })}
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Best Ball - only for 2+ players */}
          {playerCount >= 2 && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-6 overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3 border-b border-border/50">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-base">
                  ⛳
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-[16px] tracking-[-0.02em]">Best Ball</h4>
                  <p className="text-[12px] text-muted-foreground">Team format - best score counts</p>
                </div>
                <Switch
                  checked={!!bestBallGame}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateGame('bestball', { stakes: 0, teams: [], useNet: false });
                    } else {
                      updateGame('bestball', null);
                    }
                  }}
                  className="data-[state=checked]:bg-[#22C55E]"
                />
              </div>

              {bestBallGame && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="divide-y divide-border/40"
                >
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      Teams will be auto-assigned based on player order
                    </div>
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between last:border-b-0">
                    <Label htmlFor="bestball-net" className="text-[14px] font-medium text-foreground">
                      Net Best Ball
                      <span className="block text-[12px] text-muted-foreground font-normal">Use handicap strokes</span>
                    </Label>
                    <Checkbox
                      id="bestball-net"
                      checked={bestBallGame.useNet ?? false}
                      onCheckedChange={(checked) => updateGame('bestball', { useNet: checked === true })}
                    />
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Wolf - only for 4 players */}
          {playerCount === 4 && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-6 overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3 border-b border-border/50">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-base">
                  🐺
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-[16px] tracking-[-0.02em] flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    Wolf
                  </h4>
                  <p className="text-[12px] text-muted-foreground">Rotating captain picks partner or goes alone</p>
                </div>
                <Switch
                  checked={!!wolfGame}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateGame('wolf', { stakes: 2, carryover: true, useNet: false, blindWolfMultiplier: 2 });
                    } else {
                      updateGame('wolf', null);
                    }
                  }}
                  className="data-[state=checked]:bg-[#22C55E]"
                />
              </div>

              {wolfGame && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="divide-y divide-border/40"
                >
                  <div className="px-4 py-3 flex items-center justify-between">
                    <Label className="text-[14px] font-medium text-foreground">Stakes per point</Label>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={wolfGame.stakes}
                        onChange={(e) => updateGame('wolf', { stakes: Number(e.target.value) || 0 })}
                        className="bg-muted/50 rounded-xl border-0 py-2 px-3 text-foreground w-20 text-center font-bold"
                        min={0}
                      />
                    </div>
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between">
                    <Label htmlFor="wolf-carryover" className="text-[14px] font-medium text-foreground">
                      Carryovers
                      <span className="block text-[12px] text-muted-foreground font-normal">Pushes roll over</span>
                    </Label>
                    <Checkbox
                      id="wolf-carryover"
                      checked={wolfGame.carryover ?? true}
                      onCheckedChange={(checked) => updateGame('wolf', { carryover: checked === true })}
                    />
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between">
                    <Label htmlFor="wolf-net" className="text-[14px] font-medium text-foreground">
                      Net Wolf
                      <span className="block text-[12px] text-muted-foreground font-normal">Use handicap strokes</span>
                    </Label>
                    <Checkbox
                      id="wolf-net"
                      checked={wolfGame.useNet ?? false}
                      onCheckedChange={(checked) => updateGame('wolf', { useNet: checked === true })}
                    />
                  </div>

                  <div className="px-4 py-3 last:border-b-0">
                    <p className="text-[12px] text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
                      Lone Wolf: 3x points · Blind Wolf: 6x points
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Display Settings */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-6 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50">
              <h4 className="font-black text-[16px] tracking-[-0.02em]">Display Settings</h4>
            </div>
            <div className="divide-y divide-border/40">
              <div className="px-4 py-3 flex items-center justify-between">
                <Label htmlFor="show-net" className="text-[14px] font-medium text-foreground">
                  Net scores
                  <span className="block text-[12px] text-muted-foreground font-normal">Show on player cards</span>
                </Label>
                <Checkbox id="show-net" defaultChecked />
              </div>
              <div className="px-4 py-3 flex items-center justify-between last:border-b-0">
                <Label htmlFor="show-strokes" className="text-[14px] font-medium text-foreground">
                  Stroke dots
                  <span className="block text-[12px] text-muted-foreground font-normal">Show on holes</span>
                </Label>
                <Checkbox id="show-strokes" defaultChecked />
              </div>
            </div>
          </div>

          {/* Bottom padding for CTA */}
          <div className="h-2" />
        </div>

        {/* CTA Button */}
        <div className="px-6 pb-4 pt-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="w-full bg-foreground text-background rounded-2xl h-[52px] font-bold flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {isSaving ? (
              'Saving...'
            ) : hasChanges ? (
              <>
                <Check className="w-4 h-4" />
                Save Changes
              </>
            ) : (
              'No Changes'
            )}
          </motion.button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
