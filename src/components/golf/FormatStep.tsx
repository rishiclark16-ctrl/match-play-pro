import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Flag, Swords, DollarSign, Trophy, BarChart3, Users, Crown, Sparkles, ToggleLeft, ToggleRight, Plus, Dice3, Shield, RotateCcw, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useSubscription } from '@/hooks/useSubscription';
import { ProBadge, PaywallModal } from '@/components/subscription';
import { cn } from '@/lib/utils';
import { PersonalGameFormat } from '@/types/houseGame';
import { buildConfig, summarizeScoringConfig } from '@/engine/HouseGameEngine';
import { UseThisGameButton } from './UseThisGameButton';
import { hapticLight } from '@/lib/haptics';

interface PlayerData {
  id: string;
  name: string;
  handicap?: number;
  manualStrokes?: number;
}

interface FormatStepProps {
  players: PlayerData[];
  // Scoring format
  strokePlay: boolean;
  matchPlay: boolean;
  matchPlayFormat: 'singles' | 'fourball';
  matchPlayTeamA: string[];
  matchPlayTeamB: string[];
  stakes: string;
  onStrokePlayChange: (enabled: boolean) => void;
  onMatchPlayChange: (enabled: boolean) => void;
  onMatchPlayFormatChange: (format: 'singles' | 'fourball') => void;
  onMatchPlayTeamsChange: (teamA: string[], teamB: string[]) => void;
  onStakesChange: (stakes: string) => void;
  // Skins
  skinsEnabled: boolean;
  skinsStakes: string;
  skinsCarryover: boolean;
  onSkinsEnabledChange: (enabled: boolean) => void;
  onSkinsStakesChange: (stakes: string) => void;
  onSkinsCarryoverChange: (carryover: boolean) => void;
  // Nassau
  nassauEnabled: boolean;
  nassauStakes: string;
  nassauAutoPress: boolean;
  onNassauEnabledChange: (enabled: boolean) => void;
  onNassauStakesChange: (stakes: string) => void;
  onNassauAutoPressChange: (autoPress: boolean) => void;
  // Stableford
  stablefordEnabled: boolean;
  stablefordModified: boolean;
  onStablefordEnabledChange: (enabled: boolean) => void;
  onStablefordModifiedChange: (modified: boolean) => void;
  // Best Ball
  bestBallEnabled: boolean;
  onBestBallEnabledChange: (enabled: boolean) => void;
  // Wolf
  wolfEnabled: boolean;
  wolfStakes: string;
  wolfCarryover: boolean;
  onWolfEnabledChange: (enabled: boolean) => void;
  onWolfStakesChange: (stakes: string) => void;
  onWolfCarryoverChange: (carryover: boolean) => void;
  // Vegas
  vegasEnabled: boolean;
  vegasStakes: string;
  vegasCarryover: boolean;
  onVegasEnabledChange: (enabled: boolean) => void;
  onVegasStakesChange: (stakes: string) => void;
  onVegasCarryoverChange: (carryover: boolean) => void;
  // Nines (5-3-1)
  ninesEnabled: boolean;
  ninesStakes: string;
  onNinesEnabledChange: (enabled: boolean) => void;
  onNinesStakesChange: (stakes: string) => void;
  // Defender
  defenderEnabled: boolean;
  defenderStakes: string;
  onDefenderEnabledChange: (enabled: boolean) => void;
  onDefenderStakesChange: (stakes: string) => void;
  // Sixes
  sixesEnabled: boolean;
  sixesStakes: string;
  onSixesEnabledChange: (enabled: boolean) => void;
  onSixesStakesChange: (stakes: string) => void;
  // Personal saved formats (optional)
  personalFormats?: PersonalGameFormat[];
  selectedPersonalFormatId?: string | null;
  onPersonalFormatSelect?: (id: string | null) => void;
  onBuildNewFormat?: () => void;
  formatActive?: boolean;
  selectedFormatName?: string;
  groupAssignedFormat?: PersonalGameFormat | null;
  onUseThisGame?: (format: PersonalGameFormat) => void;
  isPro?: boolean;
  onPaywall?: () => void;
}

