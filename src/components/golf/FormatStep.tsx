import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
import { useSubscription } from '@/hooks/useSubscription';
import { ProBadge, PaywallModal } from '@/components/subscription';

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

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Scoring Section */}
      <div className="space-y-3">
        <p className="label-sm">Scoring Format</p>

        {/* Stroke Play */}
        <TechCard variant={strokePlay ? 'highlighted' : 'default'}>
          <TechCardContent className="p-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="font-semibold">Stroke Play</p>
              <p className="text-sm text-muted-foreground">Traditional scoring, lowest total wins</p>
            </div>
            <Switch checked={strokePlay} onCheckedChange={onStrokePlayChange} />
          </TechCardContent>
        </TechCard>

        {/* Match Play */}
        <TechCard variant={matchPlay ? 'highlighted' : 'default'}>
          <TechCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold">Match Play</p>
                <p className="text-sm text-muted-foreground">Hole-by-hole competition</p>
              </div>
              <Switch checked={matchPlay} onCheckedChange={onMatchPlayChange} />
            </div>

            {matchPlay && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={stakes}
                    onChange={e => onStakesChange(e.target.value)}
                    className="w-24 text-center font-mono"
                    min={0}
                  />
                  <span className="text-sm text-muted-foreground">per match</span>
                </div>
              </motion.div>
            )}
          </TechCardContent>
        </TechCard>
      </div>

      {/* Side Games */}
      <div className="space-y-3">
        <p className="label-sm">Side Games</p>

        {/* Skins */}
        <TechCard variant={skinsEnabled ? 'highlighted' : 'default'}>
          <TechCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {skinsEnabled && <Check className="w-4 h-4 text-primary" />}
                <div>
                  <p className="font-semibold">Skins</p>
                  <p className="text-sm text-muted-foreground">Win the hole outright to claim</p>
                </div>
              </div>
              <Switch checked={skinsEnabled} onCheckedChange={onSkinsEnabledChange} />
            </div>

            {skinsEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 pt-3 border-t border-border space-y-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="2"
                    value={skinsStakes}
                    onChange={e => onSkinsStakesChange(e.target.value)}
                    className="w-24 text-center font-mono"
                    min={1}
                  />
                  <span className="text-sm text-muted-foreground">per hole</span>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="carryover"
                    checked={skinsCarryover}
                    disabled={!canUseSkinsCarryover()}
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
                    className="text-sm font-medium flex items-center gap-2"
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
          </TechCardContent>
        </TechCard>

        {/* Nassau - Pro Feature */}
        <TechCard variant={nassauEnabled ? 'highlighted' : 'default'} className={!canUseGame('nassau') ? 'opacity-75' : ''}>
          <TechCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {nassauEnabled && canUseGame('nassau') && <Check className="w-4 h-4 text-primary" />}
                {!canUseGame('nassau') && <Lock className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    Nassau
                    {!canUseGame('nassau') && <ProBadge size="sm" />}
                  </p>
                  <p className="text-sm text-muted-foreground">Front 9 + Back 9 + Overall</p>
                </div>
              </div>
              <Switch
                checked={nassauEnabled}
                disabled={!canUseGame('nassau')}
                onCheckedChange={(checked) => {
                  if (canUseGame('nassau')) {
                    onNassauEnabledChange(checked);
                  } else {
                    handleProFeature('Nassau', () => {});
                  }
                }}
              />
            </div>

            {nassauEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 pt-3 border-t border-border space-y-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="5"
                    value={nassauStakes}
                    onChange={e => onNassauStakesChange(e.target.value)}
                    className="w-24 text-center font-mono"
                    min={1}
                  />
                  <span className="text-sm text-muted-foreground">per bet</span>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="autopress"
                    checked={nassauAutoPress}
                    onCheckedChange={checked => onNassauAutoPressChange(checked === true)}
                  />
                  <label htmlFor="autopress" className="text-sm font-medium">
                    Auto-press when 2 down
                  </label>
                </div>
              </motion.div>
            )}
          </TechCardContent>
        </TechCard>

        {/* Stableford - Pro Feature */}
        <TechCard variant={stablefordEnabled ? 'highlighted' : 'default'} className={!canUseGame('stableford') ? 'opacity-75' : ''}>
          <TechCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {stablefordEnabled && canUseGame('stableford') && <Check className="w-4 h-4 text-primary" />}
                {!canUseGame('stableford') && <Lock className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    Stableford
                    {!canUseGame('stableford') && <ProBadge size="sm" />}
                  </p>
                  <p className="text-sm text-muted-foreground">Points-based scoring</p>
                </div>
              </div>
              <Switch
                checked={stablefordEnabled}
                disabled={!canUseGame('stableford')}
                onCheckedChange={(checked) => {
                  if (canUseGame('stableford')) {
                    onStablefordEnabledChange(checked);
                  } else {
                    handleProFeature('Stableford', () => {});
                  }
                }}
              />
            </div>

            {stablefordEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 pt-3 border-t border-border space-y-3"
              >
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg font-mono">
                  🦅 Eagle: 4 • 🐦 Birdie: 3 • Par: 2 • Bogey: 1 • 2+: 0
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="modifiedStableford"
                    checked={stablefordModified}
                    onCheckedChange={checked => onStablefordModifiedChange(checked === true)}
                  />
                  <label htmlFor="modifiedStableford" className="text-sm font-medium">
                    Modified (aggressive with negatives)
                  </label>
                </div>
              </motion.div>
            )}
          </TechCardContent>
        </TechCard>

        {/* Best Ball - Pro Feature */}
        {playerCount >= 2 && (
          <TechCard variant={bestBallEnabled ? 'highlighted' : 'default'} className={!canUseGame('bestball') ? 'opacity-75' : ''}>
            <TechCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {bestBallEnabled && canUseGame('bestball') && <Check className="w-4 h-4 text-primary" />}
                  {!canUseGame('bestball') && <Lock className="w-4 h-4 text-muted-foreground" />}
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      Best Ball
                      {!canUseGame('bestball') && <ProBadge size="sm" />}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {playerCount === 4 ? '2v2 team format' : 'Team format - best score counts'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={bestBallEnabled}
                  disabled={!canUseGame('bestball')}
                  onCheckedChange={(checked) => {
                    if (canUseGame('bestball')) {
                      onBestBallEnabledChange(checked);
                    } else {
                      handleProFeature('Best Ball', () => {});
                    }
                  }}
                />
              </div>

              {bestBallEnabled && playerCount === 4 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 pt-3 border-t border-border"
                >
                  <p className="text-xs text-muted-foreground mb-2">Teams auto-assigned:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                      <p className="text-[10px] font-semibold text-success uppercase tracking-wide">
                        Team 1
                      </p>
                      <p className="text-sm font-medium truncate">
                        {validPlayers[0]?.name.split(' ')[0]} &{' '}
                        {validPlayers[1]?.name.split(' ')[0]}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                        Team 2
                      </p>
                      <p className="text-sm font-medium truncate">
                        {validPlayers[2]?.name.split(' ')[0]} &{' '}
                        {validPlayers[3]?.name.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </TechCardContent>
          </TechCard>
        )}

        {/* Wolf - Pro Feature */}
        {playerCount === 4 && (
          <TechCard variant={wolfEnabled ? 'highlighted' : 'default'} className={!canUseGame('wolf') ? 'opacity-75' : ''}>
            <TechCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {wolfEnabled && canUseGame('wolf') && <Check className="w-4 h-4 text-warning" />}
                  {!canUseGame('wolf') && <Lock className="w-4 h-4 text-muted-foreground" />}
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      Wolf
                      {!canUseGame('wolf') && <ProBadge size="sm" />}
                    </p>
                    <p className="text-sm text-muted-foreground">Rotating captain picks partner</p>
                  </div>
                </div>
                <Switch
                  checked={wolfEnabled}
                  disabled={!canUseGame('wolf')}
                  onCheckedChange={(checked) => {
                    if (canUseGame('wolf')) {
                      onWolfEnabledChange(checked);
                    } else {
                      handleProFeature('Wolf', () => {});
                    }
                  }}
                />
              </div>

              {wolfEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 pt-3 border-t border-border space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="2"
                      value={wolfStakes}
                      onChange={e => onWolfStakesChange(e.target.value)}
                      className="w-24 text-center font-mono"
                      min={1}
                    />
                    <span className="text-sm text-muted-foreground">per point</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="wolfcarryover"
                      checked={wolfCarryover}
                      onCheckedChange={checked => onWolfCarryoverChange(checked === true)}
                    />
                    <label htmlFor="wolfcarryover" className="text-sm font-medium">
                      Carryovers (pushes roll over)
                    </label>
                  </div>

                  <div className="text-xs text-muted-foreground bg-warning/10 p-3 rounded-lg border border-warning/20 font-mono">
                    🐺 Lone Wolf: 3x • ⚡ Blind Wolf: 6x
                  </div>
                </motion.div>
              )}
            </TechCardContent>
          </TechCard>
        )}
      </div>

      {/* Paywall Modal */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature={paywallFeature}
      />
    </motion.div>
  );
}
