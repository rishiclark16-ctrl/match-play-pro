import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  gameCardBase,
  gameCardSelected,
  iconBoxClass,
  iconClass,
  springTransition,
  gameDetailPanel,
  stakeRow,
  stakeCurrency,
  stakeInput,
  stakeSuffix,
  ruleNote,
} from '../formatStepStyles';
import { ProLabel } from './ProLabel';

export interface NinesSectionProps {
  ninesEnabled: boolean;
  ninesStakes: string;
  playerCount: number;
  canUseGame: (game: string) => boolean;
  onNinesEnabledChange: (enabled: boolean) => void;
  onNinesStakesChange: (stakes: string) => void;
  onProFeatureBlock: (label: string) => void;
}

export function NinesSection({
  ninesEnabled, ninesStakes, playerCount,
  canUseGame,
  onNinesEnabledChange, onNinesStakesChange,
  onProFeatureBlock,
}: NinesSectionProps) {
  if (playerCount !== 3) return null;
  const allowed = canUseGame('nines');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 5 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => { if (allowed) onNinesEnabledChange(!ninesEnabled); else onProFeatureBlock('Nines'); }}
      className={cn(
        gameCardBase,
        ninesEnabled && allowed && gameCardSelected,
        !allowed && 'opacity-70'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={iconBoxClass(ninesEnabled && allowed, !allowed)}>
            <BarChart3 className={iconClass(ninesEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-semibold text-[16px] text-foreground flex items-center gap-2">
              Nines (5-3-1){!allowed && <ProLabel />}
            </p>
            <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">9 points split per hole · 3 players</p>
          </div>
        </div>
        <Switch
          checked={ninesEnabled}
          disabled={!allowed}
          onCheckedChange={(checked) => { if (allowed) onNinesEnabledChange(checked); else onProFeatureBlock('Nines'); }}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {ninesEnabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={springTransition}
          className={gameDetailPanel}
          onClick={e => e.stopPropagation()}
        >
          <div className={stakeRow}>
            <span className={stakeCurrency}>$</span>
            <Input
              type="number" placeholder="1" value={ninesStakes}
              onChange={e => onNinesStakesChange(e.target.value)}
              className={stakeInput}
              min={1}
            />
            <span className={stakeSuffix}>per point</span>
          </div>
          <div className={ruleNote}>
            Best: 5 · Mid: 3 · Worst: 1 · All tie: 3-3-3
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
