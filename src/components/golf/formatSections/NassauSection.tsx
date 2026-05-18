import { motion } from 'framer-motion';
import { Lock, Trophy } from 'lucide-react';
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

export interface NassauSectionProps {
  nassauEnabled: boolean;
  nassauStakes: string;
  nassauAutoPress: boolean;
  canUseGame: (game: string) => boolean;
  onNassauEnabledChange: (enabled: boolean) => void;
  onNassauStakesChange: (stakes: string) => void;
  onNassauAutoPressChange: (autoPress: boolean) => void;
  onProFeatureBlock: (label: string) => void;
}

export function NassauSection({
  nassauEnabled, nassauStakes, nassauAutoPress,
  canUseGame,
  onNassauEnabledChange, onNassauStakesChange, onNassauAutoPressChange,
  onProFeatureBlock,
}: NassauSectionProps) {
  const allowed = canUseGame('nassau');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => { if (allowed) onNassauEnabledChange(!nassauEnabled); else onProFeatureBlock('Nassau'); }}
      className={cn(
        gameCardBase,
        nassauEnabled && allowed && gameCardSelected,
        !allowed && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!allowed && <Lock className="w-4 h-4 text-muted-foreground" />}
          <div className={iconBoxClass(nassauEnabled && allowed, !allowed)}>
            <Trophy className={iconClass(nassauEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground flex items-center gap-2">
              Nassau{!allowed && <ProLabel />}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Front 9 + Back 9 + Overall</p>
          </div>
        </div>
        <Switch
          checked={nassauEnabled}
          disabled={!allowed}
          onCheckedChange={(checked) => { if (allowed) onNassauEnabledChange(checked); else onProFeatureBlock('Nassau'); }}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {nassauEnabled && (
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
              type="number" placeholder="5" value={nassauStakes}
              onChange={e => onNassauStakesChange(e.target.value)}
              className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
              min={1}
            />
            <span className="text-sm text-muted-foreground">per bet</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="autopress" checked={nassauAutoPress}
              className="w-4 h-4 rounded border-border"
              onCheckedChange={checked => onNassauAutoPressChange(checked === true)}
            />
            <label htmlFor="autopress">Auto-press when 2 down</label>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
