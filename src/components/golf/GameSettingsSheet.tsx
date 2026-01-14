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
}

export function GameSettingsSheet({ round, onUpdateGames, playerCount }: GameSettingsSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
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
      <SheetTrigger asChild>
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center"
          aria-label="Game settings"
        >
          <Settings className="w-5 h-5" />
        </motion.button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Game Settings
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Skins */}
          <div className={cn(
            "p-4 rounded-xl border transition-all",
            skinsGame ? "border-primary/30 bg-primary/5" : "border-border"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold">Skins</h4>
                <p className="text-xs text-muted-foreground">Win hole outright to claim</p>
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
              />
            </div>
            
            {skinsGame && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 pt-3 border-t border-border/50"
              >
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-muted-foreground w-20">Stakes</Label>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={skinsGame.stakes}
                      onChange={(e) => updateGame('skins', { stakes: Number(e.target.value) || 0 })}
                      className="w-20 text-center"
                      min={0}
                    />
                    <span className="text-sm text-muted-foreground">/hole</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="skins-carryover"
                    checked={skinsGame.carryover ?? true}
                    onCheckedChange={(checked) => updateGame('skins', { carryover: checked === true })}
                  />
                  <Label htmlFor="skins-carryover" className="text-sm">Carryovers (ties roll over)</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="skins-net"
                    checked={skinsGame.useNet ?? false}
                    onCheckedChange={(checked) => updateGame('skins', { useNet: checked === true })}
                  />
                  <Label htmlFor="skins-net" className="text-sm">Net skins (use handicap strokes)</Label>
                </div>
              </motion.div>
            )}
          </div>
          
          {/* Nassau - only for 2 players */}
          {playerCount === 2 && (
            <div className={cn(
              "p-4 rounded-xl border transition-all",
              nassauGame ? "border-primary/30 bg-primary/5" : "border-border"
            )}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold">Nassau</h4>
                  <p className="text-xs text-muted-foreground">Front 9 + Back 9 + Overall</p>
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
                />
              </div>
              
              {nassauGame && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 pt-3 border-t border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <Label className="text-sm text-muted-foreground w-20">Stakes</Label>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={nassauGame.stakes}
                        onChange={(e) => updateGame('nassau', { stakes: Number(e.target.value) || 0 })}
                        className="w-20 text-center"
                        min={0}
                      />
                      <span className="text-sm text-muted-foreground">/bet</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="nassau-autopress"
                      checked={nassauGame.autoPress ?? false}
                      onCheckedChange={(checked) => updateGame('nassau', { autoPress: checked === true })}
                    />
                    <Label htmlFor="nassau-autopress" className="text-sm">Auto-press when 2 down</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="nassau-net"
                      checked={nassauGame.useNet ?? false}
                      onCheckedChange={(checked) => updateGame('nassau', { useNet: checked === true })}
                    />
                    <Label htmlFor="nassau-net" className="text-sm">Net Nassau (use handicap strokes)</Label>
                  </div>
                </motion.div>
              )}
            </div>
          )}
          
          {/* Stableford */}
          <div className={cn(
            "p-4 rounded-xl border transition-all",
            stablefordGame ? "border-primary/30 bg-primary/5" : "border-border"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold">Stableford</h4>
                <p className="text-xs text-muted-foreground">Points-based scoring</p>
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
              />
            </div>
            
            {stablefordGame && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 pt-3 border-t border-border/50"
              >
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                  🦅 Eagle: 4 pts • 🐦 Birdie: 3 pts • Par: 2 pts • Bogey: 1 pt
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="stableford-modified"
                    checked={stablefordGame.modifiedStableford ?? false}
                    onCheckedChange={(checked) => updateGame('stableford', { modifiedStableford: checked === true })}
                  />
                  <Label htmlFor="stableford-modified" className="text-sm">Modified (aggressive with negatives)</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="stableford-net"
                    checked={stablefordGame.useNet ?? false}
                    onCheckedChange={(checked) => updateGame('stableford', { useNet: checked === true })}
                  />
                  <Label htmlFor="stableford-net" className="text-sm">Net Stableford (use handicap strokes)</Label>
                </div>
              </motion.div>
            )}
          </div>
          
          {/* Best Ball - only for 4 players */}
          {playerCount >= 2 && (
            <div className={cn(
              "p-4 rounded-xl border transition-all",
              bestBallGame ? "border-primary/30 bg-primary/5" : "border-border"
            )}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold">Best Ball</h4>
                  <p className="text-xs text-muted-foreground">Team format - best score counts</p>
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
                />
              </div>
              
              {bestBallGame && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 pt-3 border-t border-border/50"
                >
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Teams will be auto-assigned based on player order
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="bestball-net"
                      checked={bestBallGame.useNet ?? false}
                      onCheckedChange={(checked) => updateGame('bestball', { useNet: checked === true })}
                    />
                    <Label htmlFor="bestball-net" className="text-sm">Net Best Ball (use handicap strokes)</Label>
                  </div>
                </motion.div>
              )}
            </div>
          )}
          
          {/* Wolf - only for 4 players */}
          {playerCount === 4 && (
            <div className={cn(
              "p-4 rounded-xl border transition-all",
              wolfGame ? "border-warning/30 bg-warning/5" : "border-border"
            )}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    <Crown className="w-4 h-4 text-warning" />
                    Wolf
                  </h4>
                  <p className="text-xs text-muted-foreground">Rotating captain picks partner or goes alone</p>
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
                />
              </div>
              
              {wolfGame && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 pt-3 border-t border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <Label className="text-sm text-muted-foreground w-20">Stakes</Label>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={wolfGame.stakes}
                        onChange={(e) => updateGame('wolf', { stakes: Number(e.target.value) || 0 })}
                        className="w-20 text-center"
                        min={0}
                      />
                      <span className="text-sm text-muted-foreground">/point</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="wolf-carryover"
                      checked={wolfGame.carryover ?? true}
                      onCheckedChange={(checked) => updateGame('wolf', { carryover: checked === true })}
                    />
                    <Label htmlFor="wolf-carryover" className="text-sm">Carryovers (pushes roll over)</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="wolf-net"
                      checked={wolfGame.useNet ?? false}
                      onCheckedChange={(checked) => updateGame('wolf', { useNet: checked === true })}
                    />
                    <Label htmlFor="wolf-net" className="text-sm">Net Wolf (use handicap strokes)</Label>
                  </div>
                  
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                    🐺 Lone Wolf: 3x points • ⚡ Blind Wolf: 6x points
                  </div>
                </motion.div>
              )}
            </div>
          )}
          
          <div className="p-4 rounded-xl border border-border bg-muted/20">
            <h4 className="font-semibold mb-3">Display Settings</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="show-net" defaultChecked />
                <Label htmlFor="show-net" className="text-sm">Show net scores on player cards</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="show-strokes" defaultChecked />
                <Label htmlFor="show-strokes" className="text-sm">Show stroke dots on holes</Label>
              </div>
            </div>
          </div>
        </div>
        
        <SheetFooter className="pt-4 border-t border-border/50">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="w-full"
          >
            {isSaving ? (
              'Saving...'
            ) : hasChanges ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </>
            ) : (
              'No Changes'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
