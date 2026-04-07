/**
 * HouseGameEngine
 *
 * Bridge between ActivePrimitive[] and the round scoring system.
 * Pure functions only — no side effects, no imports of React or hooks.
 *
 * buildConfig() maps all 75+ primitives to a ScoringConfig.
 * All primitives map to ScoringConfig fields. Implemented primitives (those that
 * actively affect scoring) are marked with // IMPLEMENTED comments below.
 * Stubs are marked with // STUB and log console warnings but never crash.
 */

import { ActivePrimitive } from '@/types/houseGame';
import { buildScoringConfig } from '@/lib/houseGame/engine';
import { logger } from '@/lib/logger';

// ─── ScoringConfig type ───────────────────────────────────────────────────────

export interface PressRules {
  /** 'x_down' | 'birdie' | 'back9' | 'none' */
  trigger: 'x_down' | 'birdie' | 'back9' | 'none';
  /** Holes down threshold for x_down trigger */
  threshold?: number;
  createsSubMatch: boolean;
  requiresAcceptance: boolean;
}

export interface ScoringConfig {
  /** Which base formats are active: 'nassau' | 'skins' | 'match' | 'stableford' | ... */
  activeFormats: string[];
  pressRules: PressRules;
  multipliers: {
    par5Double: boolean;
    par3Rule: 'double' | 'half' | 'separate_pot' | null;
    birdieUnits: number;    // 0 = disabled
    eagleUnits: number;     // 0 = disabled
  };
  carryoverRules: {
    skinsCarry: boolean;
    nassauCarry: boolean;
    cap: number | null;
    jackpotOn18: boolean;
  };
  handicapConfig: {
    percentage: number;     // 100 | 90 | 80 | 75 | 0
    useStrokeIndex: boolean;
    ghostPlayer: boolean;
    mixedTees: boolean;
  };
  casualRules: {
    gimmeDistance: number | null;   // feet, null = none
    mulligans: number;              // 0 = none
    noBlood: boolean;               // cap at net double bogey
    breakfastBall: boolean;
  };
  settlementConfig: {
    unitValue: number;              // dollars per unit
    netOut: boolean;                // net all debts across players
    runningTab: boolean;
    rainShortened: boolean;         // proportional settlement if closed early
    maxLoss: number | null;
    tieRule: 'split' | 'carryover';
  };
  /** Active garbage / junk bet ids (greenie, sandie, barkie, …) */
  garbageBets: string[];
}

// ─── validateConfig ───────────────────────────────────────────────────────────

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate that the selected primitives don't contain incompatible combinations.
 * Call before saving a House Game to surface user-facing errors.
 */
export function validateConfig(activePrimitives: ActivePrimitive[]): ConfigValidationResult {
  // Custom primitives (AI-created) have no scoring config — skip them for validation
  const standardPrimitives = activePrimitives.filter(p => !p.id.startsWith('custom_'));
  const c = buildScoringConfig(standardPrimitives);
  const activeIds = new Set(standardPrimitives.map(p => p.id));
  const errors: string[] = [];

  if (c.nassau && c.stableford) {
    errors.push("Nassau and Stableford can't run together — pick one.");
  }
  if (c.matchPlay && c.stableford) {
    errors.push("Match Play and Stableford can't run together — pick one.");
  }

  // Skins + back-9 skins selected together
  if (activeIds.has('format_skins') && activeIds.has('format_skins_back9_only')) {
    errors.push("Pick either Skins or Back-9 Skins, not both.");
  }

  // Ties carryover + ties split selected together — use activeIds because
  // config flags are mutually exclusive (last primitive wins), so check the
  // raw primitive list to detect both being explicitly selected.
  if (activeIds.has('settlement_ties_carryover') && activeIds.has('settlement_ties_split')) {
    errors.push("Choose either Ties Split or Ties Carryover, not both.");
  }

  // Nassau + Match Play selected together
  if (c.nassau && c.matchPlay) {
    errors.push("Nassau and Match Play can't run together — pick one.");
  }

  // Handicap scratch + any handicap percentage primitive
  const handicapPctIds = ['handicap_full', 'handicap_90_pct', 'handicap_80_pct', 'handicap_75_pct'];
  const hasScratch = activeIds.has('handicap_scratch');
  const hasPctHandicap = handicapPctIds.some(id => activeIds.has(id));
  if (hasScratch && hasPctHandicap) {
    errors.push("Pick one handicap setting.");
  }

  return { valid: errors.length === 0, errors };
}

