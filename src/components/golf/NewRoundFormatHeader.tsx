import { motion } from 'framer-motion';
import { Ghost, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { buildConfig, summarizeScoringConfig } from '@/engine/HouseGameEngine';
import type { ActivePrimitive } from '@/types/houseGame';
import { fdCard, fdInput } from './setupStyles';

interface HouseGameLike {
  name?: string;
  activePrimitives: ActivePrimitive[];
}

interface NewRoundFormatHeaderProps {
  /** The active house game (if the selected group has one configured). */
  houseGame: HouseGameLike | null | undefined;
  houseGameEnabled: boolean;
  onToggleHouseGame: () => void;
  /** Ghost player config — `active` controls visibility; `name`/`handicap` are inputs. */
  ghost: {
    active: boolean;
    name: string;
    handicap: number | undefined;
    onNameChange: (name: string) => void;
    onHandicapChange: (h: number | undefined) => void;
  };
}

/**
 * Renders the cards that appear above `<FormatStep>`:
 *   - Group house game row (if `houseGame` is non-null)
 *   - Ghost player card (if the ghost primitive is active)
 *
 * Pure layout / event component — state lives on the page.
 */
export function NewRoundFormatHeader({
  houseGame,
  houseGameEnabled,
  onToggleHouseGame,
  ghost,
}: NewRoundFormatHeaderProps) {
  const lines = houseGame ? summarizeScoringConfig(buildConfig(houseGame.activePrimitives), 2) : [];

  return (
    <>
      {houseGame && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 mb-2"
        >
          <div
            onClick={onToggleHouseGame}
            className={cn(
              fdCard,
              'p-4 flex items-center gap-3 cursor-pointer transition-colors',
              houseGameEnabled && 'border-primary ring-1 ring-primary'
            )}
          >
            <div className={cn(
              'w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0',
              houseGameEnabled ? 'bg-primary' : 'bg-muted'
            )}>
              <Sparkles className={cn('w-5 h-5', houseGameEnabled ? 'text-gold' : 'text-muted-foreground')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-muted-foreground">Group house game</p>
              <p className="text-[16px] font-semibold text-foreground truncate">{houseGame.name || 'House Game'}</p>
              {lines.length > 0 && (
                <p className="text-[13px] text-muted-foreground truncate">{lines.join(' · ')}</p>
              )}
            </div>
            <Switch
              checked={houseGameEnabled}
              onCheckedChange={onToggleHouseGame}
              onClick={e => e.stopPropagation()}
              aria-label="Use house game"
            />
          </div>
          {houseGameEnabled && (
            <p className="text-[13px] text-muted-foreground text-center mt-1.5">
              House Game is active for this round
            </p>
          )}
        </motion.div>
      )}

      {ghost.active && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 mt-2"
        >
          <div className={cn(fdCard, 'p-4')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-[14px] bg-muted flex items-center justify-center flex-shrink-0">
                <Ghost className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-[16px] font-semibold text-foreground">Ghost player</p>
                <p className="text-[13px] text-muted-foreground">Scores net par every hole</p>
              </div>
            </div>
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="block text-[13px] font-semibold text-muted-foreground mb-1.5 px-1">Name</span>
                <input
                  type="text"
                  value={ghost.name}
                  onChange={e => ghost.onNameChange(e.target.value)}
                  placeholder="Ghost"
                  className={fdInput}
                />
              </label>
              <label className="w-28">
                <span className="block text-[13px] font-semibold text-muted-foreground mb-1.5 px-1">Handicap</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={ghost.handicap ?? ''}
                  onChange={e => ghost.onHandicapChange(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="0"
                  min="0"
                  max="54"
                  className={cn(fdInput, 'text-center tabular-nums')}
                />
              </label>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
