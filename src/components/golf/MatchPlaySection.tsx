import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  gameCardBase,
  gameCardSelected,
  iconBoxClass,
  iconClass,
  springTransition,
} from './formatStepStyles';

interface PlayerRef {
  id: string;
  name: string;
}

export interface MatchPlaySectionProps {
  matchPlay: boolean;
  matchPlayFormat: 'singles' | 'fourball';
  matchPlayTeamA: string[];
  matchPlayTeamB: string[];
  stakes: string;
  validPlayers: PlayerRef[];
  playerCount: number;
  onMatchPlayChange: (enabled: boolean) => void;
  onMatchPlayFormatChange: (format: 'singles' | 'fourball') => void;
  onMatchPlayTeamsChange: (teamA: string[], teamB: string[]) => void;
  onStakesChange: (stakes: string) => void;
  /** Optional motion delay multiplier (kept so sibling cards can stagger). */
  motionDelayIndex?: number;
}

export function MatchPlaySection({
  matchPlay,
  matchPlayFormat,
  matchPlayTeamA,
  matchPlayTeamB,
  stakes,
  validPlayers,
  playerCount,
  onMatchPlayChange,
  onMatchPlayFormatChange,
  onMatchPlayTeamsChange,
  onStakesChange,
  motionDelayIndex = 1,
}: MatchPlaySectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: motionDelayIndex * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onMatchPlayChange(!matchPlay)}
      className={cn(gameCardBase, matchPlay && gameCardSelected)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={iconBoxClass(matchPlay)}>
            <Swords className={iconClass(matchPlay)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Match Play</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Hole-by-hole competition</p>
          </div>
        </div>
        <Switch checked={matchPlay} onCheckedChange={onMatchPlayChange} onClick={e => e.stopPropagation()} />
      </div>

      {matchPlay && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={springTransition}
          className="pt-3 mt-3 border-t border-border/50 space-y-3"
          onClick={e => e.stopPropagation()}
        >
          {/* Format picker — show when 3-4 players */}
          {playerCount >= 3 && playerCount <= 4 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Format</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onMatchPlayFormatChange('singles')}
                  className={cn(
                    'p-2.5 rounded-xl border text-center transition-colors',
                    matchPlayFormat === 'singles'
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-muted/50 text-foreground'
                  )}
                >
                  <p className="text-xs font-bold">Singles</p>
                  <p className="text-[10px] text-inherit opacity-60 mt-0.5">1v1 head-to-head</p>
                </button>
                <button
                  type="button"
                  onClick={() => onMatchPlayFormatChange('fourball')}
                  className={cn(
                    'p-2.5 rounded-xl border text-center transition-colors',
                    matchPlayFormat === 'fourball'
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-muted/50 text-foreground'
                  )}
                >
                  <p className="text-xs font-bold">Fourball</p>
                  <p className="text-[10px] text-inherit opacity-60 mt-0.5">Best ball per team</p>
                </button>
              </div>
            </div>
          )}

          {/* Team assignment — fourball with 3-4 players */}
          {matchPlayFormat === 'fourball' && playerCount >= 3 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Teams</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 space-y-1.5">
                  <p className="text-[10px] font-semibold text-[#22C55E] uppercase tracking-wide">Team A</p>
                  {validPlayers.map(p => {
                    const isOnA = matchPlayTeamA.includes(p.id);
                    const isOnB = matchPlayTeamB.includes(p.id);
                    if (isOnB) return null;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (isOnA) {
                            onMatchPlayTeamsChange(matchPlayTeamA.filter(id => id !== p.id), matchPlayTeamB);
                          } else {
                            onMatchPlayTeamsChange(matchPlayTeamA.filter(id => id !== p.id), [...matchPlayTeamB, p.id]);
                          }
                        }}
                        className={cn(
                          'w-full text-left text-sm font-medium px-2 py-1 rounded-lg transition-colors',
                          isOnA ? 'bg-[#22C55E]/20 text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {p.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
                <div className="p-3 rounded-xl bg-foreground/5 border border-foreground/20 space-y-1.5">
                  <p className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wide">Team B</p>
                  {validPlayers.map(p => {
                    const isOnA = matchPlayTeamA.includes(p.id);
                    const isOnB = matchPlayTeamB.includes(p.id);
                    if (isOnA) return null;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (isOnB) {
                            onMatchPlayTeamsChange(matchPlayTeamA, matchPlayTeamB.filter(id => id !== p.id));
                          } else {
                            onMatchPlayTeamsChange([...matchPlayTeamA, p.id], matchPlayTeamB.filter(id => id !== p.id));
                          }
                        }}
                        className={cn(
                          'w-full text-left text-sm font-medium px-2 py-1 rounded-lg transition-colors',
                          isOnB ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {p.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">$</span>
            <Input
              type="number"
              placeholder="0"
              value={stakes}
              onChange={e => onStakesChange(e.target.value)}
              className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
              min={0}
            />
            <span className="text-sm text-muted-foreground">per match</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
