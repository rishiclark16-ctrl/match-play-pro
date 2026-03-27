/**
 * HouseGameEngine
 *
 * Bridge between ActivePrimitive[] and the round scoring system.
 * Pure functions only — no side effects, no imports of React or hooks.
 *
 * buildConfig() maps all 75+ primitives to a ScoringConfig.
 * 15 primitives are fully implemented (populated correctly + scoring honours them).
 * All others are stubbed: they log a warning and set a safe default so the app never crashes.
 * STUB comments mark every unimplemented primitive for easy future lookup.
 */

import { ActivePrimitive } from '@/types/houseGame';
import { buildScoringConfig } from '@/lib/houseGame/engine';

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
export function buildConfig(activePrimitives: ActivePrimitive[]): ScoringConfig {
  // Delegate raw primitive → flat flag conversion to existing engine
  const c = buildScoringConfig(activePrimitives);

  // ── Active formats ─────────────────────────────────────────────────────────
  const activeFormats: string[] = [];
  if (c.nassau)     activeFormats.push('nassau');
  if (c.skins)      activeFormats.push('skins');
  if (c.matchPlay)  activeFormats.push('match');
  if (c.stableford) activeFormats.push('stableford');

  // STUB: formats below are logged + ignored in scoring
  if (c.wolf)           { activeFormats.push('wolf');             console.warn('[HouseGame STUB] format_wolf not yet implemented'); }
  if (c.vegas)          { console.warn('[HouseGame STUB] format_vegas not yet implemented'); }
  if (c.hammer)         { console.warn('[HouseGame STUB] format_hammer not yet implemented'); }
  if (c.bingoBangoBongo){ console.warn('[HouseGame STUB] format_bingo_bango_bongo not yet implemented'); }
  if (c.rabbit)         { console.warn('[HouseGame STUB] format_rabbit not yet implemented'); }
  if (c.quota)          { console.warn('[HouseGame STUB] format_quota not yet implemented'); }
  if (c.defender)       { console.warn('[HouseGame STUB] format_defender not yet implemented'); }
  if (c.sixes)          { console.warn('[HouseGame STUB] group_sixes not yet implemented'); }

  // ── Press rules ────────────────────────────────────────────────────────────
  let pressTrigger: PressRules['trigger'] = 'none';
  let pressThreshold: number | undefined;

  if (c.pressAutoXDown !== null) {
    // IMPLEMENTED: press_auto_x_down — threshold detected, banner shown, press auto-created
    pressTrigger = 'x_down';
    pressThreshold = c.pressAutoXDown;
  } else if (c.pressAutoBirdie) {
    pressTrigger = 'birdie';
    // STUB: press_auto_birdie — trigger detected but real-time creation not yet wired
    console.warn('[HouseGame STUB] press_auto_birdie real-time trigger not yet wired');
  } else if (c.pressBack9Auto) {
    pressTrigger = 'back9';
    // STUB: press_back9_auto
    console.warn('[HouseGame STUB] press_back9_auto not yet wired');
  }

  // STUB: remaining press options (safe defaults: no enforcement)
  if (c.pressManualRequest)    console.warn('[HouseGame STUB] press_manual_request not yet wired');
  if (c.pressRequiresAcceptance) console.warn('[HouseGame STUB] press_requires_acceptance not yet wired');
  if (c.pressDoubleOrNothing)  console.warn('[HouseGame STUB] press_double_or_nothing not yet wired');
  if (c.pressMaxPerRound !== null) console.warn('[HouseGame STUB] press_max_per_round not yet wired');
  if (c.pressNewSubmatch)      console.warn('[HouseGame STUB] press_new_submatch not yet wired');
  if (c.pressNoDormie)         console.warn('[HouseGame STUB] press_no_dormie not yet wired');

  // ── Multipliers ────────────────────────────────────────────────────────────
  // IMPLEMENTED: par5Double, birdieUnits, eagleUnits — handled inside calculateHouseGame
  // STUB: par3Special rules beyond par5Double
  if (c.par3Special !== 'none') console.warn('[HouseGame STUB] bonus_par3_special not yet wired into per-hole scoring');
  if (c.lastHoleDouble)         console.warn('[HouseGame STUB] bonus_last_hole_double not yet wired');

  // ── Carryover rules ────────────────────────────────────────────────────────
  // IMPLEMENTED: carryoverSkinsHalved — passed to calculateSkins as carryover=true
  // STUB: remaining carryover options (safe defaults: disabled)
  if (c.carryoverCap !== null)   console.warn('[HouseGame STUB] carryover_cap not yet wired');
  if (c.carryoverJackpot18)      console.warn('[HouseGame STUB] carryover_jackpot_18 not yet wired');
  if (c.carryoverResetOnWin)     console.warn('[HouseGame STUB] carryover_reset_on_win not yet wired');
  if (c.carryoverNassauHalved)   console.warn('[HouseGame STUB] carryover_nassau_halved not yet wired');

  // ── Handicap ───────────────────────────────────────────────────────────────
  // IMPLEMENTED: percentage (100/90/80/75/0), useStrokeIndex, ghostPlayer
  // STUB: mixedTees, bumpAndRun
  if (c.handicapMixedTees)  console.warn('[HouseGame STUB] handicap_mixed_tees not yet wired');
  if (c.handicapBumpAndRun) console.warn('[HouseGame STUB] handicap_bump_and_run not yet wired');

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
    console.warn(`[HouseGame STUB] Garbage bets [${garbageBets.join(', ')}] listed but not tracked hole-by-hole`);
  }
  if (c.garbageTracking) {
    garbageBets.push('garbage_tracking');
    console.warn('[HouseGame STUB] bonus_garbage_tracking aggregate tracking not yet wired');
  }

  // ── Settlement extras ──────────────────────────────────────────────────────
  // IMPLEMENTED: unitValue, netOut (pairwise netting is always on; this flag adds a UI banner),
  //              rainShortened (proportional nassau if round closed early)
  // STUB: remaining settlement options
  if (c.payPerHole)   console.warn('[HouseGame STUB] settlement_pay_per_hole not yet wired');
  if (c.runningTab)   console.warn('[HouseGame STUB] settlement_running_tab not yet wired');
  if (c.maxLossCap !== null) console.warn('[HouseGame STUB] settlement_max_loss_cap not yet wired');
  if (c.tiesCarryover) console.warn('[HouseGame STUB] settlement_ties_carryover not yet wired');

  // ── Group rules ────────────────────────────────────────────────────────────
  // STUB: all group rules
  if (c.teamsFixed)    console.warn('[HouseGame STUB] group_teams_fixed not yet wired');
  if (c.teamsRotating) console.warn('[HouseGame STUB] group_teams_rotating not yet wired');
  if (c.pointBank)     console.warn('[HouseGame STUB] group_point_bank not yet wired');
  if (c.pickupRule)    console.warn('[HouseGame STUB] group_pickup_rule not yet wired');
  if (c.subIn !== null) console.warn('[HouseGame STUB] group_sub_in not yet wired');

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