// ─── buildConfig ─────────────────────────────────────────────────────────────

/**
 * Convert an array of ActivePrimitives into a fully-typed ScoringConfig.
 *
 * Implemented (fully wired into scoring):
 *   format_nassau, format_skins, carryover_skins_halved,
 *   press_auto_x_down,
 *   bonus_birdie_unit, bonus_par5_double,
 *   handicap_full/90/80/75, handicap_stroke_index, handicap_ghost_player,
 *   casual_no_blood, casual_mulligans, casual_gimme_distance,
 *   settlement_unit_value, settlement_net_out, settlement_rain_shortened
 */
export function buildConfig(activePrimitives: ActivePrimitive[]): ScoringConfig & { warnings: string[] } {
  // Delegate raw primitive → flat flag conversion to existing engine
  const c = buildScoringConfig(activePrimitives);

  // Track which stub features were selected so the UI can inform users
  const warnings: string[] = [];

  // ── Active formats ─────────────────────────────────────────────────────────
  const activeFormats: string[] = [];
  if (c.nassau)     activeFormats.push('nassau');
  if (c.skins)      activeFormats.push('skins');
  if (c.matchPlay)  activeFormats.push('match');
  if (c.stableford) activeFormats.push('stableford');

  // STUB: Wolf and Hammer still not scoring-integrated in AI builder
  if (c.wolf) {
    activeFormats.push('wolf');
    logger.warn('[HouseGame] Wolf format not yet implemented in AI builder');
    warnings.push('Wolf format is not yet available in AI-built games. Use the standard Wolf game instead.');
  }
  if (c.vegas)            activeFormats.push('vegas');
  if (c.hammer) {
    logger.warn('[HouseGame] Hammer format not yet implemented in AI builder');
    warnings.push('Hammer format is not yet available in AI-built games.');
  }
  if (c.bingoBangoBongo)  activeFormats.push('bingo_bango_bongo');
  if (c.rabbit)           activeFormats.push('rabbit');
  if (c.quota)            activeFormats.push('quota');
  if (c.nines)            activeFormats.push('nines');
  if (c.defender)         activeFormats.push('defender');
  if (c.sixes)            activeFormats.push('sixes');

  // ── Press rules ────────────────────────────────────────────────────────────
  let pressTrigger: PressRules['trigger'] = 'none';
  let pressThreshold: number | undefined;

  if (c.pressAutoXDown !== null) {
    // IMPLEMENTED: press_auto_x_down — threshold detected, banner shown, press auto-created
    pressTrigger = 'x_down';
    pressThreshold = c.pressAutoXDown;
  } else if (c.pressAutoBirdie) {
    pressTrigger = 'birdie';
  } else if (c.pressBack9Auto) {
    pressTrigger = 'back9';
    // STUB: press_back9_auto
    logger.warn('[HouseGame] Back-9 auto-press not yet wired');
    warnings.push('Back-9 auto-press is not yet supported. Presses will need to be triggered manually.');
  }

  // STUB: remaining press options (safe defaults: no enforcement)
  if (c.pressManualRequest) {
    logger.warn('[HouseGame] Manual press requests not yet wired');
    warnings.push('Manual press requests are not yet supported.');
  }
  if (c.pressRequiresAcceptance) {
    logger.warn('[HouseGame] Press acceptance requirement not yet wired');
    warnings.push('Press acceptance requirement is not yet enforced.');
  }
  if (c.pressDoubleOrNothing) {
    logger.warn('[HouseGame] Press double-or-nothing not yet wired');
    warnings.push('Double-or-nothing press is not yet supported.');
  }
  if (c.pressMaxPerRound !== null) {
    logger.warn('[HouseGame] Max presses per round not yet wired');
    warnings.push('Max presses per round limit is not yet enforced.');
  }
  if (c.pressNewSubmatch) {
    logger.warn('[HouseGame] Press sub-match creation not yet wired');
    warnings.push('Press sub-match creation is not yet supported.');
  }
  if (c.pressNoDormie) {
    logger.warn('[HouseGame] No-dormie press rule not yet wired');
    warnings.push('No-dormie press rule is not yet enforced.');
  }

  // ── Multipliers ────────────────────────────────────────────────────────────
  // IMPLEMENTED: par5Double, birdieUnits, eagleUnits — handled inside calculateHouseGame
  // STUB: par3Special rules beyond par5Double
  if (c.par3Special !== 'none') {
    logger.warn('[HouseGame] Par-3 special rules not yet wired into per-hole scoring');
    warnings.push('Par-3 special rules (double/half/separate pot) are not yet applied during scoring.');
  }
  if (c.lastHoleDouble) {
    logger.warn('[HouseGame] Last hole double not yet wired');
    warnings.push('Last hole double value is not yet applied during scoring.');
  }

  // ── Carryover rules ────────────────────────────────────────────────────────
  // IMPLEMENTED: carryoverSkinsHalved — passed to calculateSkins as carryover=true
  // STUB: remaining carryover options (safe defaults: disabled)
  if (c.carryoverCap !== null) {
    logger.warn('[HouseGame] Carryover cap not yet wired');
    warnings.push('Carryover cap is not yet enforced. Skins can carry over without limit.');
  }
  if (c.carryoverJackpot18) {
    logger.warn('[HouseGame] Jackpot on hole 18 not yet wired');
    warnings.push('Jackpot on hole 18 is not yet applied automatically.');
  }
  if (c.carryoverResetOnWin) {
    logger.warn('[HouseGame] Carryover reset-on-win not yet wired');
    warnings.push('Carryover reset-on-win is not yet enforced.');
  }
  if (c.carryoverNassauHalved) {
    logger.warn('[HouseGame] Nassau carryover (halved) not yet wired');
    warnings.push('Nassau carryover (halved) is not yet applied.');
  }

  // ── Handicap ───────────────────────────────────────────────────────────────
  // IMPLEMENTED: percentage (100/90/80/75/0), useStrokeIndex, ghostPlayer
  // STUB: mixedTees, bumpAndRun
  // handicap_mixed_tees is handled via per-player TeeSet in usePlayersWithScores
  if (c.handicapBumpAndRun) {
    logger.warn('[HouseGame] Bump-and-run handicap not yet wired');
    warnings.push('Bump-and-run handicap adjustment is not yet supported.');
  }

  // ── Garbage bets ───────────────────────────────────────────────────────────
  const garbageBets: string[] = [];
  if (c.greenie)  garbageBets.push('greenie');
  if (c.sandie)   garbageBets.push('sandie');
  if (c.barkie)   garbageBets.push('barkie');
  if (c.oozle)    garbageBets.push('oozle');
  if (c.chippy)   garbageBets.push('chippy');
  if (c.polie)    garbageBets.push('polie');
  // STUB: garbage bets show in settlement section but aren't tracked hole-by-hole yet
  if (garbageBets.length > 0) {
    logger.warn('[HouseGame] Garbage bets listed but not tracked hole-by-hole', {
      data: { bets: garbageBets },
    });
    warnings.push(`Garbage bets (${garbageBets.join(', ')}) will appear at settlement but are not tracked hole-by-hole during the round.`);
  }
  if (c.garbageTracking) {
    garbageBets.push('garbage_tracking');
    logger.warn('[HouseGame] Aggregate garbage tracking not yet wired');
    warnings.push('Aggregate garbage bet tracking is not yet supported.');
  }

  // ── Settlement extras ──────────────────────────────────────────────────────
  // IMPLEMENTED: unitValue, netOut (pairwise netting is always on; this flag adds a UI banner),
  //              rainShortened (proportional nassau if round closed early)
  // STUB: remaining settlement options
  if (c.payPerHole) {
    logger.warn('[HouseGame] Pay-per-hole settlement not yet wired');
    warnings.push('Pay-per-hole settlement is not yet supported. Settlement will be calculated at end of round.');
  }
  if (c.runningTab) {
    logger.warn('[HouseGame] Running tab not yet wired');
    warnings.push('Running tab display is not yet supported.');
  }
  // settlement_max_loss_cap — implemented in calculateHouseGame
  if (c.tiesCarryover) {
    logger.warn('[HouseGame] Ties carryover not yet wired');
    warnings.push('Ties carryover rule is not yet enforced. Ties will be split by default.');
  }

  // ── Group rules ────────────────────────────────────────────────────────────
  // STUB: all group rules
  if (c.teamsFixed) {
    logger.warn('[HouseGame] Fixed teams not yet wired');
    warnings.push('Fixed team assignments are not yet supported in AI-built games.');
  }
  if (c.teamsRotating) {
    logger.warn('[HouseGame] Rotating teams not yet wired');
    warnings.push('Rotating team assignments are not yet supported in AI-built games.');
  }
  if (c.pointBank) {
    logger.warn('[HouseGame] Point bank not yet wired');
    warnings.push('Point bank group format is not yet supported.');
  }
  // group_pickup_rule — handled at score entry (pickup = par + 2 + handicap strokes)
  if (c.subIn !== null) {
    logger.warn('[HouseGame] Sub-in rule not yet wired');
    warnings.push('Player substitution rule is not yet supported.');
  }

  return {
    activeFormats,
    pressRules: {
      trigger: pressTrigger,
      threshold: pressThreshold,
      createsSubMatch: c.pressNewSubmatch,
      requiresAcceptance: c.pressRequiresAcceptance,
    },
    multipliers: {
      par5Double: c.par5Double,
      par3Rule: c.par3Special !== 'none' ? (c.par3Special as 'double' | 'half' | 'separate_pot') : null,
      birdieUnits: c.birdieUnitBonus,
      eagleUnits: c.eagleUnitBonus,
    },
    carryoverRules: {
      skinsCarry: c.carryoverSkinsHalved,
      nassauCarry: c.carryoverNassauHalved,
      cap: c.carryoverCap,
      jackpotOn18: c.carryoverJackpot18,
    },
    handicapConfig: {
      percentage: c.handicapPct,
      useStrokeIndex: c.handicapStrokeIndex,
      ghostPlayer: c.handicapGhostPlayer,
      mixedTees: c.handicapMixedTees,
    },
    casualRules: {
      gimmeDistance: c.gimmeDistance,
      mulligans: c.mulligans,
      noBlood: c.noBlood,
      breakfastBall: c.breakfastBall,
    },
    settlementConfig: {
      unitValue: c.unitValue,
      netOut: c.netOut,
      runningTab: c.runningTab,
      rainShortened: c.rainShortened,
      maxLoss: c.maxLossCap,
      tieRule: c.tiesCarryover ? 'carryover' : 'split',
    },
    garbageBets,
    warnings,
  };
}