const springTransition = { type: 'spring', stiffness: 300, damping: 28 };

export function FormatStep({
  players,
  strokePlay,
  matchPlay,
  matchPlayFormat,
  matchPlayTeamA,
  matchPlayTeamB,
  stakes,
  onStrokePlayChange,
  onMatchPlayChange,
  onMatchPlayFormatChange,
  onMatchPlayTeamsChange,
  onStakesChange,
  skinsEnabled,
  skinsStakes,
  skinsCarryover,
  onSkinsEnabledChange,
  onSkinsStakesChange,
  onSkinsCarryoverChange,
  nassauEnabled,
  nassauStakes,
  nassauAutoPress,
  onNassauEnabledChange,
  onNassauStakesChange,
  onNassauAutoPressChange,
  stablefordEnabled,
  stablefordModified,
  onStablefordEnabledChange,
  onStablefordModifiedChange,
  bestBallEnabled,
  onBestBallEnabledChange,
  wolfEnabled,
  wolfStakes,
  wolfCarryover,
  onWolfEnabledChange,
  onWolfStakesChange,
  onWolfCarryoverChange,
  vegasEnabled,
  vegasStakes,
  vegasCarryover,
  onVegasEnabledChange,
  onVegasStakesChange,
  onVegasCarryoverChange,
  ninesEnabled,
  ninesStakes,
  onNinesEnabledChange,
  onNinesStakesChange,
  defenderEnabled,
  defenderStakes,
  onDefenderEnabledChange,
  onDefenderStakesChange,
  sixesEnabled,
  sixesStakes,
  onSixesEnabledChange,
  onSixesStakesChange,
  personalFormats,
  selectedPersonalFormatId,
  onPersonalFormatSelect,
  formatActive,
  selectedFormatName,
  onBuildNewFormat,
  groupAssignedFormat,
  onUseThisGame,
  isPro: isPropPro,
  onPaywall,
}: FormatStepProps) {
  const validPlayers = players.filter(p => p.name.trim());
  const playerCount = validPlayers.length;

  // Subscription gating
  const { isPro, canUseGame, canUseSkinsCarryover } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<string | undefined>();

  const handleProFeature = (featureLabel: string, callback: () => void) => {
    setPaywallFeature(featureLabel);
    setShowPaywall(true);
  };

  const sectionLabel = 'text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2 mt-5';

  const gameCardBase =
    'bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-4 mb-2 cursor-pointer w-full text-left';
  const gameCardSelected = 'ring-2 ring-foreground';

  // Icon box helper
  const iconBoxClass = (active: boolean, locked?: boolean) =>
    cn(
      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
      active && !locked
        ? 'bg-foreground'
        : locked
        ? 'bg-muted'
        : 'bg-muted'
    );

  const iconClass = (active: boolean, locked?: boolean) =>
    cn(
      'w-4 h-4',
      active && !locked ? 'text-white' : locked ? 'text-muted-foreground' : 'text-foreground'
    );

  const ProLabel = () => (
    <span className="bg-foreground text-[#F0EE3A] text-[9px] font-black tracking-[0.1em] px-1.5 py-0.5 rounded-md">
      PRO
    </span>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="pt-4"
    >
      {/* Group-assigned format */}
      {groupAssignedFormat && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground mb-2">Group Format</p>
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              hapticLight();
              const newId = selectedPersonalFormatId === groupAssignedFormat.id ? null : groupAssignedFormat.id;
              onPersonalFormatSelect?.(newId);
            }}
            className={cn(
              'w-full rounded-2xl p-4 border-2 cursor-pointer transition-all',
              selectedPersonalFormatId === groupAssignedFormat.id
                ? 'bg-[#0A0A0A] border-[#0A0A0A]'
                : 'bg-white border-border/40'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                selectedPersonalFormatId === groupAssignedFormat.id ? 'bg-[#F0EE3A]/20' : 'bg-muted'
              )}>
                <Sparkles className={cn('w-4 h-4', selectedPersonalFormatId === groupAssignedFormat.id ? 'text-[#F0EE3A]' : 'text-muted-foreground')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('font-black text-[14px] leading-tight', selectedPersonalFormatId === groupAssignedFormat.id ? 'text-white' : 'text-foreground')}>
                  {groupAssignedFormat.name}
                </p>
                <p className={cn('text-[11px] mt-0.5 leading-snug', selectedPersonalFormatId === groupAssignedFormat.id ? 'text-white/50' : 'text-muted-foreground')}>
                  {groupAssignedFormat.description.slice(0, 80)}{groupAssignedFormat.description.length > 80 ? '…' : ''}
                </p>
              </div>
            </div>
            {/* Use This Game button — only for non-owners */}
            {onUseThisGame && (
              <UseThisGameButton
                isPro={isPropPro ?? false}
                onUse={() => onUseThisGame(groupAssignedFormat)}
                onPaywall={() => onPaywall?.()}
              />
            )}
          </motion.div>
        </motion.div>
      )}

      {/* My Saved Formats section */}
      {personalFormats !== undefined && (
        <>
          <p className={sectionLabel}>My Saved Formats</p>
          {personalFormats.length === 0 ? null : personalFormats.map(fmt => {
            const isSelected = selectedPersonalFormatId === fmt.id;
            const cfg = buildConfig(fmt.activePrimitives);
            const lines = summarizeScoringConfig(cfg, 2);
            return (
              <motion.div
                key={fmt.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springTransition}
                className={cn(
                  'rounded-2xl border-2 px-4 py-3 flex items-center gap-3 transition-colors mb-2',
                  isSelected ? 'bg-[#0A0A0A] border-[#0A0A0A]' : 'bg-white border-border/40'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                  isSelected ? 'bg-[#F0EE3A]' : 'bg-muted'
                )}>
                  <Sparkles className={cn('w-4 h-4', isSelected ? 'text-[#0A0A0A]' : 'text-muted-foreground')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-[13px] font-bold truncate', isSelected ? 'text-white' : 'text-foreground')}>
                    {fmt.name}
                  </p>
                  {lines.length > 0 && (
                    <p className={cn('text-[11px] truncate', isSelected ? 'text-white/50' : 'text-muted-foreground')}>
                      {lines.join(' · ')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onPersonalFormatSelect?.(isSelected ? null : fmt.id)}
                  className="flex-shrink-0"
                >
                  {isSelected
                    ? <ToggleRight className="w-7 h-7 text-[#F0EE3A]" />
                    : <ToggleLeft className="w-7 h-7 text-muted-foreground" />
                  }
                </button>
              </motion.div>
            );
          })}
          {onBuildNewFormat && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
              whileTap={{ scale: 0.97 }}
              onClick={onBuildNewFormat}
              className="w-full flex items-center justify-center gap-2 py-2.5 mb-2 text-[13px] font-bold text-foreground"
            >
              <Plus className="w-4 h-4" />
              Build New Format
            </motion.button>
          )}
        </>
      )}

      {/* Format Active Banner */}
      {formatActive && (() => {
        const selectedFmt = personalFormats?.find(f => f.id === selectedPersonalFormatId) ?? groupAssignedFormat;
        const rulePills = selectedFmt
          ? summarizeScoringConfig(buildConfig(selectedFmt.activePrimitives), 6)
          : [];
        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0A0A0A] rounded-2xl p-4 mb-3 mt-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F0EE3A]/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-[#F0EE3A]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black text-white truncate">
                  {selectedFormatName ?? 'Format'} is active
                </p>
                <p className="text-[11px] text-white/50 mt-0.5">
                  Your format controls all scoring, bets &amp; handicaps
                </p>
              </div>
            </div>
            {rulePills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {rulePills.map((pill) => (
                  <span
                    key={pill}
                    className="text-[10px] font-bold bg-white/10 text-white/70 px-2.5 py-1 rounded-full"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        );
      })()}

      {/* Scoring Section — hidden when format controls scoring */}
      {!formatActive && <p className={sectionLabel}>Scoring Format</p>}

      {!formatActive && (
      <>
      {/* Stroke Play */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 * 0.04, ...springTransition }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onStrokePlayChange(!strokePlay)}
        className={cn(gameCardBase, strokePlay && gameCardSelected)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={iconBoxClass(strokePlay)}>
              <Flag className={iconClass(strokePlay)} />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Stroke Play</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Traditional scoring, lowest total wins</p>
            </div>
          </div>
          <Switch checked={strokePlay} onCheckedChange={onStrokePlayChange} onClick={e => e.stopPropagation()} />
        </div>
      </motion.div>

      {/* Match Play */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 * 0.04, ...springTransition }}
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

      {/* Side Games */}
      <p className={sectionLabel}>Side Games</p>

      {/* Skins */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 * 0.04, ...springTransition }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onSkinsEnabledChange(!skinsEnabled)}
        className={cn(gameCardBase, skinsEnabled && gameCardSelected)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={iconBoxClass(skinsEnabled)}>
              <DollarSign className={iconClass(skinsEnabled)} />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Skins</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Win the hole outright to claim</p>
            </div>
          </div>
          <Switch checked={skinsEnabled} onCheckedChange={onSkinsEnabledChange} onClick={e => e.stopPropagation()} />
        </div>

        {skinsEnabled && (
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
                type="number"
                placeholder="2"
                value={skinsStakes}
                onChange={e => onSkinsStakesChange(e.target.value)}
                className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
                min={1}
              />
              <span className="text-sm text-muted-foreground">per hole</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                id="carryover"
                checked={skinsCarryover}
                disabled={!canUseSkinsCarryover()}
                className="w-4 h-4 rounded border-border"
                onCheckedChange={checked => {
                  if (canUseSkinsCarryover()) {
                    onSkinsCarryoverChange(checked === true);
                  } else {
                    handleProFeature('Skins Carryover', () => {});
                  }
                }}
              />
              <label
                htmlFor="carryover"
                className="flex items-center gap-2"
                onClick={() => {
                  if (!canUseSkinsCarryover()) {
                    handleProFeature('Skins Carryover', () => {});
                  }
                }}
              >
                Carryovers (ties roll over)
                {!canUseSkinsCarryover() && <ProBadge size="sm" variant="subtle" />}
              </label>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Nassau */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 * 0.04, ...springTransition }}
        whileTap={{ scale: 0.99 }}
        onClick={() => {
          if (canUseGame('nassau')) onNassauEnabledChange(!nassauEnabled);
          else handleProFeature('Nassau', () => {});
        }}
        className={cn(
          gameCardBase,
          nassauEnabled && canUseGame('nassau') && gameCardSelected,
          !canUseGame('nassau') && 'opacity-60'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!canUseGame('nassau') && <Lock className="w-4 h-4 text-muted-foreground" />}
            <div className={iconBoxClass(nassauEnabled && canUseGame('nassau'), !canUseGame('nassau'))}>
              <Trophy className={iconClass(nassauEnabled && canUseGame('nassau'), !canUseGame('nassau'))} />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground flex items-center gap-2">
                Nassau
                {!canUseGame('nassau') && <ProLabel />}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Front 9 + Back 9 + Overall</p>
            </div>
          </div>
          <Switch
            checked={nassauEnabled}
            disabled={!canUseGame('nassau')}
            onCheckedChange={(checked) => {
              if (canUseGame('nassau')) onNassauEnabledChange(checked);
              else handleProFeature('Nassau', () => {});
            }}
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
                type="number"
                placeholder="5"
                value={nassauStakes}
                onChange={e => onNassauStakesChange(e.target.value)}
                className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
                min={1}
              />
              <span className="text-sm text-muted-foreground">per bet</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                id="autopress"
                checked={nassauAutoPress}
                className="w-4 h-4 rounded border-border"
                onCheckedChange={checked => onNassauAutoPressChange(checked === true)}
              />
              <label htmlFor="autopress">Auto-press when 2 down</label>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Stableford */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 * 0.04, ...springTransition }}
        whileTap={{ scale: 0.99 }}
        onClick={() => {
          if (canUseGame('stableford')) onStablefordEnabledChange(!stablefordEnabled);
          else handleProFeature('Stableford', () => {});
        }}
        className={cn(
          gameCardBase,
          stablefordEnabled && canUseGame('stableford') && gameCardSelected,
          !canUseGame('stableford') && 'opacity-60'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!canUseGame('stableford') && <Lock className="w-4 h-4 text-muted-foreground" />}
            <div className={iconBoxClass(stablefordEnabled && canUseGame('stableford'), !canUseGame('stableford'))}>
              <BarChart3 className={iconClass(stablefordEnabled && canUseGame('stableford'), !canUseGame('stableford'))} />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground flex items-center gap-2">
                Stableford
                {!canUseGame('stableford') && <ProLabel />}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Points-based scoring</p>
            </div>
          </div>
          <Switch
            checked={stablefordEnabled}
            disabled={!canUseGame('stableford')}
            onCheckedChange={(checked) => {
              if (canUseGame('stableford')) onStablefordEnabledChange(checked);
              else handleProFeature('Stableford', () => {});
            }}
            onClick={e => e.stopPropagation()}
          />
        </div>

        {stablefordEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={springTransition}
            className="pt-3 mt-3 border-t border-border/50 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg font-mono">
              Eagle: 4 • Birdie: 3 • Par: 2 • Bogey: 1 • 2+: 0
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                id="modifiedStableford"
                checked={stablefordModified}
                className="w-4 h-4 rounded border-border"
                onCheckedChange={checked => onStablefordModifiedChange(checked === true)}
              />
              <label htmlFor="modifiedStableford">Modified (aggressive with negatives)</label>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Best Ball */}
      {playerCount >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3 * 0.04, ...springTransition }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            if (canUseGame('bestball')) onBestBallEnabledChange(!bestBallEnabled);
            else handleProFeature('Best Ball', () => {});
          }}
          className={cn(
            gameCardBase,
            bestBallEnabled && canUseGame('bestball') && gameCardSelected,
            !canUseGame('bestball') && 'opacity-60'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!canUseGame('bestball') && <Lock className="w-4 h-4 text-muted-foreground" />}
              <div className={iconBoxClass(bestBallEnabled && canUseGame('bestball'), !canUseGame('bestball'))}>
                <Users className={iconClass(bestBallEnabled && canUseGame('bestball'), !canUseGame('bestball'))} />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground flex items-center gap-2">
                  Best Ball
                  {!canUseGame('bestball') && <ProLabel />}
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {playerCount === 4 ? '2v2 team format' : 'Team format - best score counts'}
                </p>
              </div>
            </div>
            <Switch
              checked={bestBallEnabled}
              disabled={!canUseGame('bestball')}
              onCheckedChange={(checked) => {
                if (canUseGame('bestball')) onBestBallEnabledChange(checked);
                else handleProFeature('Best Ball', () => {});
              }}
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
                    {validPlayers[0]?.name.split(' ')[0]} &{' '}
                    {validPlayers[1]?.name.split(' ')[0]}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-foreground/5 border border-foreground/20">
                  <p className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wide">Team 2</p>
                  <p className="text-sm font-medium truncate">
                    {validPlayers[2]?.name.split(' ')[0]} &{' '}
                    {validPlayers[3]?.name.split(' ')[0]}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Wolf */}
      {(playerCount === 3 || playerCount === 4) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 4 * 0.04, ...springTransition }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            if (canUseGame('wolf')) onWolfEnabledChange(!wolfEnabled);
            else handleProFeature('Wolf', () => {});
          }}
          className={cn(
            gameCardBase,
            wolfEnabled && canUseGame('wolf') && gameCardSelected,
            !canUseGame('wolf') && 'opacity-60'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!canUseGame('wolf') && <Lock className="w-4 h-4 text-muted-foreground" />}
              <div className={iconBoxClass(wolfEnabled && canUseGame('wolf'), !canUseGame('wolf'))}>
                <Crown className={iconClass(wolfEnabled && canUseGame('wolf'), !canUseGame('wolf'))} />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground flex items-center gap-2">
                  Wolf
                  {!canUseGame('wolf') && <ProLabel />}
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {playerCount === 3 ? 'Rotating wolf vs. field' : 'Rotating captain picks partner'}
                </p>
              </div>
            </div>
            <Switch
              checked={wolfEnabled}
              disabled={!canUseGame('wolf')}
              onCheckedChange={(checked) => {
                if (canUseGame('wolf')) onWolfEnabledChange(checked);
                else handleProFeature('Wolf', () => {});
              }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {wolfEnabled && (
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
                  type="number"
                  placeholder="2"
                  value={wolfStakes}
                  onChange={e => onWolfStakesChange(e.target.value)}
                  className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">per point</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  id="wolfcarryover"
                  checked={wolfCarryover}
                  className="w-4 h-4 rounded border-border"
                  onCheckedChange={checked => onWolfCarryoverChange(checked === true)}
                />
                <label htmlFor="wolfcarryover">Carryovers (pushes roll over)</label>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg font-mono">
                Lone Wolf: 3x • Blind Wolf: 6x
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Vegas — 4 players required */}
      {playerCount === 4 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 5 * 0.04, ...springTransition }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            if (canUseGame('vegas')) onVegasEnabledChange(!vegasEnabled);
            else handleProFeature('Vegas', () => {});
          }}
          className={cn(
            gameCardBase,
            vegasEnabled && canUseGame('vegas') && gameCardSelected,
            !canUseGame('vegas') && 'opacity-60'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!canUseGame('vegas') && <Lock className="w-4 h-4 text-muted-foreground" />}
              <div className={iconBoxClass(vegasEnabled && canUseGame('vegas'), !canUseGame('vegas'))}>
                <Dice3 className={iconClass(vegasEnabled && canUseGame('vegas'), !canUseGame('vegas'))} />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground flex items-center gap-2">
                  Vegas
                  {!canUseGame('vegas') && <ProLabel />}
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5">2v2 paired scores · flips & doubles</p>
              </div>
            </div>
            <Switch
              checked={vegasEnabled}
              disabled={!canUseGame('vegas')}
              onCheckedChange={(checked) => {
                if (canUseGame('vegas')) onVegasEnabledChange(checked);
                else handleProFeature('Vegas', () => {});
              }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {vegasEnabled && (
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
                  type="number"
                  placeholder="1"
                  value={vegasStakes}
                  onChange={e => onVegasStakesChange(e.target.value)}
                  className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">per point</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  id="vegascarryover"
                  checked={vegasCarryover}
                  className="w-4 h-4 rounded border-border"
                  onCheckedChange={checked => onVegasCarryoverChange(checked === true)}
                />
                <label htmlFor="vegascarryover">Ties carry over (multiply next hole)</label>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg font-mono">
                Birdie flip · Eagle flip+2× · 10+ high digit first
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Nines (5-3-1) — exactly 3 players */}
      {playerCount === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 5 * 0.04, ...springTransition }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            if (canUseGame('nines')) onNinesEnabledChange(!ninesEnabled);
            else handleProFeature('Nines', () => {});
          }}
          className={cn(
            gameCardBase,
            ninesEnabled && canUseGame('nines') && gameCardSelected,
            !canUseGame('nines') && 'opacity-60'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!canUseGame('nines') && <Lock className="w-4 h-4 text-muted-foreground" />}
              <div className={iconBoxClass(ninesEnabled && canUseGame('nines'), !canUseGame('nines'))}>
                <BarChart3 className={iconClass(ninesEnabled && canUseGame('nines'), !canUseGame('nines'))} />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground flex items-center gap-2">
                  Nines (5-3-1)
                  {!canUseGame('nines') && <ProLabel />}
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5">9 points split per hole · 3 players</p>
              </div>
            </div>
            <Switch
              checked={ninesEnabled}
              disabled={!canUseGame('nines')}
              onCheckedChange={(checked) => {
                if (canUseGame('nines')) onNinesEnabledChange(checked);
                else handleProFeature('Nines', () => {});
              }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {ninesEnabled && (
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
                  type="number"
                  placeholder="1"
                  value={ninesStakes}
                  onChange={e => onNinesStakesChange(e.target.value)}
                  className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">per point</span>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg font-mono">
                Best: 5 · Mid: 3 · Worst: 1 · All tie: 3-3-3
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Defender — 3-4 players */}
      {(playerCount === 3 || playerCount === 4) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 6 * 0.04, ...springTransition }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            if (canUseGame('defender')) onDefenderEnabledChange(!defenderEnabled);
            else handleProFeature('Defender', () => {});
          }}
          className={cn(
            gameCardBase,
            defenderEnabled && canUseGame('defender') && gameCardSelected,
            !canUseGame('defender') && 'opacity-60'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!canUseGame('defender') && <Lock className="w-4 h-4 text-muted-foreground" />}
              <div className={iconBoxClass(defenderEnabled && canUseGame('defender'), !canUseGame('defender'))}>
                <Shield className={iconClass(defenderEnabled && canUseGame('defender'), !canUseGame('defender'))} />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground flex items-center gap-2">
                  Defender
                  {!canUseGame('defender') && <ProLabel />}
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5">1 vs. field · rotating defender</p>
              </div>
            </div>
            <Switch
              checked={defenderEnabled}
              disabled={!canUseGame('defender')}
              onCheckedChange={(checked) => {
                if (canUseGame('defender')) onDefenderEnabledChange(checked);
                else handleProFeature('Defender', () => {});
              }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {defenderEnabled && (
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
                  type="number"
                  placeholder="1"
                  value={defenderStakes}
                  onChange={e => onDefenderStakesChange(e.target.value)}
                  className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">per point</span>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg font-mono">
                Defend: +3 win · +1 tie · Attackers: +1/+2 each
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Sixes — exactly 4 players */}
      {playerCount === 4 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 7 * 0.04, ...springTransition }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            if (canUseGame('sixes')) onSixesEnabledChange(!sixesEnabled);
            else handleProFeature('Sixes', () => {});
          }}
          className={cn(
            gameCardBase,
            sixesEnabled && canUseGame('sixes') && gameCardSelected,
            !canUseGame('sixes') && 'opacity-60'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!canUseGame('sixes') && <Lock className="w-4 h-4 text-muted-foreground" />}
              <div className={iconBoxClass(sixesEnabled && canUseGame('sixes'), !canUseGame('sixes'))}>
                <RotateCcw className={iconClass(sixesEnabled && canUseGame('sixes'), !canUseGame('sixes'))} />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground flex items-center gap-2">
                  Sixes (Round Robin)
                  {!canUseGame('sixes') && <ProLabel />}
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5">3 rotating 2v2 segments · 6 holes each</p>
              </div>
            </div>
            <Switch
              checked={sixesEnabled}
              disabled={!canUseGame('sixes')}
              onCheckedChange={(checked) => {
                if (canUseGame('sixes')) onSixesEnabledChange(checked);
                else handleProFeature('Sixes', () => {});
              }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {sixesEnabled && (
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
                  type="number"
                  placeholder="1"
                  value={sixesStakes}
                  onChange={e => onSixesStakesChange(e.target.value)}
                  className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">per point</span>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg font-mono">
                H1-6: AB vs CD · H7-12: AC vs BD · H13-18: AD vs BC
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      </>
      )}

      {/* Paywall Modal */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature={paywallFeature}
      />
    </motion.div>
  );
}
