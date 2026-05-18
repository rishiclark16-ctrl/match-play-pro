import { motion } from 'framer-motion';
import { Lock, RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  gameCardBase,
  gameCardSelected,
  iconBoxClass,
  iconClass,
  springTransition,
} from '../formatStepStyles';
import { ProLabel } from './ProLabel';

export interface SixesSectionProps {
  sixesEnabled: boolean;
  sixesStakes: string;
  playerCount: number;
  canUseGame: (game: string) => boolean;
  onSixesEnabledChange: (enabled: boolean) => void;
  onSixesStakesChange: (stakes: string) => void;
  onProFeatureBlock: (label: string) => void;
}

export function SixesSection({
  sixesEnabled, sixesStakes, playerCount,
  canUseGame,
  onSixesEnabledChange, onSixesStakesChange,
  onProFeatureBlock,
}: SixesSectionProps) {
  if (playerCount !== 4) return null;
  const allowed = canUseGame('sixes');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 7 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => { if (allowed) onSixesEnabledChange(!sixesEnabled); else onProFeatureBlock('Sixes'); }}
      className={cn(
        gameCardBase,
        sixesEnabled && allowed && gameCardSelected,
        !allowed && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!allowed && <Lock className="w-4 h-4 text-muted-foreground" />}
          <div className={iconBoxClass(sixesEnabled && allowed, !allowed)}>
            <RotateCcw className={iconClass(sixesEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground flex items-center gap-2">
              Sixes (Round Robin){!allowed && <ProLabel />}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">3 rotating 2v2 segments · 6 holes each</p>
          </div>
        </div>
        <Switch
          checked={sixesEnabled}
          disabled={!allowed}
          onCheckedChange={(checked) => { if (allowed) onSixesEnabledChange(checked); else onProFeatureBlock('Sixes'); }}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {sixesEnabled && (
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
              type="number" placeholder="1" value={sixesStakes}
              onChange={e => onSixesStakesChange(e.target.value)}
              className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
              min={1}
            />
            <span className="text-sm text-muted-foreground">per point</span>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg font-mono">
            H1-6: AB vs CD · H7-12: AC vs BD · H13-18: AD vs BC
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
