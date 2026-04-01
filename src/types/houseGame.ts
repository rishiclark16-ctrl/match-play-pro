export interface ActivePrimitive {
  id: string;
  value: any; // null for 'none' valueType primitives
  // Custom primitive fields (only present when id starts with 'custom_')
  custom?: true;
  label?: string;
  description?: string;
}

export interface ParsedPrimitive {
  id: string;
  value: any;
  confidence: 'high' | 'medium' | 'low';
  // Custom primitive fields
  custom?: true;
  label?: string;
  description?: string;
  /** True when the rule is physically/logically impossible to track in the app */
  infeasible?: true;
}

/** Type guard — true when a primitive was AI-created, not from the standard VALID_IDS set */
export function isCustomPrimitive(p: ActivePrimitive | ParsedPrimitive): boolean {
  return !!(p as any).custom || p.id.startsWith('custom_');
}

export interface HouseGame {
  id: string;
  groupId: string;
  ownerId: string;
  name: string;
  description: string;
  activePrimitives: ActivePrimitive[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalGameFormat {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  activePrimitives: ActivePrimitive[];
  isPublic: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type PrimitiveValueType = 'none' | 'number' | 'currency' | 'distance' | 'select';

export interface PrimitiveValueConfig {
  options?: string[];           // for 'select' type
  min?: number;                 // for 'number' / 'currency' / 'distance'
  max?: number;
  step?: number;
  unit?: string;                // e.g. 'ft', '$'
}

export interface HouseGamePrimitive {
  id: string;
  category: PrimitiveCategory;
  label: string;
  description: string;
  valueType: PrimitiveValueType;
  valueConfig?: PrimitiveValueConfig;
  defaultValue: any;
  implemented: boolean; // false = UI shows but scoring is stubbed
}

export type PrimitiveCategory =
  | 'press'
  | 'scoring'
  | 'bonus'
  | 'carryover'
  | 'handicap'
  | 'casual'
  | 'settlement'
  | 'group';

export interface HouseGameScoringConfig {
  // Scoring format flags
  nassau: boolean;
  skins: boolean;
  skinsBackNineOnly: boolean;
  matchPlay: boolean;
  strokePlay: boolean;
  stableford: boolean;
  modifiedStableford: boolean;
  wolf: boolean;
  vegas: boolean;
  hammer: boolean;
  bingoBangoBongo: boolean;
  rabbit: boolean;
  quota: boolean;
  defender: boolean;
  sixes: boolean;

  // Press rules
  pressAutoXDown: number | null; // null = disabled, number = threshold
  pressAutoBirdie: boolean;
  pressAutoEagle: boolean;
  pressManualRequest: boolean;
  pressRequiresAcceptance: boolean;
  pressDoubleOrNothing: boolean;
  pressMaxPerRound: number | null;
  pressNewSubmatch: boolean;
  pressNoDormie: boolean;
  pressBack9Auto: boolean;

  // Multipliers & bonuses
  par5Double: boolean;
  par3Special: 'none' | 'double' | 'half' | 'separate_pot';
  birdieUnitBonus: number; // 0 = disabled
  eagleUnitBonus: number;  // 0 = disabled
  greenie: boolean;
  sandie: boolean;
  barkie: boolean;
  oozle: boolean;
  chippy: boolean;
  polie: boolean;
  lastHoleDouble: boolean;
  garbageTracking: boolean;

  // Carryovers
  carryoverSkinsHalved: boolean;
  carryoverCap: number | null;
  carryoverJackpot18: boolean;
  carryoverResetOnWin: boolean;
  carryoverNassauHalved: boolean;

  // Handicap
  handicapPct: number; // 100, 90, 80, 75, 0
  handicapStrokeIndex: boolean;
  handicapGhostPlayer: boolean;
  handicapMaxCap: number | null;
  handicapBumpAndRun: boolean;
  handicapMixedTees: boolean;

  // Casual rules
  gimmeDistance: number | null; // feet, null = no gimmes
  breakfastBall: boolean;
  mulligans: number; // 0 = none
  noBlood: boolean;
  preferredLies: boolean;
  concedeMatch: boolean;
  footWedge: boolean;

  // Settlement
  unitValue: number; // dollars per unit, default 1
  payPerHole: boolean;
  endOfRound: boolean;
  runningTab: boolean;
  netOut: boolean;
  rainShortened: boolean;
  maxLossCap: number | null;
  tiesSplit: boolean;
  tiesCarryover: boolean;

  // Group rules
  minPlayers: number;
  pickupRule: boolean;
  subIn: number | null;
  teamsFixed: boolean;
  teamsRotating: boolean;
  wolfLoneMultiplier: number;
  pointBank: boolean;
}
