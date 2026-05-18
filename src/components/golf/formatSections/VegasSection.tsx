import { motion } from 'framer-motion';
import { Lock, Dice3 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  gameCardBase,
  gameCardSelected,
  iconBoxClass,
  iconClass,
  springTransition,
} from '../formatStepStyles';
import { ProLabel } from './ProLabel';

export interface VegasSectionProps {
  vegasEnabled: boolean;
  vegasStakes: string;
  vegasCarryover: boolean;
  playerCount: number;
  canUseGame: (game: string) => boolean;
  onVegasEnabledChange: (enabled: boolean) => void;
  onVegasStakesChange: (stakes: string) => void;
  onVegasCarryoverChange: (carryover: boolean) => void;
  onProFeatureBlock: (label: string) => void;
}

export function VegasSection({
  vegasEnabled, vegasStakes, vegasCarryover, playerCount,
  canUseGame,
  onVegasEnabledChange, onVegasStakesChange, onVegasCarryoverChange,
  onProFeatureBlock,
}: VegasSectionProps) {
  if (playerCount !== 4) return null;
  const allowed = canUseGame('vegas');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 5 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => { if (allowed) onVegasEnabledChange(!vegasEnabled); else onProFeatureBlock('Vegas'); }}
      className={cn(
        gameCardBase,
        vegasEnabled && allowed && gameCardSelected,
        !allowed && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!allowed && <Lock className="w-4 h-4 text-muted-foreground" />}
          <div className={iconBoxClass(vegasEnabled && allowed, !allowed)}>
            <Dice3 className={iconClass(vegasEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground flex items-center gap-2">
              Vegas{!allowed && <ProLabel />}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">2v2 paired scores · flips & doubles</p>
          </div>
        </div>
        <Switch
          checked={vegasEnabled}
          disabled={!allowed}
          onCheckedChange={(checked) => { if (allowed) onVegasEnabledChange(checked); else onProFeatureBlock('Vegas'); }}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {vegasEnabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={springTransition}
          className="pt-3 mt-3 border-t border-border/50 space-y-3"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">$</span>
            <Input
              type="number" placeholder="1" value={vegasStakes}
              onChange={e => onVegasStakesChange(e.target.value)}
              className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
              min={1}
            />
            <span className="text-sm text-muted-foreground">per point</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="vegascarryover" checked={vegasCarryover}
              className="w-4 h-4 rounded border-border"
              onCheckedChange={checked => onVegasCarryoverChange(checked === true)}
            />
            <label htmlFor="vegascarryover">Ties carry over (multiply next hole)</label>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg font-mono">
            Birdie flip · Eagle flip+2× · 10+ high digit first
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
