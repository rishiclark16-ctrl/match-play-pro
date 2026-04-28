import { motion } from 'framer-motion';
import { Lock, DollarSign, Trophy, BarChart3, Users, Crown, Dice3, Shield, RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ProBadge } from '@/components/subscription';
import { cn } from '@/lib/utils';
import {
  gameCardBase,
  gameCardSelected,
  iconBoxClass,
  iconClass,
  springTransition,
} from './formatStepStyles';

// ── Shared ────────────────────────────────────────────────────────────────

export const ProLabel = () => (
  <span className="bg-foreground text-[#F0EE3A] text-[9px] font-black tracking-[0.1em] px-1.5 py-0.5 rounded-md">
    PRO
  </span>
);

interface PlayerRef { id: string; name: string }

// ── Skins ─────────────────────────────────────────────────────────────────

export interface SkinsSectionProps {
  skinsEnabled: boolean;
  skinsStakes: string;
  skinsCarryover: boolean;
  canUseSkinsCarryover: () => boolean;
  onSkinsEnabledChange: (enabled: boolean) => void;
  onSkinsStakesChange: (stakes: string) => void;
  onSkinsCarryoverChange: (carryover: boolean) => void;
  onProFeatureBlock: (label: string) => void;
}

export function SkinsSection({
  skinsEnabled, skinsStakes, skinsCarryover,
  canUseSkinsCarryover,
  onSkinsEnabledChange, onSkinsStakesChange, onSkinsCarryoverChange,
  onProFeatureBlock,
}: SkinsSectionProps) {
  return (
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
              type="number" placeholder="2" value={skinsStakes}
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
                if (canUseSkinsCarryover()) onSkinsCarryoverChange(checked === true);
                else onProFeatureBlock('Skins Carryover');
              }}
            />
            <label
              htmlFor="carryover"
              className="flex items-center gap-2"
              onClick={() => { if (!canUseSkinsCarryover()) onProFeatureBlock('Skins Carryover'); }}
            >
              Carryovers (ties roll over)
              {!canUseSkinsCarryover() && <ProBadge size="sm" variant="subtle" />}
            </label>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Nassau ────────────────────────────────────────────────────────────────

export interface NassauSectionProps {
  nassauEnabled: boolean;
  nassauStakes: string;
  nassauAutoPress: boolean;
  canUseGame: (game: string) => boolean;
  onNassauEnabledChange: (enabled: boolean) => void;
  onNassauStakesChange: (stakes: string) => void;
  onNassauAutoPressChange: (autoPress: boolean) => void;
  onProFeatureBlock: (label: string) => void;
}

