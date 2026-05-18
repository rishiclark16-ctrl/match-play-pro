import { HouseGamePrimitive } from '@/types/houseGame';
import { PRESS_PRIMITIVES } from './primitives/press';
import { SCORING_PRIMITIVES } from './primitives/scoring';
import { BONUS_PRIMITIVES } from './primitives/bonus';
import { CARRYOVER_PRIMITIVES } from './primitives/carryover';
import { HANDICAP_PRIMITIVES } from './primitives/handicap';
import { CASUAL_PRIMITIVES } from './primitives/casual';
import { SETTLEMENT_PRIMITIVES } from './primitives/settlement';
import { GROUP_PRIMITIVES } from './primitives/group';

// Order matters: the original PRIMITIVES array fixes the insertion order of
// PRIMITIVES_BY_CATEGORY for each category bucket. Keep this concatenation in
// the same order as the original file's section comments.
export const PRIMITIVES: HouseGamePrimitive[] = [
  ...PRESS_PRIMITIVES,
  ...SCORING_PRIMITIVES,
  ...BONUS_PRIMITIVES,
  ...CARRYOVER_PRIMITIVES,
  ...HANDICAP_PRIMITIVES,
  ...CASUAL_PRIMITIVES,
  ...SETTLEMENT_PRIMITIVES,
  ...GROUP_PRIMITIVES,
];

// Lookup by id
export const PRIMITIVE_MAP: Record<string, HouseGamePrimitive> =
  Object.fromEntries(PRIMITIVES.map(p => [p.id, p]));

// Group by category for UI rendering
export const PRIMITIVES_BY_CATEGORY: Record<string, HouseGamePrimitive[]> =
  PRIMITIVES.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, HouseGamePrimitive[]>);

export const CATEGORY_LABELS: Record<string, string> = {
  press: 'Press Rules',
  scoring: 'Scoring Structure',
  bonus: 'Multipliers & Bonuses',
  carryover: 'Carryover Rules',
  handicap: 'Handicap Application',
  casual: 'Gimmes & Casual Rules',
  settlement: 'Settlement',
  group: 'Group & Format Rules',
};

export const CATEGORY_ORDER = ['scoring', 'press', 'bonus', 'carryover', 'handicap', 'casual', 'settlement', 'group'];
