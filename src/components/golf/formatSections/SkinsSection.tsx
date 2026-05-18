import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ProBadge } from '@/components/subscription';
import { cn } from '@/lib/utils';
import {
  gameCardBase,
  gameCardSelected,
  iconBoxClass,
  iconClass,
  springTransition,
} from '../formatStepStyles';

export interface SkinsSectionProps {
  skinsEnabled: boolean;
  skinsStakes: string;
  skinsCarryover: boolean;
  canUseSkinsCarryover: () => boolean;
  onSkinsEnabledChange: (enabled: boolean) => void;
  onSkinsStakesChange: (stakes: string) => void;
  onSkinsCarryoverChange: (carryover: boolean) => void;
  onProFeatureBlock: (label: string) => void;
}

export function SkinsSection({
  skinsEnabled, skinsStakes, skinsCarryover,
  canUseSkinsCarryover,
  onSkinsEnabledChange, onSkinsStakesChange, onSkinsCarryoverChange,
  onProFeatureBlock,
}: SkinsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSkinsEnabledChange(!skinsEnabled)}
      className={cn(gameCardBase, skinsEnabled && gameCardSelected)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={iconBoxClass(skinsEnabled)}>
            <DollarSign className={iconClass(skinsEnabled)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Skins</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Win the hole outright to claim</p>
          </div>
        </div>
        <Switch checked={skinsEnabled} onCheckedChange={onSkinsEnabledChange} onClick={e => e.stopPropagation()} />
      </div>

      {skinsEnabled && (
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
              type="number" placeholder="2" value={skinsStakes}
              onChange={e => onSkinsStakesChange(e.target.value)}
              className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
              min={1}
            />
            <span className="text-sm text-muted-foreground">per hole</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="carryover"
              checked={skinsCarryover}
              disabled={!canUseSkinsCarryover()}
              className="w-4 h-4 rounded border-border"
              onCheckedChange={checked => {
                if (canUseSkinsCarryover()) onSkinsCarryoverChange(checked === true);
                else onProFeatureBlock('Skins Carryover');
              }}
            />
            <label
              htmlFor="carryover"
              className="flex items-center gap-2"
              onClick={() => { if (!canUseSkinsCarryover()) onProFeatureBlock('Skins Carryover'); }}
            >
              Carryovers (ties roll over)
              {!canUseSkinsCarryover() && <ProBadge size="sm" variant="subtle" />}
            </label>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
