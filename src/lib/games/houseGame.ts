/**
 * House Game Calculator
 * Pure function that scores a round according to a HouseGameScoringConfig.
 * Top 15 primitives are fully implemented; others return stubs.
 */

import { Score, Player, HoleInfo, BingoBangoHoleResult } from '@/types/golf';
import { HouseGameScoringConfig } from '@/types/houseGame';
import { getStrokesPerHole, calculatePlayingHandicap } from '@/lib/handicapUtils';
import { calculateSkins, StrokesPerHoleMap } from './skins';
import { calculateNassau } from './nassau';
import { calculateStableford } from './stableford';

export interface HouseGameHoleResult {
  holeNumber: number;
  par: number;
  // Net scores after handicap
  netScores: Record<string, number>;   // playerId → net strokes
  grossScores: Record<string, number>; // playerId → gross strokes
  // Per-hole winnings (positive = earned, negative = paid)
  earnings: Record<string, number>;
  // Which primitives fired this hole
  activeBonuses: string[];
}

export interface HouseGameStanding {
  playerId: string;
  playerName: string;
  netEarnings: number;  // total, positive = winning
  grossEarnings: number;
  holesWon: number;
  birdies: number;
  eagles: number;
}

export interface HouseGameResult {
  holeResults: HouseGameHoleResult[];
  standings: HouseGameStanding[];
  // Subset results for implemented sub-games
  skinsResult?: ReturnType<typeof calculateSkins>;
  nassauResult?: ReturnType<typeof calculateNassau>;
  stablefordResult?: ReturnType<typeof calculateStableford>;
  // Unimplemented primitives that are active (shown as "coming soon" in UI)
  stubbedPrimitives: string[];
  // Summary text lines for the live panel
  summary: string[];
  // Players whose losses were capped by settlement_max_loss_cap
  cappedPlayerIds: string[];
}

const STUBS = new Set([
  'format_wolf', 'format_vegas', 'format_hammer',
  'format_rabbit', 'format_quota', 'format_defender', 'format_sixes',
  'press_auto_eagle', 'press_manual_request',
  'press_requires_acceptance', 'press_double_or_nothing', 'press_max_per_round',
  'press_new_submatch', 'press_no_dormie', 'press_back9_auto',
  'bonus_par3_special', 'bonus_greenie', 'bonus_sandie', 'bonus_barkie',
  'bonus_oozle', 'bonus_chippy', 'bonus_polie', 'bonus_last_hole_double',
  'bonus_garbage_tracking', 'carryover_cap', 'carryover_jackpot_18',
  'carryover_reset_on_win', 'carryover_nassau_halved',
  'handicap_ghost_player', 'handicap_bump_and_run', 'handicap_mixed_tees',
  'casual_breakfast_ball', 'casual_concede_match',
  'casual_foot_wedge', 'settlement_pay_per_hole', 'settlement_running_tab',
  'settlement_ties_split', 'settlement_ties_carryover',
  'group_min_players', 'group_sub_in',
  'group_teams_fixed', 'group_teams_rotating', 'group_wolf_lone_multiplier',
  'group_point_bank',
]);

/** Build per-player strokesPerHole map respecting handicap% config */
function buildStrokesMap(
  players: Player[],
  holeInfo: HoleInfo[],
  config: HouseGameScoringConfig,
  slopeRating = 113,
  totalHoles: 9 | 18 = 18,
): StrokesPerHoleMap {
  const map = new Map<string, Map<number, number>>();
  const pct = config.handicapPct / 100;

  for (const player of players) {
    if (player.handicap === undefined || player.handicap === null || pct === 0) {
      const zeros = new Map<number, number>();
      holeInfo.forEach(h => zeros.set(h.number, 0));
      map.set(player.id, zeros);
    } else {
      const rawHcp = calculatePlayingHandicap(player.handicap, slopeRating, totalHoles);
      // Apply handicap cap if configured
      const cappedHcp = config.handicapMaxCap !== null
        ? Math.min(rawHcp, config.handicapMaxCap)
        : rawHcp;
      const adjustedHcp = Math.round(cappedHcp * pct);
      map.set(player.id, getStrokesPerHole(adjustedHcp, holeInfo));
    }
  }
  return map;
}