/**
 * Build a human-readable summary of the most important active config items.
 * Returns up to `limit` lines (default 5).
 */
export function summarizeScoringConfig(config: ScoringConfig, limit = 5): string[] {
  const lines: string[] = [];
  if (config.activeFormats.includes('nassau')) lines.push('Nassau (front / back / overall)');
  if (config.activeFormats.includes('skins'))  lines.push(`Skins${config.carryoverRules.skinsCarry ? ' with carryover' : ''}`);
  if (config.activeFormats.includes('match'))  lines.push('Match Play');
  if (config.activeFormats.includes('stableford')) lines.push('Stableford');
  if (config.activeFormats.includes('bingo_bango_bongo')) lines.push('Bingo Bango Bongo');
  if (config.pressRules.trigger === 'x_down' && config.pressRules.threshold) {
    lines.push(`Auto-press when ${config.pressRules.threshold} down`);
  }
  if (config.multipliers.par5Double)              lines.push('Par 5s worth double');
  if (config.multipliers.birdieUnits > 0)         lines.push(`Birdie = +${config.multipliers.birdieUnits} unit`);
  if (config.multipliers.eagleUnits > 0)          lines.push(`Eagle = +${config.multipliers.eagleUnits} units`);
  if (config.casualRules.noBlood)                 lines.push('No blood (double bogey cap)');
  if (config.handicapConfig.percentage !== 100)   lines.push(`${config.handicapConfig.percentage}% handicap`);
  if (config.settlementConfig.unitValue !== 1)    lines.push(`$${config.settlementConfig.unitValue} per unit`);
  if (config.casualRules.gimmeDistance !== null)  lines.push(`Gimmes inside ${config.casualRules.gimmeDistance}ft`);
  if (config.casualRules.mulligans > 0)           lines.push(`${config.casualRules.mulligans} mulligan${config.casualRules.mulligans > 1 ? 's' : ''}`);
  return lines.slice(0, limit);
}
