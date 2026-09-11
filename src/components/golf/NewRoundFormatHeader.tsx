import { motion } from 'framer-motion';
import { Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildConfig, summarizeScoringConfig } from '@/engine/HouseGameEngine';
import type { ActivePrimitive } from '@/types/houseGame';

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
 * Renders the two cards that appear above `<FormatStep>`:
 *   - House Game active card (if `houseGame` is non-null)
 *   - Ghost Player card (if the ghost primitive is active)
 *
 * Pure layout / event component — state lives on the page.
 */
export function NewRoundFormatHeader({
  houseGame,
  houseGameEnabled,
  onToggleHouseGame,
  ghost,
}: NewRoundFormatHeaderProps) {
  return (
    <>
      {houseGame && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 mb-2"
        >
          <div className={cn(
            'rounded-2xl border-2 px-4 py-3 flex items-center gap-3 transition-colors',
            houseGameEnabled ? 'bg-[#0A0A0A] border-[#0A0A0A]' : 'bg-white border-border/40'
          )}>
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
              houseGameEnabled ? 'bg-[#F0EE3A]' : 'bg-muted'
            )}>
              <Sparkles className={cn('w-4 h-4', houseGameEnabled ? 'text-[#0A0A0A]' : 'text-muted-foreground')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-[13px] font-bold truncate', houseGameEnabled ? 'text-white' : 'text-foreground')}>
                {houseGame.name || 'House Game'}
              </p>
              {(() => {
                const cfg = buildConfig(houseGame.activePrimitives);
                const lines = summarizeScoringConfig(cfg, 2);
                return lines.length > 0 ? (
                  <p className={cn('text-[11px] truncate', houseGameEnabled ? 'text-white/50' : 'text-muted-foreground')}>
                    {lines.join(' · ')}
                  </p>
                ) : null;
              })()}
            </div>
            <button onClick={onToggleHouseGame} className="flex-shrink-0">
              {houseGameEnabled
                ? <ToggleRight className="w-7 h-7 text-[#F0EE3A]" />
                : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
            </button>
          </div>
          {houseGameEnabled && (
            <p className="text-[11px] text-muted-foreground text-center mt-1.5">
              House Game is active for this round
            </p>
          )}
        </motion.div>
      )}

      {ghost.active && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3"
        >
          <div className="bg-white rounded-2xl border-2 border-border/40 px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">👻</span>
              <p className="text-[13px] font-bold text-foreground">Ghost Player</p>
              <p className="text-[11px] text-muted-foreground">Scores net par every hole</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1">Name</p>
                <input
                  type="text"
                  value={ghost.name}
                  onChange={e => ghost.onNameChange(e.target.value)}
                  placeholder="Ghost"
                  className="w-full bg-muted rounded-xl px-3 py-2 text-[13px] font-bold text-foreground outline-none"
                />
              </div>
              <div className="w-28">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1">Handicap</p>
                <input
                  type="number"
                  value={ghost.handicap ?? ''}
                  onChange={e => ghost.onHandicapChange(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="0"
                  min="0"
                  max="54"
                  className="w-full bg-muted rounded-xl px-3 py-2 text-[13px] font-bold text-foreground outline-none"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