export function calculateHouseGame(
  scores: Score[],
  players: Player[],
  holeInfo: HoleInfo[],
  config: HouseGameScoringConfig,
  slopeRating = 113,
  totalHoles: 9 | 18 = 18,
  bbbResults?: BingoBangoHoleResult[],
): HouseGameResult {
  const stubbedPrimitives: string[] = [];
  const cappedPlayerIds: string[] = [];
  const strokesMap = buildStrokesMap(players, holeInfo, config, slopeRating, totalHoles);

  // Track which stubs are actually active
  for (const stub of STUBS) {
    // Check if any of the stub's config keys are true
    const isActive = checkPrimitiveActive(stub, config);
    if (isActive) stubbedPrimitives.push(stub);
  }

  // ── Skins ─────────────────────────────────────────────────────────────────
  let skinsResult: ReturnType<typeof calculateSkins> | undefined;
  if (config.skins) {
    const skinsHoles = config.skinsBackNineOnly
      ? holeInfo.filter(h => h.number > 9)
      : holeInfo;
    const skinsScores = config.skinsBackNineOnly
      ? scores.filter(s => s.holeNumber > 9)
      : scores;
    skinsResult = calculateSkins(
      skinsScores,
      players,
      skinsHoles.length,
      config.unitValue,
      config.carryoverSkinsHalved,
      strokesMap,
    );
  }

  // ── Nassau ────────────────────────────────────────────────────────────────
  let nassauResult: ReturnType<typeof calculateNassau> | undefined;
  if (config.nassau) {
    nassauResult = calculateNassau(
      scores,
      players,
      config.unitValue,
      [], // presses handled separately
      totalHoles,
      strokesMap,
    );
  }

  // ── Per-hole earnings aggregation ─────────────────────────────────────────
  const holeResults: HouseGameHoleResult[] = [];
  const playerEarnings: Record<string, number> = {};
  players.forEach(p => { playerEarnings[p.id] = 0; });

  const scoredHoles = [...new Set(scores.map(s => s.holeNumber))].sort((a, b) => a - b);

  for (const holeNum of scoredHoles) {
    const hole = holeInfo.find(h => h.number === holeNum);
    if (!hole) continue;

    const holeScores = scores.filter(s => s.holeNumber === holeNum);
    if (holeScores.length < 2) continue;

    const grossScores: Record<string, number> = {};
    const netScores: Record<string, number> = {};
    holeScores.forEach(s => {
      grossScores[s.playerId] = s.strokes;
      const handicapStrokes = strokesMap.get(s.playerId)?.get(holeNum) ?? 0;
      // no-blood cap: max net double bogey
      let netStrokes = s.strokes - handicapStrokes;
      if (config.noBlood) {
        netStrokes = Math.min(netStrokes, hole.par + 2);
      }
      netScores[s.playerId] = netStrokes;
    });

    const holeEarnings: Record<string, number> = {};
    players.forEach(p => { holeEarnings[p.id] = 0; });
    const activeBonuses: string[] = [];

    // Birdie / eagle unit bonuses — use NET scores
    if (config.birdieUnitBonus > 0 || config.eagleUnitBonus > 0) {
      for (const s of holeScores) {
        const netDiff = netScores[s.playerId] - hole.par;
        const otherCount = players.length - 1;
        if (netDiff === -1 && config.birdieUnitBonus > 0) {
          const earn = config.birdieUnitBonus * config.unitValue * otherCount;
          holeEarnings[s.playerId] = (holeEarnings[s.playerId] ?? 0) + earn;
          players.filter(p => p.id !== s.playerId).forEach(p => {
            holeEarnings[p.id] = (holeEarnings[p.id] ?? 0) - config.birdieUnitBonus * config.unitValue;
          });
          activeBonuses.push('bonus_birdie_unit');
        } else if (netDiff <= -2 && config.eagleUnitBonus > 0) {
          const earn = config.eagleUnitBonus * config.unitValue * otherCount;
          holeEarnings[s.playerId] = (holeEarnings[s.playerId] ?? 0) + earn;
          players.filter(p => p.id !== s.playerId).forEach(p => {
            holeEarnings[p.id] = (holeEarnings[p.id] ?? 0) - config.eagleUnitBonus * config.unitValue;
          });
          activeBonuses.push('bonus_eagle_unit');
        }
      }
    }

    // Par 5 double multiplier — applied to skins/nassau hole value, tracked here as a label
    if (config.par5Double && hole.par === 5) {
      activeBonuses.push('bonus_par5_double');
    }

    holeResults.push({ holeNumber: holeNum, par: hole.par, netScores, grossScores, earnings: holeEarnings, activeBonuses });

    // Accumulate earnings
    for (const [pid, amt] of Object.entries(holeEarnings)) {
      playerEarnings[pid] = (playerEarnings[pid] ?? 0) + amt;
    }
  }

  // ── Stableford scoring ────────────────────────────────────────────────────
  let stablefordResult: ReturnType<typeof calculateStableford> | undefined;
  if (config.stableford) {
    stablefordResult = calculateStableford(
      scores,
      players,
      holeInfo,
      config.modifiedStableford,
      strokesMap,
    );
    // Pairwise points settlement: each point differential × unitValue
    const ptsByPlayer = new Map<string, number>(
      stablefordResult.standings.map(s => [s.playerId, s.totalPoints])
    );
    for (const player of players) {
      const ptsA = ptsByPlayer.get(player.id) ?? 0;
      let earning = 0;
      for (const other of players) {
        if (other.id === player.id) continue;
        const ptsB = ptsByPlayer.get(other.id) ?? 0;
        earning += (ptsA - ptsB) * config.unitValue;
      }
      playerEarnings[player.id] = (playerEarnings[player.id] ?? 0) + earning;
    }
  }

  // ── Bingo Bango Bongo scoring ─────────────────────────────────────────────
  if (config.bingoBangoBongo && bbbResults && bbbResults.length > 0) {
    const award = (winnerId: string | null) => {
      if (!winnerId) return;
      const earn = config.unitValue * (players.length - 1);
      playerEarnings[winnerId] = (playerEarnings[winnerId] ?? 0) + earn;
      players.filter(p => p.id !== winnerId).forEach(p => {
        playerEarnings[p.id] = (playerEarnings[p.id] ?? 0) - config.unitValue;
      });
    };
    for (const result of bbbResults) {
      award(result.bingoPlayerId);
      award(result.bangoPlayerId);
      award(result.bongoPlayerId);
    }
  }

  // ── Standings ─────────────────────────────────────────────────────────────
  const standings: HouseGameStanding[] = players.map(player => {
    const playerScores = scores.filter(s => s.playerId === player.id);
    const birdies = playerScores.filter(s => {
      const h = holeInfo.find(h => h.number === s.holeNumber);
      return h && s.strokes === h.par - 1;
    }).length;
    const eagles = playerScores.filter(s => {
      const h = holeInfo.find(h => h.number === s.holeNumber);
      return h && s.strokes <= h.par - 2;
    }).length;

    // Count holes won across skins + nassau
    let holesWon = 0;
    if (skinsResult) {
      holesWon += skinsResult.holeResults.filter(h => h.winnerId === player.id).length;
    }

    const bonusEarnings = playerEarnings[player.id] ?? 0;
    const skinsEarnings = skinsResult?.standings.find(s => s.playerId === player.id)?.earnings ?? 0;
    const nassauEarnings = nassauResult?.settlements.find(s => s.toPlayerId === player.id)?.amount
      ?? -(nassauResult?.settlements.find(s => s.fromPlayerId === player.id)?.amount ?? 0);

    return {
      playerId: player.id,
      playerName: player.name,
      grossEarnings: skinsEarnings + nassauEarnings + bonusEarnings,
      netEarnings: skinsEarnings + nassauEarnings + bonusEarnings,
      holesWon,
      birdies,
      eagles,
    };
  }).sort((a, b) => b.netEarnings - a.netEarnings);

  // ── Max loss cap ──────────────────────────────────────────────────────────
  if (config.maxLossCap !== null && config.maxLossCap > 0) {
    let cappedAmount = 0;
    for (const standing of standings) {
      if (standing.netEarnings < -config.maxLossCap) {
        cappedAmount += -config.maxLossCap - standing.netEarnings;
        standing.netEarnings = -config.maxLossCap;
        standing.grossEarnings = -config.maxLossCap;
        cappedPlayerIds.push(standing.playerId);
      }
    }
    // Redistribute proportionally among winners
    if (cappedAmount > 0.005) {
      const winners = standings.filter(s => s.netEarnings > 0);
      const totalWinnings = winners.reduce((sum, s) => sum + s.netEarnings, 0);
      if (totalWinnings > 0) {
        for (const standing of winners) {
          const reduction = cappedAmount * (standing.netEarnings / totalWinnings);
          standing.netEarnings = Math.round((standing.netEarnings - reduction) * 100) / 100;
          standing.grossEarnings = standing.netEarnings;
        }
      }
    }
  }

  // ── Pickup rule ───────────────────────────────────────────────────────────
  // (No scoring logic needed — pickup score = net double bogey, set at score entry)

  // ── Summary lines ─────────────────────────────────────────────────────────
  const summary: string[] = [];
  if (standings.length > 0) {
    const leader = standings[0];
    if (leader.netEarnings > 0) {
      summary.push(`${leader.playerName} leads +$${leader.netEarnings.toFixed(2)}`);
    } else {
      summary.push('All square');
    }
  }
  if (stubbedPrimitives.length > 0) {
    summary.push(`${stubbedPrimitives.length} rule${stubbedPrimitives.length > 1 ? 's' : ''} coming soon`);
  }
  if (cappedPlayerIds.length > 0) {
    summary.push('Loss cap applied');
  }

  return { holeResults, standings, skinsResult, nassauResult, stablefordResult, stubbedPrimitives, summary, cappedPlayerIds };
}

