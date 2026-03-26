import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Flag, Swords, DollarSign, Trophy, BarChart3, Users, Crown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useSubscription } from '@/hooks/useSubscription';
import { ProBadge, PaywallModal } from '@/components/subscription';
import { cn } from '@/lib/utils';

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
  stakes: string;
  onStrokePlayChange: (enabled: boolean) => void;
  onMatchPlayChange: (enabled: boolean) => void;
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
}

const springTransition = { type: 'spring', stiffness: 300, damping: 28 };

export function FormatStep({
  players,
  strokePlay,
  matchPlay,
  stakes,
  onStrokePlayChange,
  onMatchPlayChange,
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
      {/* Scoring Section */}
      <p className={sectionLabel}>Scoring Format</p>

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
            className="pt-3 mt-3 border-t border-border/50"
            onClick={e => e.stopPropagation()}
          >
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
      {playerCount === 4 && (
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
                <p className="text-[12px] text-muted-foreground mt-0.5">Rotating captain picks partner</p>
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

      {/* Paywall Modal */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature={paywallFeature}
      />
    </motion.div>
  );
}
