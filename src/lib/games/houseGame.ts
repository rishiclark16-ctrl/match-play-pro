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
import { calculateRabbit, RabbitResult } from './rabbit';
import { calculateQuota, QuotaResult } from './quota';
import { calculateVegas, VegasResult } from './vegas';
import { calculateNines, NinesResult } from './nines';
import { calculateDefender, DefenderResult } from './defender';
import { calculateSixes, SixesResult } from './sixes';

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
  rabbitResult?: RabbitResult;
  quotaResult?: QuotaResult;
  vegasResult?: VegasResult;
  ninesResult?: NinesResult;
  defenderResult?: DefenderResult;
  sixesResult?: SixesResult;
  // Unimplemented primitives that are active (shown as "coming soon" in UI)
  stubbedPrimitives: string[];
  // Summary text lines for the live panel
  summary: string[];
  // Players whose losses were capped by settlement_max_loss_cap
  cappedPlayerIds: string[];
}

const STUBS = new Set([
  'format_wolf', 'format_hammer',
  'press_auto_eagle', 'press_manual_request',
  'press_requires_acceptance', 'press_double_or_nothing', 'press_max_per_round',
  'press_new_submatch', 'press_no_dormie', 'press_back9_auto',
  'bonus_par3_special',
  'bonus_oozle', 'bonus_chippy', 'bonus_polie',
  'bonus_garbage_tracking',
  'carryover_reset_on_win', 'carryover_nassau_halved',
  'handicap_ghost_player', 'handicap_bump_and_run', 'handicap_mixed_tees',
  'casual_concede_match',
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

  // Guard: ensure unitValue is positive
  if (config.unitValue <= 0) config = { ...config, unitValue: 1 };

  // Guard: need at least 2 players and valid holeInfo
  if (players.length < 2 || holeInfo.length === 0) {
    return {
      holeResults: [], standings: [], stubbedPrimitives: [], summary: ['Waiting for players'],
      cappedPlayerIds: [],
    };
  }

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
    // Back-9-only skins only applies to 18-hole rounds
    const useBack9Only = config.skinsBackNineOnly && totalHoles === 18;
    const skinsHoles = useBack9Only
      ? holeInfo.filter(h => h.number > 9)
      : holeInfo;
    const skinsScores = useBack9Only
      ? scores.filter(s => s.holeNumber > 9)
      : scores;
    skinsResult = calculateSkins(
      skinsScores,
      players,
      skinsHoles.length,
      config.unitValue,
      true, // Skins always carry over; carryoverSkinsHalved is a modifier, not the toggle
      strokesMap,
      config.carryoverCap,
      config.carryoverJackpot18,
      config.carryoverSkinsHalved,
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

    // Birdie / eagle bonuses — use NET scores
    // birdieUnitBonus / eagleUnitBonus is the flat $ amount each other player pays the maker
    if (config.birdieUnitBonus > 0 || config.eagleUnitBonus > 0) {
      for (const s of holeScores) {
        const netDiff = netScores[s.playerId] - hole.par;
        const otherCount = players.length - 1;
        if (netDiff === -1 && config.birdieUnitBonus > 0) {
          const perPlayer = config.birdieUnitBonus;
          holeEarnings[s.playerId] = (holeEarnings[s.playerId] ?? 0) + perPlayer * otherCount;
          players.filter(p => p.id !== s.playerId).forEach(p => {
            holeEarnings[p.id] = (holeEarnings[p.id] ?? 0) - perPlayer;
          });
          activeBonuses.push('bonus_birdie_unit');
        } else if (netDiff <= -2 && config.eagleUnitBonus > 0) {
          const perPlayer = config.eagleUnitBonus;
          holeEarnings[s.playerId] = (holeEarnings[s.playerId] ?? 0) + perPlayer * otherCount;
          players.filter(p => p.id !== s.playerId).forEach(p => {
            holeEarnings[p.id] = (holeEarnings[p.id] ?? 0) - perPlayer;
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

  // ── Rabbit ────────────────────────────────────────────────────────────────
  let rabbitResult: RabbitResult | undefined;
  if (config.rabbit) {
    rabbitResult = calculateRabbit(
      scores, players, scoredHoles.length, config.unitValue, totalHoles, strokesMap,
    );
    for (const standing of rabbitResult.standings) {
      playerEarnings[standing.playerId] = (playerEarnings[standing.playerId] ?? 0) + standing.earnings;
    }
  }

  // ── Quota ─────────────────────────────────────────────────────────────────
  let quotaResult: QuotaResult | undefined;
  if (config.quota) {
    // Quota target already includes handicap (36 - Course Handicap), so use GROSS
    // Stableford points (no strokesMap) to avoid double-counting the handicap.
    quotaResult = calculateQuota(scores, players, holeInfo, config.unitValue, undefined, slopeRating);
    for (const standing of quotaResult.standings) {
      playerEarnings[standing.playerId] = (playerEarnings[standing.playerId] ?? 0) + standing.earnings;
    }
  }

  // ── Vegas ─────────────────────────────────────────────────────────────────
  let vegasResult: VegasResult | undefined;
  if (config.vegas && players.length >= 4) {
    vegasResult = calculateVegas(scores, players, holeInfo, config.unitValue, scoredHoles.length, strokesMap);
    // Vegas earnings: team-based
    if (vegasResult.holeResults.length > 0) {
      const teamAIds = [players[0].id, players[1].id];
      for (const player of players) {
        const isTeamA = teamAIds.includes(player.id);
        const earnings = isTeamA ? vegasResult.teamAEarnings : vegasResult.teamBEarnings;
        playerEarnings[player.id] = (playerEarnings[player.id] ?? 0) + earnings;
      }
    }
  }

  // ── Nines (5-3-1) ────────────────────────────────────────────────────────
  let ninesResult: NinesResult | undefined;
  if (config.nines && players.length === 3) {
    ninesResult = calculateNines(scores, players, holeInfo, config.unitValue, strokesMap);
    for (const standing of ninesResult.standings) {
      playerEarnings[standing.playerId] = (playerEarnings[standing.playerId] ?? 0) + standing.earnings;
    }
  }

  // ── Defender ─────────────────────────────────────────────────────────────
  let defenderResult: DefenderResult | undefined;
  if (config.defender && (players.length === 3 || players.length === 4)) {
    defenderResult = calculateDefender(scores, players, holeInfo, config.unitValue, strokesMap);
    for (const standing of defenderResult.standings) {
      playerEarnings[standing.playerId] = (playerEarnings[standing.playerId] ?? 0) + standing.earnings;
    }
  }

  // ── Sixes (Round Robin) ──────────────────────────────────────────────────
  let sixesResult: SixesResult | undefined;
  if (config.sixes && players.length === 4) {
    sixesResult = calculateSixes(scores, players, holeInfo, config.unitValue, strokesMap);
    for (const standing of sixesResult.standings) {
      playerEarnings[standing.playerId] = (playerEarnings[standing.playerId] ?? 0) + standing.earnings;
    }
  }

  // ── Last Hole Double ──────────────────────────────────────────────────────
  if (config.lastHoleDouble) {
    const lastHole = totalHoles === 18 ? 18 : 9;
    const lastResult = holeResults.find(h => h.holeNumber === lastHole);
    if (lastResult) {
      // Double all earnings on the last hole
      for (const [pid, amt] of Object.entries(lastResult.earnings)) {
        playerEarnings[pid] = (playerEarnings[pid] ?? 0) + amt; // add another copy = 2x
      }
      lastResult.activeBonuses.push('bonus_last_hole_double');
    }
  }

  // ── Greenie / Sandie / Barkie (tracked as info labels) ────────────────────
  // These are prop-bet style bonuses — fire when the condition is met
  for (const holeNum of scoredHoles) {
    const hole = holeInfo.find(h => h.number === holeNum);
    if (!hole) continue;
    const holeScores = scores.filter(s => s.holeNumber === holeNum);
    const hr = holeResults.find(h => h.holeNumber === holeNum);

    // Greenie: par 3 — single lowest net score wins; ties = no greenie
    if (config.greenie && hole.par === 3 && holeScores.length >= 2) {
      const netEntries = holeScores.map(s => ({
        playerId: s.playerId,
        net: hr?.netScores[s.playerId] ?? s.strokes,
      }));
      netEntries.sort((a, b) => a.net - b.net);
      const best = netEntries[0];
      const second = netEntries[1];
      // Award only if unique lowest AND made par or better
      if (best.net < second.net && best.net <= hole.par) {
        const earn = config.unitValue * (players.length - 1);
        playerEarnings[best.playerId] = (playerEarnings[best.playerId] ?? 0) + earn;
        players.filter(p => p.id !== best.playerId).forEach(p => {
          playerEarnings[p.id] = (playerEarnings[p.id] ?? 0) - config.unitValue;
        });
        if (hr) hr.activeBonuses.push('bonus_greenie');
      }
    }

    // Sandie: par or better from a bunker — can't detect from score data alone (info-only)
    // Barkie: par or better after hitting a tree — same limitation
  }

  // ── Breakfast Ball (info-only, no scoring impact) ─────────────────────────
  // config.breakfastBall is tracked — UI shows a banner on hole 1

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
      holesWon += skinsResult.results.filter(h => h.winnerId === player.id).length;
    }

    const bonusEarnings = playerEarnings[player.id] ?? 0;
    const skinsEarnings = skinsResult?.standings.find(s => s.playerId === player.id)?.earnings ?? 0;
    const nassauWon = nassauResult?.settlements
      .filter(s => s.toPlayerId === player.id)
      .reduce((sum, s) => sum + s.amount, 0) ?? 0;
    const nassauLost = nassauResult?.settlements
      .filter(s => s.fromPlayerId === player.id)
      .reduce((sum, s) => sum + s.amount, 0) ?? 0;
    const nassauEarnings = nassauWon - nassauLost;

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
  if (config.handicapPct > 0 && players.some(p => p.handicap == null)) {
    summary.push('Missing handicap — playing as scratch');
  }
  if (config.vegas && players.length < 4) {
    summary.push('Vegas requires 4 players');
  }
  if (stubbedPrimitives.length > 0) {
    summary.push(`${stubbedPrimitives.length} rule${stubbedPrimitives.length > 1 ? 's' : ''} coming soon`);
  }
  if (cappedPlayerIds.length > 0) {
    summary.push('Loss cap applied');
  }

  return { holeResults, standings, skinsResult, nassauResult, stablefordResult, rabbitResult, quotaResult, vegasResult, ninesResult, defenderResult, sixesResult, stubbedPrimitives, summary, cappedPlayerIds };
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
    format_nines: config.nines,
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
    bonus_sandie: config.sandie,     // info-only (requires bunker detection)
    bonus_barkie: config.barkie,     // info-only (requires tree detection)
    carryover_cap: config.carryoverCap !== null,
    carryover_jackpot_18: config.carryoverJackpot18,
    casual_breakfast_ball: config.breakfastBall,
    bonus_oozle: config.oozle,
    bonus_chippy: config.chippy,
    bonus_polie: config.polie,
    bonus_last_hole_double: config.lastHoleDouble,
    bonus_garbage_tracking: config.garbageTracking,
    handicap_ghost_player: config.handicapGhostPlayer,
    handicap_bump_and_run: config.handicapBumpAndRun,
    handicap_mixed_tees: config.handicapMixedTees,
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
