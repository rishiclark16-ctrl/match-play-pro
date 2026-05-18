import { motion } from 'framer-motion';
import { Lock, BarChart3 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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

export interface StablefordSectionProps {
  stablefordEnabled: boolean;
  stablefordModified: boolean;
  canUseGame: (game: string) => boolean;
  onStablefordEnabledChange: (enabled: boolean) => void;
  onStablefordModifiedChange: (modified: boolean) => void;
  onProFeatureBlock: (label: string) => void;
}

export function StablefordSection({
  stablefordEnabled, stablefordModified,
  canUseGame,
  onStablefordEnabledChange, onStablefordModifiedChange,
  onProFeatureBlock,
}: StablefordSectionProps) {
  const allowed = canUseGame('stableford');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => { if (allowed) onStablefordEnabledChange(!stablefordEnabled); else onProFeatureBlock('Stableford'); }}
      className={cn(
        gameCardBase,
        stablefordEnabled && allowed && gameCardSelected,
        !allowed && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!allowed && <Lock className="w-4 h-4 text-muted-foreground" />}
          <div className={iconBoxClass(stablefordEnabled && allowed, !allowed)}>
            <BarChart3 className={iconClass(stablefordEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground flex items-center gap-2">
              Stableford{!allowed && <ProLabel />}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Points-based scoring</p>
          </div>
        </div>
        <Switch
          checked={stablefordEnabled}
          disabled={!allowed}
          onCheckedChange={(checked) => { if (allowed) onStablefordEnabledChange(checked); else onProFeatureBlock('Stableford'); }}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {stablefordEnabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={springTransition}
          className="pt-3 mt-3 border-t border-border/50 space-y-3"
          onClick={e => e.stopPropagation()}
        >
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg font-mono">
            Eagle: 4 • Birdie: 3 • Par: 2 • Bogey: 1 • 2+: 0
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="modifiedStableford" checked={stablefordModified}
              className="w-4 h-4 rounded border-border"
              onCheckedChange={checked => onStablefordModifiedChange(checked === true)}
            />
            <label htmlFor="modifiedStableford">Modified (aggressive with negatives)</label>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
