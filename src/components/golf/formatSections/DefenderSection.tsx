import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
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

export interface DefenderSectionProps {
  defenderEnabled: boolean;
  defenderStakes: string;
  playerCount: number;
  canUseGame: (game: string) => boolean;
  onDefenderEnabledChange: (enabled: boolean) => void;
  onDefenderStakesChange: (stakes: string) => void;
  onProFeatureBlock: (label: string) => void;
}

export function DefenderSection({
  defenderEnabled, defenderStakes, playerCount,
  canUseGame,
  onDefenderEnabledChange, onDefenderStakesChange,
  onProFeatureBlock,
}: DefenderSectionProps) {
  if (playerCount !== 3 && playerCount !== 4) return null;
  const allowed = canUseGame('defender');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 6 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => { if (allowed) onDefenderEnabledChange(!defenderEnabled); else onProFeatureBlock('Defender'); }}
      className={cn(
        gameCardBase,
        defenderEnabled && allowed && gameCardSelected,
        !allowed && 'opacity-70'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={iconBoxClass(defenderEnabled && allowed, !allowed)}>
            <Shield className={iconClass(defenderEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-semibold text-[16px] text-foreground flex items-center gap-2">
              Defender{!allowed && <ProLabel />}
            </p>
            <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">1 vs. field · rotating defender</p>
          </div>
        </div>
        <Switch
          checked={defenderEnabled}
          disabled={!allowed}
          onCheckedChange={(checked) => { if (allowed) onDefenderEnabledChange(checked); else onProFeatureBlock('Defender'); }}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {defenderEnabled && (
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
              type="number" placeholder="1" value={defenderStakes}
              onChange={e => onDefenderStakesChange(e.target.value)}
              className={stakeInput}
              min={1}
            />
            <span className={stakeSuffix}>per point</span>
          </div>
          <div className={ruleNote}>
            Defend: +3 win · +1 tie · Attackers: +1/+2 each
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
