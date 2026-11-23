import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
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
  gameDetailPanel,
  stakeRow,
  stakeCurrency,
  stakeInput,
  stakeSuffix,
  optionRow,
  optionCheckbox,
  ruleNote,
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
        !allowed && 'opacity-70'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={iconBoxClass(wolfEnabled && allowed, !allowed)}>
            <Crown className={iconClass(wolfEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-semibold text-[16px] text-foreground flex items-center gap-2">
              Wolf{!allowed && <ProLabel />}
            </p>
            <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
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
          className={gameDetailPanel}
          onClick={e => e.stopPropagation()}
        >
          <div className={stakeRow}>
            <span className={stakeCurrency}>$</span>
            <Input
              type="number" placeholder="2" value={wolfStakes}
              onChange={e => onWolfStakesChange(e.target.value)}
              className={stakeInput}
              min={1}
            />
            <span className={stakeSuffix}>per point</span>
          </div>
          <div className={optionRow}>
            <Checkbox
              id="wolfcarryover" checked={wolfCarryover}
              className={optionCheckbox}
              onCheckedChange={checked => onWolfCarryoverChange(checked === true)}
            />
            <label htmlFor="wolfcarryover">Carryovers (pushes roll over)</label>
          </div>
          <div className={ruleNote}>
            Lone Wolf: 3x • Blind Wolf: 6x
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
