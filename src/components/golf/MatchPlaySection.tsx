import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { MatchPayout, TeamScoring } from '@/types/golf';
import { DEFAULT_TEAM_MATCH, type TeamMatchOptions } from './teamMatchOptions';
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
  teamBoxA,
  teamBoxB,
  teamLabelA,
  teamLabelB,
} from './formatStepStyles';

const SCORING_CHOICES: { value: TeamScoring; label: string; hint: string }[] = [
  { value: 'best', label: 'Best ball', hint: 'Better score counts' },
  { value: 'aggregate', label: 'Low total', hint: 'Add both scores' },
  { value: 'best_and_aggregate', label: 'Both', hint: 'A point for each' },
];

const PAYOUT_CHOICES: { value: MatchPayout; label: string }[] = [
  { value: 'match', label: 'On the match' },
  { value: 'per_hole', label: 'Per hole up' },
];

function Choice({ selected, onClick, label, hint }: { selected: boolean; onClick: () => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'p-2.5 min-h-[56px] rounded-[14px] border text-center transition-colors',
        selected ? 'border-primary bg-primary text-white' : 'border-transparent bg-muted text-foreground',
      )}
    >
      <p className="text-[14px] font-bold leading-tight">{label}</p>
      {hint && <p className="text-[12px] text-inherit opacity-75 mt-0.5 leading-tight">{hint}</p>}
    </button>
  );
}

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
  /** Team match options; shown with the fourball format. */
  teamOptions?: TeamMatchOptions;
  onTeamOptionsChange?: (options: TeamMatchOptions) => void;
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
  teamOptions = DEFAULT_TEAM_MATCH,
  onTeamOptionsChange,
  motionDelayIndex = 1,
}: MatchPlaySectionProps) {
  const isTeam = matchPlayFormat === 'fourball' && playerCount >= 3;
  const stakeUnit = isTeam && teamOptions.matchPayout === 'per_hole'
    ? (teamOptions.teamScoring === 'best_and_aggregate' ? 'a point, a man' : 'a hole, a man')
    : isTeam ? 'a man' : 'per match';
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
            <p className="font-semibold text-[16px] text-foreground">Match Play</p>
            <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">Hole-by-hole competition</p>
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
          className={gameDetailPanel}
          onClick={e => e.stopPropagation()}
        >
          {/* Format picker — show when 3-4 players */}
          {playerCount >= 3 && playerCount <= 4 && (
            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-muted-foreground">Format</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onMatchPlayFormatChange('singles')}
                  className={cn(
                    'p-3 min-h-[56px] rounded-[14px] border text-center transition-colors',
                    matchPlayFormat === 'singles'
                      ? 'border-primary bg-primary text-white'
                      : 'border-transparent bg-muted text-foreground'
                  )}
                >
                  <p className="text-[14px] font-bold">Singles</p>
                  <p className="text-[12px] text-inherit opacity-75 mt-0.5">1v1 head-to-head</p>
                </button>
                <button
                  type="button"
                  onClick={() => onMatchPlayFormatChange('fourball')}
                  className={cn(
                    'p-3 min-h-[56px] rounded-[14px] border text-center transition-colors',
                    matchPlayFormat === 'fourball'
                      ? 'border-primary bg-primary text-white'
                      : 'border-transparent bg-muted text-foreground'
                  )}
                >
                  <p className="text-[14px] font-bold">Fourball</p>
                  <p className="text-[12px] text-inherit opacity-75 mt-0.5">Best ball per team</p>
                </button>
              </div>
            </div>
          )}

          {/* Team assignment — fourball with 3-4 players */}
          {matchPlayFormat === 'fourball' && playerCount >= 3 && (
            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-muted-foreground">Teams · tap to switch</p>
              <div className="grid grid-cols-2 gap-2">
                <div className={cn(teamBoxA, 'space-y-1')}>
                  <p className={teamLabelA}>Team A</p>
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
                          'w-full text-left text-[14px] font-semibold px-2.5 min-h-[40px] rounded-[10px] transition-colors',
                          isOnA ? 'bg-primary text-white' : 'text-muted-foreground'
                        )}
                      >
                        {p.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
                <div className={cn(teamBoxB, 'space-y-1')}>
                  <p className={teamLabelB}>Team B</p>
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
                          'w-full text-left text-[14px] font-semibold px-2.5 min-h-[40px] rounded-[10px] transition-colors',
                          isOnB ? 'bg-card text-foreground border border-border' : 'text-muted-foreground'
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

          {isTeam && onTeamOptionsChange && (
            <>
              <div className="space-y-2">
                <p className="text-[13px] font-semibold text-muted-foreground">Team score on each hole</p>
                <div className="grid grid-cols-3 gap-2">
                  {SCORING_CHOICES.map(c => (
                    <Choice key={c.value} selected={teamOptions.teamScoring === c.value} label={c.label} hint={c.hint}
                      onClick={() => onTeamOptionsChange({ ...teamOptions, teamScoring: c.value })} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[13px] font-semibold text-muted-foreground">Money</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYOUT_CHOICES.map(c => (
                    <Choice key={c.value} selected={teamOptions.matchPayout === c.value} label={c.label}
                      onClick={() => onTeamOptionsChange({ ...teamOptions, matchPayout: c.value })} />
                  ))}
                </div>
              </div>
            </>
          )}

          <div className={stakeRow}>
            <span className={stakeCurrency}>$</span>
            <Input
              type="number"
              placeholder="0"
              value={stakes}
              onChange={e => onStakesChange(e.target.value)}
              className={stakeInput}
              min={0}
            />
            <span className={stakeSuffix}>{stakeUnit}</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