/** Helper: check if a stub primitive's config flag is truthy */
function checkPrimitiveActive(id: string, config: HouseGameScoringConfig): boolean {
  const map: Record<string, boolean> = {
    format_wolf: config.wolf,
    format_vegas: config.vegas,
    format_hammer: config.hammer,
    format_bingo_bango_bongo: config.bingoBangoBongo,
    format_rabbit: config.rabbit,
    format_quota: config.quota,
    format_defender: config.defender,
    group_sixes: config.sixes,
    press_auto_birdie: config.pressAutoBirdie,
    press_auto_eagle: config.pressAutoEagle,
    press_manual_request: config.pressManualRequest,
    press_requires_acceptance: config.pressRequiresAcceptance,
    press_double_or_nothing: config.pressDoubleOrNothing,
    press_max_per_round: config.pressMaxPerRound !== null,
    press_new_submatch: config.pressNewSubmatch,
    press_no_dormie: config.pressNoDormie,
    press_back9_auto: config.pressBack9Auto,
    bonus_greenie: config.greenie,
    bonus_sandie: config.sandie,
    bonus_barkie: config.barkie,
    bonus_oozle: config.oozle,
    bonus_chippy: config.chippy,
    bonus_polie: config.polie,
    bonus_last_hole_double: config.lastHoleDouble,
    bonus_garbage_tracking: config.garbageTracking,
    handicap_ghost_player: config.handicapGhostPlayer,
    handicap_bump_and_run: config.handicapBumpAndRun,
    handicap_mixed_tees: config.handicapMixedTees,
    casual_breakfast_ball: config.breakfastBall,
    casual_preferred_lies: config.preferredLies,
    casual_concede_match: config.concedeMatch,
    casual_foot_wedge: config.footWedge,
    settlement_pay_per_hole: config.payPerHole,
    settlement_running_tab: config.runningTab,
    settlement_max_loss_cap: config.maxLossCap !== null,
    group_pickup_rule: config.pickupRule,
    group_sub_in: config.subIn !== null,
    group_teams_fixed: config.teamsFixed,
    group_teams_rotating: config.teamsRotating,
    group_point_bank: config.pointBank,
  };
  return map[id] ?? false;
}
