import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useSubscription } from '@/hooks/useSubscription';
import { PaywallModal } from '@/components/subscription';
import { cn } from '@/lib/utils';
import { PersonalGameFormat } from '@/types/houseGame';
import { SavedFormatsPicker } from './SavedFormatsPicker';
import { HeroCard, HeroTile } from './setupUi';
import { buildConfig, summarizeScoringConfig } from '@/engine/HouseGameEngine';
import { MatchPlaySection } from './MatchPlaySection';
import {
  SkinsSection,
  NassauSection,
  StablefordSection,
  BestBallSection,
  WolfSection,
  VegasSection,
  NinesSection,
  DefenderSection,
  SixesSection,
} from './formatStepSections';
import {
  springTransition,
  sectionLabel,
  gameCardBase,
  gameCardSelected,
  iconBoxClass,
  iconClass,
} from './formatStepStyles';

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

  // Display-only summary for the hero (mirrors each section's player-count gate).
  const gamesOn = [
    strokePlay,
    matchPlay,
    skinsEnabled,
    nassauEnabled,
    stablefordEnabled,
    bestBallEnabled && playerCount >= 2,
    wolfEnabled && (playerCount === 3 || playerCount === 4),
    vegasEnabled && playerCount === 4,
    ninesEnabled && playerCount === 3,
    defenderEnabled && (playerCount === 3 || playerCount === 4),
    sixesEnabled && playerCount === 4,
  ].filter(Boolean).length;

  const activeFormat = formatActive
    ? personalFormats?.find(f => f.id === selectedPersonalFormatId) ?? groupAssignedFormat ?? null
    : null;
  const rulePills = activeFormat
    ? summarizeScoringConfig(buildConfig(activeFormat.activePrimitives), 6)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="pt-2"
    >
      {formatActive ? (
        <HeroCard
          eyebrow={<span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-gold" /> Your format is on</span>}
          title={selectedFormatName ?? 'Format'}
          body="It controls all scoring, bets and handicaps for this round."
        >
          {rulePills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {rulePills.map(pill => (
                <span key={pill} className="text-[12px] font-semibold bg-white/10 text-white px-3 py-1.5 rounded-full">
                  {pill}
                </span>
              ))}
            </div>
          )}
        </HeroCard>
      ) : (
        <HeroCard
          eyebrow="Games"
          title="What are you playing for?"
          body="Turn on a scoring format and any side games, or load a saved format."
        >
          <div className="grid grid-cols-2 gap-2 mt-4">
            <HeroTile hot value={gamesOn} label={gamesOn === 1 ? 'Game on' : 'Games on'} />
            <HeroTile value={playerCount} label={playerCount === 1 ? 'Player' : 'Players'} />
          </div>
        </HeroCard>
      )}

      <SavedFormatsPicker
        groupAssignedFormat={groupAssignedFormat}
        personalFormats={personalFormats}
        selectedPersonalFormatId={selectedPersonalFormatId}
        onPersonalFormatSelect={onPersonalFormatSelect}
        onBuildNewFormat={onBuildNewFormat}
        formatActive={formatActive}
        selectedFormatName={selectedFormatName}
        onUseThisGame={onUseThisGame}
        isPro={isPropPro}
        onPaywall={onPaywall}
      />

      {/* Scoring Section — hidden when format controls scoring */}
      {!formatActive && <p className={sectionLabel}>Scoring format</p>}

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
              <p className="font-semibold text-[16px] text-foreground">Stroke Play</p>
              <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">Traditional scoring, lowest total wins</p>
            </div>
          </div>
          <Switch checked={strokePlay} onCheckedChange={onStrokePlayChange} onClick={e => e.stopPropagation()} />
        </div>
      </motion.div>

      <MatchPlaySection
        matchPlay={matchPlay}
        matchPlayFormat={matchPlayFormat}
        matchPlayTeamA={matchPlayTeamA}
        matchPlayTeamB={matchPlayTeamB}
        stakes={stakes}
        validPlayers={validPlayers}
        playerCount={playerCount}
        onMatchPlayChange={onMatchPlayChange}
        onMatchPlayFormatChange={onMatchPlayFormatChange}
        onMatchPlayTeamsChange={onMatchPlayTeamsChange}
        onStakesChange={onStakesChange}
      />

      {/* Side Games */}
      <p className={sectionLabel}>Side games</p>

      <SkinsSection
        skinsEnabled={skinsEnabled}
        skinsStakes={skinsStakes}
        skinsCarryover={skinsCarryover}
        canUseSkinsCarryover={canUseSkinsCarryover}
        onSkinsEnabledChange={onSkinsEnabledChange}
        onSkinsStakesChange={onSkinsStakesChange}
        onSkinsCarryoverChange={onSkinsCarryoverChange}
        onProFeatureBlock={(label) => handleProFeature(label, () => {})}
      />

      <NassauSection
        nassauEnabled={nassauEnabled}
        nassauStakes={nassauStakes}
        nassauAutoPress={nassauAutoPress}
        canUseGame={canUseGame}
        onNassauEnabledChange={onNassauEnabledChange}
        onNassauStakesChange={onNassauStakesChange}
        onNassauAutoPressChange={onNassauAutoPressChange}
        onProFeatureBlock={(label) => handleProFeature(label, () => {})}
      />

      <StablefordSection
        stablefordEnabled={stablefordEnabled}
        stablefordModified={stablefordModified}
        canUseGame={canUseGame}
        onStablefordEnabledChange={onStablefordEnabledChange}
        onStablefordModifiedChange={onStablefordModifiedChange}
        onProFeatureBlock={(label) => handleProFeature(label, () => {})}
      />

      <BestBallSection
        bestBallEnabled={bestBallEnabled}
        playerCount={playerCount}
        validPlayers={validPlayers}
        canUseGame={canUseGame}
        onBestBallEnabledChange={onBestBallEnabledChange}
        onProFeatureBlock={(label) => handleProFeature(label, () => {})}
      />

      <WolfSection
        wolfEnabled={wolfEnabled}
        wolfStakes={wolfStakes}
        wolfCarryover={wolfCarryover}
        playerCount={playerCount}
        canUseGame={canUseGame}
        onWolfEnabledChange={onWolfEnabledChange}
        onWolfStakesChange={onWolfStakesChange}
        onWolfCarryoverChange={onWolfCarryoverChange}
        onProFeatureBlock={(label) => handleProFeature(label, () => {})}
      />

      <VegasSection
        vegasEnabled={vegasEnabled}
        vegasStakes={vegasStakes}
        vegasCarryover={vegasCarryover}
        playerCount={playerCount}
        canUseGame={canUseGame}
        onVegasEnabledChange={onVegasEnabledChange}
        onVegasStakesChange={onVegasStakesChange}
        onVegasCarryoverChange={onVegasCarryoverChange}
        onProFeatureBlock={(label) => handleProFeature(label, () => {})}
      />

      <NinesSection
        ninesEnabled={ninesEnabled}
        ninesStakes={ninesStakes}
        playerCount={playerCount}
        canUseGame={canUseGame}
        onNinesEnabledChange={onNinesEnabledChange}
        onNinesStakesChange={onNinesStakesChange}
        onProFeatureBlock={(label) => handleProFeature(label, () => {})}
      />

      <DefenderSection
        defenderEnabled={defenderEnabled}
        defenderStakes={defenderStakes}
        playerCount={playerCount}
        canUseGame={canUseGame}
        onDefenderEnabledChange={onDefenderEnabledChange}
        onDefenderStakesChange={onDefenderStakesChange}
        onProFeatureBlock={(label) => handleProFeature(label, () => {})}
      />

      <SixesSection
        sixesEnabled={sixesEnabled}
        sixesStakes={sixesStakes}
        playerCount={playerCount}
        canUseGame={canUseGame}
        onSixesEnabledChange={onSixesEnabledChange}
        onSixesStakesChange={onSixesStakesChange}
        onProFeatureBlock={(label) => handleProFeature(label, () => {})}
      />

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
