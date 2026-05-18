import { motion } from 'framer-motion';
import { Lock, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  gameCardBase,
  gameCardSelected,
  iconBoxClass,
  iconClass,
  springTransition,
} from '../formatStepStyles';
import { ProLabel } from './ProLabel';

interface PlayerRef { id: string; name: string }

export interface BestBallSectionProps {
  bestBallEnabled: boolean;
  playerCount: number;
  validPlayers: PlayerRef[];
  canUseGame: (game: string) => boolean;
  onBestBallEnabledChange: (enabled: boolean) => void;
  onProFeatureBlock: (label: string) => void;
}

export function BestBallSection({
  bestBallEnabled, playerCount, validPlayers,
  canUseGame,
  onBestBallEnabledChange,
  onProFeatureBlock,
}: BestBallSectionProps) {
  if (playerCount < 2) return null;
  const allowed = canUseGame('bestball');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 3 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => { if (allowed) onBestBallEnabledChange(!bestBallEnabled); else onProFeatureBlock('Best Ball'); }}
      className={cn(
        gameCardBase,
        bestBallEnabled && allowed && gameCardSelected,
        !allowed && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!allowed && <Lock className="w-4 h-4 text-muted-foreground" />}
          <div className={iconBoxClass(bestBallEnabled && allowed, !allowed)}>
            <Users className={iconClass(bestBallEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground flex items-center gap-2">
              Best Ball{!allowed && <ProLabel />}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {playerCount === 4 ? '2v2 team format' : 'Team format - best score counts'}
            </p>
          </div>
        </div>
        <Switch
          checked={bestBallEnabled}
          disabled={!allowed}
          onCheckedChange={(checked) => { if (allowed) onBestBallEnabledChange(checked); else onProFeatureBlock('Best Ball'); }}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {bestBallEnabled && playerCount === 4 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={springTransition}
          className="pt-3 mt-3 border-t border-border/50"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-xs text-muted-foreground mb-2">Teams auto-assigned:</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30">
              <p className="text-[10px] font-semibold text-[#22C55E] uppercase tracking-wide">Team 1</p>
              <p className="text-sm font-medium truncate">
                {validPlayers[0]?.name.split(' ')[0]} & {validPlayers[1]?.name.split(' ')[0]}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-foreground/5 border border-foreground/20">
              <p className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wide">Team 2</p>
              <p className="text-sm font-medium truncate">
                {validPlayers[2]?.name.split(' ')[0]} & {validPlayers[3]?.name.split(' ')[0]}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
