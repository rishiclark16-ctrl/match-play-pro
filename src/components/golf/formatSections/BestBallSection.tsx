import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  gameCardBase,
  gameCardSelected,
  iconBoxClass,
  iconClass,
  springTransition,
  gameDetailPanel,
  teamBoxA,
  teamBoxB,
  teamLabelA,
  teamLabelB,
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
        !allowed && 'opacity-70'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={iconBoxClass(bestBallEnabled && allowed, !allowed)}>
            <Users className={iconClass(bestBallEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-semibold text-[16px] text-foreground flex items-center gap-2">
              Best Ball{!allowed && <ProLabel />}
            </p>
            <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
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
          className={gameDetailPanel}
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[13px] text-muted-foreground mb-2">Teams auto-assigned</p>
          <div className="grid grid-cols-2 gap-2">
            <div className={teamBoxA}>
              <p className={teamLabelA}>Team 1</p>
              <p className="text-[15px] font-semibold text-foreground truncate mt-0.5">
                {validPlayers[0]?.name.split(' ')[0]} & {validPlayers[1]?.name.split(' ')[0]}
              </p>
            </div>
            <div className={teamBoxB}>
              <p className={teamLabelB}>Team 2</p>
              <p className="text-[15px] font-semibold text-foreground truncate mt-0.5">
                {validPlayers[2]?.name.split(' ')[0]} & {validPlayers[3]?.name.split(' ')[0]}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
