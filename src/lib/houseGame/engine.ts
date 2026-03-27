import { ActivePrimitive, HouseGameScoringConfig } from '@/types/houseGame';

const DEFAULT_CONFIG: HouseGameScoringConfig = {
  nassau: false,
  skins: false,
  skinsBackNineOnly: false,
  matchPlay: false,
  strokePlay: false,
  stableford: false,
  modifiedStableford: false,
  wolf: false,
  vegas: false,
  hammer: false,
  bingoBangoBongo: false,
  rabbit: false,
  quota: false,
  defender: false,
  sixes: false,

  pressAutoXDown: null,
  pressAutoBirdie: false,
  pressAutoEagle: false,
  pressManualRequest: false,
  pressRequiresAcceptance: false,
  pressDoubleOrNothing: false,
  pressMaxPerRound: null,
  pressNewSubmatch: false,
  pressNoDormie: false,
  pressBack9Auto: false,

  par5Double: false,
  par3Special: 'none',
  birdieUnitBonus: 0,
  eagleUnitBonus: 0,
  greenie: false,
  sandie: false,
  barkie: false,
  oozle: false,
  chippy: false,
  polie: false,
  lastHoleDouble: false,
  garbageTracking: false,

  carryoverSkinsHalved: false,
  carryoverCap: null,
  carryoverJackpot18: false,
  carryoverResetOnWin: false,
  carryoverNassauHalved: false,

  handicapPct: 100,
  handicapStrokeIndex: true,
  handicapGhostPlayer: false,
  handicapMaxCap: null,
  handicapBumpAndRun: false,
  handicapMixedTees: false,

  gimmeDistance: null,
  breakfastBall: false,
  mulligans: 0,
  noBlood: false,
  preferredLies: false,
  concedeMatch: false,
  footWedge: false,

  unitValue: 1,
  payPerHole: false,
  endOfRound: true,
  runningTab: false,
  netOut: false,
  rainShortened: false,
  maxLossCap: null,
  tiesSplit: true,
  tiesCarryover: false,

  minPlayers: 2,
  pickupRule: false,
  subIn: null,
  teamsFixed: false,
  teamsRotating: false,
  wolfLoneMultiplier: 2,
  pointBank: false,
};

/**
 * Maps an array of ActivePrimitives to a flat HouseGameScoringConfig.
 * This is the bridge between the UI primitive selections and the scoring engine.
 */
