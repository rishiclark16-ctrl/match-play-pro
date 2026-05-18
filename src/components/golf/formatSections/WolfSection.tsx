import { motion } from 'framer-motion';
import { Lock, Crown } from 'lucide-react';
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

export interface WolfSectionProps {
  wolfEnabled: boolean;
  wolfStakes: string;
  wolfCarryover: boolean;
  playerCount: number;
  canUseGame: (game: string) => boolean;
  onWolfEnabledChange: (enabled: boolean) => void;
  onWolfStakesChange: (stakes: string) => void;
  onWolfCarryoverChange: (carryover: boolean) => void;
  onProFeatureBlock: (label: string) => void;
}

export function WolfSection({
  wolfEnabled, wolfStakes, wolfCarryover, playerCount,
  canUseGame,
  onWolfEnabledChange, onWolfStakesChange, onWolfCarryoverChange,
  onProFeatureBlock,
}: WolfSectionProps) {
  if (playerCount !== 3 && playerCount !== 4) return null;
  const allowed = canUseGame('wolf');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 4 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => { if (allowed) onWolfEnabledChange(!wolfEnabled); else onProFeatureBlock('Wolf'); }}
      className={cn(
        gameCardBase,
        wolfEnabled && allowed && gameCardSelected,
        !allowed && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!allowed && <Lock className="w-4 h-4 text-muted-foreground" />}
          <div className={iconBoxClass(wolfEnabled && allowed, !allowed)}>
            <Crown className={iconClass(wolfEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground flex items-center gap-2">
              Wolf{!allowed && <ProLabel />}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {playerCount === 3 ? 'Rotating wolf vs. field' : 'Rotating captain picks partner'}
            </p>
          </div>
        </div>
        <Switch
          checked={wolfEnabled}
          disabled={!allowed}
          onCheckedChange={(checked) => { if (allowed) onWolfEnabledChange(checked); else onProFeatureBlock('Wolf'); }}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {wolfEnabled && (
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
              type="number" placeholder="2" value={wolfStakes}
              onChange={e => onWolfStakesChange(e.target.value)}
              className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
              min={1}
            />
            <span className="text-sm text-muted-foreground">per point</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="wolfcarryover" checked={wolfCarryover}
              className="w-4 h-4 rounded border-border"
              onCheckedChange={checked => onWolfCarryoverChange(checked === true)}
            />
            <label htmlFor="wolfcarryover">Carryovers (pushes roll over)</label>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg font-mono">
            Lone Wolf: 3x • Blind Wolf: 6x
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