export function NassauSection({
  nassauEnabled, nassauStakes, nassauAutoPress,
  canUseGame,
  onNassauEnabledChange, onNassauStakesChange, onNassauAutoPressChange,
  onProFeatureBlock,
}: NassauSectionProps) {
  const allowed = canUseGame('nassau');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => { if (allowed) onNassauEnabledChange(!nassauEnabled); else onProFeatureBlock('Nassau'); }}
      className={cn(
        gameCardBase,
        nassauEnabled && allowed && gameCardSelected,
        !allowed && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!allowed && <Lock className="w-4 h-4 text-muted-foreground" />}
          <div className={iconBoxClass(nassauEnabled && allowed, !allowed)}>
            <Trophy className={iconClass(nassauEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground flex items-center gap-2">
              Nassau{!allowed && <ProLabel />}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Front 9 + Back 9 + Overall</p>
          </div>
        </div>
        <Switch
          checked={nassauEnabled}
          disabled={!allowed}
          onCheckedChange={(checked) => { if (allowed) onNassauEnabledChange(checked); else onProFeatureBlock('Nassau'); }}
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
              type="number" placeholder="5" value={nassauStakes}
              onChange={e => onNassauStakesChange(e.target.value)}
              className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
              min={1}
            />
            <span className="text-sm text-muted-foreground">per bet</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="autopress" checked={nassauAutoPress}
              className="w-4 h-4 rounded border-border"
              onCheckedChange={checked => onNassauAutoPressChange(checked === true)}
            />
            <label htmlFor="autopress">Auto-press when 2 down</label>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Stableford ────────────────────────────────────────────────────────────

export interface StablefordSectionProps {
  stablefordEnabled: boolean;
  stablefordModified: boolean;
  canUseGame: (game: string) => boolean;
  onStablefordEnabledChange: (enabled: boolean) => void;
  onStablefordModifiedChange: (modified: boolean) => void;
  onProFeatureBlock: (label: string) => void;
}

export function StablefordSection({
  stablefordEnabled, stablefordModified,
  canUseGame,
  onStablefordEnabledChange, onStablefordModifiedChange,
  onProFeatureBlock,
}: StablefordSectionProps) {
  const allowed = canUseGame('stableford');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => { if (allowed) onStablefordEnabledChange(!stablefordEnabled); else onProFeatureBlock('Stableford'); }}
      className={cn(
        gameCardBase,
        stablefordEnabled && allowed && gameCardSelected,
        !allowed && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!allowed && <Lock className="w-4 h-4 text-muted-foreground" />}
          <div className={iconBoxClass(stablefordEnabled && allowed, !allowed)}>
            <BarChart3 className={iconClass(stablefordEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground flex items-center gap-2">
              Stableford{!allowed && <ProLabel />}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Points-based scoring</p>
          </div>
        </div>
        <Switch
          checked={stablefordEnabled}
          disabled={!allowed}
          onCheckedChange={(checked) => { if (allowed) onStablefordEnabledChange(checked); else onProFeatureBlock('Stableford'); }}
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
              id="modifiedStableford" checked={stablefordModified}
              className="w-4 h-4 rounded border-border"
              onCheckedChange={checked => onStablefordModifiedChange(checked === true)}
            />
            <label htmlFor="modifiedStableford">Modified (aggressive with negatives)</label>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Best Ball ─────────────────────────────────────────────────────────────

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

// ── Wolf ──────────────────────────────────────────────────────────────────

export interface WolfSectionProps {
  wolfEnabled: boolean;
  wolfStakes: string;
  wolfCarryover: boolean;
  playerCount: number;
  canUseGame: (game: string) => boolean;
  onWolfEnabledChange: (enabled: boolean) => void;
  onWolfStakesChange: (stakes: string) => void;
  onWolfCarryoverChange: (carryover: boolean) => void;
  onProFeatureBlock: (label: string) => void;
}

export function WolfSection({
  wolfEnabled, wolfStakes, wolfCarryover, playerCount,
  canUseGame,
  onWolfEnabledChange, onWolfStakesChange, onWolfCarryoverChange,
  onProFeatureBlock,
}: WolfSectionProps) {
  if (playerCount !== 3 && playerCount !== 4) return null;
  const allowed = canUseGame('wolf');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 4 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => { if (allowed) onWolfEnabledChange(!wolfEnabled); else onProFeatureBlock('Wolf'); }}
      className={cn(
        gameCardBase,
        wolfEnabled && allowed && gameCardSelected,
        !allowed && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!allowed && <Lock className="w-4 h-4 text-muted-foreground" />}
          <div className={iconBoxClass(wolfEnabled && allowed, !allowed)}>
            <Crown className={iconClass(wolfEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground flex items-center gap-2">
              Wolf{!allowed && <ProLabel />}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {playerCount === 3 ? 'Rotating wolf vs. field' : 'Rotating captain picks partner'}
            </p>
          </div>
        </div>
        <Switch
          checked={wolfEnabled}
          disabled={!allowed}
          onCheckedChange={(checked) => { if (allowed) onWolfEnabledChange(checked); else onProFeatureBlock('Wolf'); }}
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
              type="number" placeholder="2" value={wolfStakes}
              onChange={e => onWolfStakesChange(e.target.value)}
              className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
              min={1}
            />
            <span className="text-sm text-muted-foreground">per point</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="wolfcarryover" checked={wolfCarryover}
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
  );
}

// ── Vegas (4 players) ─────────────────────────────────────────────────────

export interface VegasSectionProps {
  vegasEnabled: boolean;
  vegasStakes: string;
  vegasCarryover: boolean;
  playerCount: number;
  canUseGame: (game: string) => boolean;
  onVegasEnabledChange: (enabled: boolean) => void;
  onVegasStakesChange: (stakes: string) => void;
  onVegasCarryoverChange: (carryover: boolean) => void;
  onProFeatureBlock: (label: string) => void;
}

export function VegasSection({
  vegasEnabled, vegasStakes, vegasCarryover, playerCount,
  canUseGame,
  onVegasEnabledChange, onVegasStakesChange, onVegasCarryoverChange,
  onProFeatureBlock,
}: VegasSectionProps) {
  if (playerCount !== 4) return null;
  const allowed = canUseGame('vegas');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 5 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => { if (allowed) onVegasEnabledChange(!vegasEnabled); else onProFeatureBlock('Vegas'); }}
      className={cn(
        gameCardBase,
        vegasEnabled && allowed && gameCardSelected,
        !allowed && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!allowed && <Lock className="w-4 h-4 text-muted-foreground" />}
          <div className={iconBoxClass(vegasEnabled && allowed, !allowed)}>
            <Dice3 className={iconClass(vegasEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground flex items-center gap-2">
              Vegas{!allowed && <ProLabel />}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">2v2 paired scores · flips & doubles</p>
          </div>
        </div>
        <Switch
          checked={vegasEnabled}
          disabled={!allowed}
          onCheckedChange={(checked) => { if (allowed) onVegasEnabledChange(checked); else onProFeatureBlock('Vegas'); }}
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
              type="number" placeholder="1" value={vegasStakes}
              onChange={e => onVegasStakesChange(e.target.value)}
              className="w-24 text-center font-mono bg-muted/50 rounded-xl border-0 py-2.5 text-sm"
              min={1}
            />
            <span className="text-sm text-muted-foreground">per point</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="vegascarryover" checked={vegasCarryover}
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
  );
}

// ── Nines / 5-3-1 (3 players) ─────────────────────────────────────────────

export interface NinesSectionProps {
  ninesEnabled: boolean;
  ninesStakes: string;
  playerCount: number;
  canUseGame: (game: string) => boolean;
  onNinesEnabledChange: (enabled: boolean) => void;
  onNinesStakesChange: (stakes: string) => void;
  onProFeatureBlock: (label: string) => void;
}

export function NinesSection({
  ninesEnabled, ninesStakes, playerCount,
  canUseGame,
  onNinesEnabledChange, onNinesStakesChange,
  onProFeatureBlock,
}: NinesSectionProps) {
  if (playerCount !== 3) return null;
  const allowed = canUseGame('nines');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 5 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => { if (allowed) onNinesEnabledChange(!ninesEnabled); else onProFeatureBlock('Nines'); }}
      className={cn(
        gameCardBase,
        ninesEnabled && allowed && gameCardSelected,
        !allowed && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!allowed && <Lock className="w-4 h-4 text-muted-foreground" />}
          <div className={iconBoxClass(ninesEnabled && allowed, !allowed)}>
            <BarChart3 className={iconClass(ninesEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground flex items-center gap-2">
              Nines (5-3-1){!allowed && <ProLabel />}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">9 points split per hole · 3 players</p>
          </div>
        </div>
        <Switch
          checked={ninesEnabled}
          disabled={!allowed}
          onCheckedChange={(checked) => { if (allowed) onNinesEnabledChange(checked); else onProFeatureBlock('Nines'); }}
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
              type="number" placeholder="1" value={ninesStakes}
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
  );
}

// ── Defender (3-4 players) ────────────────────────────────────────────────

export interface DefenderSectionProps {
  defenderEnabled: boolean;
  defenderStakes: string;
  playerCount: number;
  canUseGame: (game: string) => boolean;
  onDefenderEnabledChange: (enabled: boolean) => void;
  onDefenderStakesChange: (stakes: string) => void;
  onProFeatureBlock: (label: string) => void;
}

export function DefenderSection({
  defenderEnabled, defenderStakes, playerCount,
  canUseGame,
  onDefenderEnabledChange, onDefenderStakesChange,
  onProFeatureBlock,
}: DefenderSectionProps) {
  if (playerCount !== 3 && playerCount !== 4) return null;
  const allowed = canUseGame('defender');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 6 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => { if (allowed) onDefenderEnabledChange(!defenderEnabled); else onProFeatureBlock('Defender'); }}
      className={cn(
        gameCardBase,
        defenderEnabled && allowed && gameCardSelected,
        !allowed && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!allowed && <Lock className="w-4 h-4 text-muted-foreground" />}
          <div className={iconBoxClass(defenderEnabled && allowed, !allowed)}>
            <Shield className={iconClass(defenderEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground flex items-center gap-2">
              Defender{!allowed && <ProLabel />}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">1 vs. field · rotating defender</p>
          </div>
        </div>
        <Switch
          checked={defenderEnabled}
          disabled={!allowed}
          onCheckedChange={(checked) => { if (allowed) onDefenderEnabledChange(checked); else onProFeatureBlock('Defender'); }}
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
              type="number" placeholder="1" value={defenderStakes}
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
  );
}

// ── Sixes / Round Robin (4 players) ───────────────────────────────────────

export interface SixesSectionProps {
  sixesEnabled: boolean;
  sixesStakes: string;
  playerCount: number;
  canUseGame: (game: string) => boolean;
  onSixesEnabledChange: (enabled: boolean) => void;
  onSixesStakesChange: (stakes: string) => void;
  onProFeatureBlock: (label: string) => void;
}

export function SixesSection({
  sixesEnabled, sixesStakes, playerCount,
  canUseGame,
  onSixesEnabledChange, onSixesStakesChange,
  onProFeatureBlock,
}: SixesSectionProps) {
  if (playerCount !== 4) return null;
  const allowed = canUseGame('sixes');
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 7 * 0.04, ...springTransition }}
      whileTap={{ scale: 0.99 }}
      onClick={() => { if (allowed) onSixesEnabledChange(!sixesEnabled); else onProFeatureBlock('Sixes'); }}
      className={cn(
        gameCardBase,
        sixesEnabled && allowed && gameCardSelected,
        !allowed && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!allowed && <Lock className="w-4 h-4 text-muted-foreground" />}
          <div className={iconBoxClass(sixesEnabled && allowed, !allowed)}>
            <RotateCcw className={iconClass(sixesEnabled && allowed, !allowed)} />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground flex items-center gap-2">
              Sixes (Round Robin){!allowed && <ProLabel />}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">3 rotating 2v2 segments · 6 holes each</p>
          </div>
        </div>
        <Switch
          checked={sixesEnabled}
          disabled={!allowed}
          onCheckedChange={(checked) => { if (allowed) onSixesEnabledChange(checked); else onProFeatureBlock('Sixes'); }}
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
              type="number" placeholder="1" value={sixesStakes}
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
  );
}