export function buildScoringConfig(activePrimitives: ActivePrimitive[]): HouseGameScoringConfig {
  const config: HouseGameScoringConfig = { ...DEFAULT_CONFIG };

  for (const { id, value } of activePrimitives) {
    switch (id) {
      // Scoring formats
      case 'format_nassau': config.nassau = true; break;
      case 'format_skins': config.skins = true; break;
      case 'format_skins_back9_only': config.skins = true; config.skinsBackNineOnly = true; break;
      case 'format_match_play': config.matchPlay = true; break;
      case 'format_stroke_play': config.strokePlay = true; break;
      case 'format_stableford': config.stableford = true; break;
      case 'format_modified_stableford': config.stableford = true; config.modifiedStableford = true; break;
      case 'format_wolf': config.wolf = true; break;
      case 'format_vegas': config.vegas = true; break;
      case 'format_hammer': config.hammer = true; break;
      case 'format_bingo_bango_bongo': config.bingoBangoBongo = true; break;
      case 'format_rabbit': config.rabbit = true; break;
      case 'format_quota': config.quota = true; break;
      case 'format_defender': config.defender = true; break;
      case 'group_sixes': config.sixes = true; break;

      // Press rules
      case 'press_auto_x_down': config.pressAutoXDown = typeof value === 'number' ? value : 2; break;
      case 'press_auto_birdie': config.pressAutoBirdie = true; break;
      case 'press_auto_eagle': config.pressAutoEagle = true; break;
      case 'press_manual_request': config.pressManualRequest = true; break;
      case 'press_requires_acceptance': config.pressRequiresAcceptance = true; break;
      case 'press_double_or_nothing': config.pressDoubleOrNothing = true; break;
      case 'press_max_per_round': config.pressMaxPerRound = typeof value === 'number' ? value : null; break;
      case 'press_new_submatch': config.pressNewSubmatch = true; break;
      case 'press_no_dormie': config.pressNoDormie = true; break;
      case 'press_back9_auto': config.pressBack9Auto = true; break;

      // Bonuses
      case 'bonus_par5_double': config.par5Double = true; break;
      case 'bonus_par3_special':
        config.par3Special = (['double', 'half', 'separate_pot'].includes(value) ? value : 'double') as HouseGameScoringConfig['par3Special'];
        break;
      case 'bonus_birdie_unit': config.birdieUnitBonus = typeof value === 'number' ? value : 1; break;
      case 'bonus_eagle_unit': config.eagleUnitBonus = typeof value === 'number' ? value : 2; break;
      case 'bonus_greenie': config.greenie = true; break;
      case 'bonus_sandie': config.sandie = true; break;
      case 'bonus_barkie': config.barkie = true; break;
      case 'bonus_oozle': config.oozle = true; break;
      case 'bonus_chippy': config.chippy = true; break;
      case 'bonus_polie': config.polie = true; break;
      case 'bonus_last_hole_double': config.lastHoleDouble = true; break;
      case 'bonus_garbage_tracking': config.garbageTracking = true; break;

      // Carryovers
      case 'carryover_skins_halved': config.carryoverSkinsHalved = true; break;
      case 'carryover_cap': config.carryoverCap = typeof value === 'number' ? value : null; break;
      case 'carryover_jackpot_18': config.carryoverJackpot18 = true; break;
      case 'carryover_reset_on_win': config.carryoverResetOnWin = true; break;
      case 'carryover_nassau_halved': config.carryoverNassauHalved = true; break;

      // Handicap
      case 'handicap_full': config.handicapPct = 100; break;
      case 'handicap_90_pct': config.handicapPct = 90; break;
      case 'handicap_80_pct': config.handicapPct = 80; break;
      case 'handicap_75_pct': config.handicapPct = 75; break;
      case 'handicap_stroke_index': config.handicapStrokeIndex = true; break;
      case 'handicap_ghost_player': config.handicapGhostPlayer = true; break;
      case 'handicap_scratch': config.handicapPct = 0; break;
      case 'handicap_max_cap': config.handicapMaxCap = typeof value === 'number' ? value : 36; break;
      case 'handicap_bump_and_run': config.handicapBumpAndRun = true; break;
      case 'handicap_mixed_tees': config.handicapMixedTees = true; break;

      // Casual
      case 'casual_gimme_distance': config.gimmeDistance = typeof value === 'number' ? value : 2; break;
      case 'casual_breakfast_ball': config.breakfastBall = true; break;
      case 'casual_mulligans': config.mulligans = typeof value === 'number' ? value : 1; break;
      case 'casual_no_blood': config.noBlood = true; break;
      case 'casual_preferred_lies': config.preferredLies = true; break;
      case 'casual_concede_match': config.concedeMatch = true; break;
      case 'casual_foot_wedge': config.footWedge = true; break;

      // Settlement
      case 'settlement_unit_value': config.unitValue = typeof value === 'number' ? value : 1; break;
      case 'settlement_pay_per_hole': config.payPerHole = true; break;
      case 'settlement_end_of_round': config.endOfRound = true; break;
      case 'settlement_running_tab': config.runningTab = true; break;
      case 'settlement_net_out': config.netOut = true; break;
      case 'settlement_rain_shortened': config.rainShortened = true; break;
      case 'settlement_max_loss_cap': config.maxLossCap = typeof value === 'number' ? value : null; break;
      case 'settlement_ties_split': config.tiesSplit = true; config.tiesCarryover = false; break;
      case 'settlement_ties_carryover': config.tiesCarryover = true; config.tiesSplit = false; break;

      // Group
      case 'group_min_players': config.minPlayers = typeof value === 'number' ? value : 2; break;
      case 'group_pickup_rule': config.pickupRule = true; break;
      case 'group_sub_in': config.subIn = typeof value === 'number' ? value : 1; break;
      case 'group_teams_fixed': config.teamsFixed = true; break;
      case 'group_teams_rotating': config.teamsRotating = true; break;
      case 'group_wolf_lone_multiplier': config.wolfLoneMultiplier = typeof value === 'number' ? value : 2; break;
      case 'group_point_bank': config.pointBank = true; break;
    }
  }

  return config;
}

/** Returns a human-readable summary of the active config for display */
export function summarizeConfig(config: HouseGameScoringConfig): string[] {
  const lines: string[] = [];
  if (config.nassau) lines.push('Nassau (front 9 / back 9 / overall)');
  if (config.skins) lines.push(config.skinsBackNineOnly ? 'Skins — back 9 only' : 'Skins');
  if (config.matchPlay) lines.push('Match Play');
  if (config.wolf) lines.push('Wolf');
  if (config.stableford) lines.push(config.modifiedStableford ? 'Modified Stableford' : 'Stableford');
  if (config.bingoBangoBongo) lines.push('Bingo Bango Bongo');
  if (config.pressAutoXDown !== null) lines.push(`Auto-press when ${config.pressAutoXDown} down`);
  if (config.pressBack9Auto) lines.push('Auto-press at back 9');
  if (config.par5Double) lines.push('Par 5s worth double');
  if (config.birdieUnitBonus > 0) lines.push(`Birdie = +${config.birdieUnitBonus} unit${config.birdieUnitBonus > 1 ? 's' : ''}`);
  if (config.eagleUnitBonus > 0) lines.push(`Eagle = +${config.eagleUnitBonus} unit${config.eagleUnitBonus > 1 ? 's' : ''}`);
  if (config.carryoverSkinsHalved) lines.push('Halved skins carry over');
  if (config.handicapPct !== 100) lines.push(`${config.handicapPct}% handicap`);
  if (config.handicapGhostPlayer) lines.push('Ghost player (net par)');
  if (config.gimmeDistance !== null) lines.push(`Gimmes inside ${config.gimmeDistance}ft`);
  if (config.noBlood) lines.push('No blood (net double bogey cap)');
  if (config.mulligans > 0) lines.push(`${config.mulligans} mulligan${config.mulligans > 1 ? 's' : ''}`);
  if (config.netOut) lines.push('Net out all debts at end');
  if (config.unitValue !== 1) lines.push(`$${config.unitValue} per unit`);
  return lines;
}
