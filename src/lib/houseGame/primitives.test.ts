import { describe, it, expect } from 'vitest';
import {
  PRIMITIVES,
  PRIMITIVE_MAP,
  PRIMITIVES_BY_CATEGORY,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from './primitives';

// ─── VALID_IDS from the edge function (must stay in sync) ────────────────────
// Source of truth: supabase/functions/parse-house-game/index.ts
const EDGE_FUNCTION_VALID_IDS = new Set([
  'press_auto_x_down','press_auto_birdie','press_auto_eagle','press_manual_request',
  'press_requires_acceptance','press_double_or_nothing','press_max_per_round',
  'press_new_submatch','press_no_dormie','press_back9_auto','format_nassau',
  'format_skins','format_skins_back9_only','format_match_play','format_stroke_play',
  'format_stableford','format_modified_stableford','format_wolf','format_vegas',
  'format_hammer','format_bingo_bango_bongo','format_rabbit','format_quota',
  'format_nines','format_defender','bonus_par5_double','bonus_par3_special','bonus_birdie_unit',
  'bonus_eagle_unit','bonus_greenie','bonus_sandie','bonus_barkie','bonus_oozle',
  'bonus_chippy','bonus_polie','bonus_last_hole_double','bonus_garbage_tracking',
  'carryover_skins_halved','carryover_cap','carryover_jackpot_18',
  'carryover_reset_on_win','carryover_nassau_halved','handicap_full',
  'handicap_90_pct','handicap_80_pct','handicap_75_pct','handicap_stroke_index',
  'handicap_ghost_player','handicap_scratch','handicap_max_cap',
  'handicap_bump_and_run','handicap_mixed_tees','casual_gimme_distance',
  'casual_breakfast_ball','casual_mulligans','casual_no_blood','casual_preferred_lies',
  'casual_concede_match','casual_foot_wedge','settlement_unit_value',
  'settlement_pay_per_hole','settlement_end_of_round','settlement_running_tab',
  'settlement_net_out','settlement_rain_shortened','settlement_max_loss_cap',
  'settlement_ties_split','settlement_ties_carryover','group_min_players',
  'group_pickup_rule','group_sub_in','group_teams_fixed','group_teams_rotating',
  'group_wolf_lone_multiplier','group_sixes','group_point_bank',
]);

const VALID_CATEGORIES = new Set(['press','scoring','bonus','carryover','handicap','casual','settlement','group']);
const VALID_VALUE_TYPES = new Set(['none','number','currency','distance','select']);

describe('PRIMITIVES array internal consistency', () => {
  it('has no duplicate ids', () => {
    const ids = PRIMITIVES.map(p => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all ids are lowercase with underscores only', () => {
    for (const p of PRIMITIVES) {
      expect(p.id).toMatch(/^[a-z0-9_]+$/, `"${p.id}" contains invalid characters`);
    }
  });

  it('all categories are valid', () => {
    for (const p of PRIMITIVES) {
      expect(VALID_CATEGORIES.has(p.category), `"${p.id}" has unknown category "${p.category}"`).toBe(true);
    }
  });

  it('all valueTypes are valid', () => {
    for (const p of PRIMITIVES) {
      expect(VALID_VALUE_TYPES.has(p.valueType), `"${p.id}" has unknown valueType "${p.valueType}"`).toBe(true);
    }
  });

  it('primitives with valueType=none have defaultValue===null', () => {
    for (const p of PRIMITIVES.filter(x => x.valueType === 'none')) {
      expect(p.defaultValue, `"${p.id}" valueType=none but defaultValue is not null`).toBeNull();
    }
  });

  it('primitives with valueType=number have valueConfig with min/max/step', () => {
    for (const p of PRIMITIVES.filter(x => x.valueType === 'number')) {
      expect(p.valueConfig, `"${p.id}" missing valueConfig`).toBeDefined();
      expect(typeof p.valueConfig!.min).toBe('number');
      expect(typeof p.valueConfig!.max).toBe('number');
      expect(typeof p.valueConfig!.step).toBe('number');
    }
  });

  it('primitives with valueType=currency have valueConfig with min/max/step', () => {
    for (const p of PRIMITIVES.filter(x => x.valueType === 'currency')) {
      expect(p.valueConfig, `"${p.id}" missing valueConfig`).toBeDefined();
      expect(typeof p.valueConfig!.min).toBe('number');
      expect(typeof p.valueConfig!.max).toBe('number');
    }
  });

  it('primitives with valueType=distance have valueConfig with min/max/step', () => {
    for (const p of PRIMITIVES.filter(x => x.valueType === 'distance')) {
      expect(p.valueConfig, `"${p.id}" missing valueConfig`).toBeDefined();
      expect(typeof p.valueConfig!.min).toBe('number');
      expect(typeof p.valueConfig!.max).toBe('number');
    }
  });

  it('primitives with valueType=select have valueConfig.options array', () => {
    for (const p of PRIMITIVES.filter(x => x.valueType === 'select')) {
      expect(Array.isArray(p.valueConfig!.options), `"${p.id}" valueType=select but options is not array`).toBe(true);
    }
  });

  it('all primitives have non-empty label and description', () => {
    for (const p of PRIMITIVES) {
      expect(p.label.length, `"${p.id}" has empty label`).toBeGreaterThan(0);
      expect(p.description.length, `"${p.id}" has empty description`).toBeGreaterThan(0);
    }
  });

  it('implemented field is a boolean on every primitive', () => {
    for (const p of PRIMITIVES) {
      expect(typeof p.implemented, `"${p.id}" missing implemented flag`).toBe('boolean');
    }
  });
});

describe('PRIMITIVE_MAP', () => {
  it('has same count as PRIMITIVES', () => {
    expect(Object.keys(PRIMITIVE_MAP).length).toBe(PRIMITIVES.length);
  });

  it('every PRIMITIVE id exists in PRIMITIVE_MAP', () => {
    for (const p of PRIMITIVES) {
      expect(PRIMITIVE_MAP[p.id], `"${p.id}" missing from PRIMITIVE_MAP`).toBeDefined();
    }
  });

  it('PRIMITIVE_MAP values match their PRIMITIVES entry', () => {
    for (const p of PRIMITIVES) {
      expect(PRIMITIVE_MAP[p.id]).toBe(p);
    }
  });
});

describe('Edge function VALID_IDS sync', () => {
  it('every PRIMITIVE id is in edge function VALID_IDS (UI cannot select invalid id)', () => {
    const mismatches: string[] = [];
    for (const p of PRIMITIVES) {
      if (!EDGE_FUNCTION_VALID_IDS.has(p.id)) {
        mismatches.push(p.id);
      }
    }
    expect(mismatches, `Frontend has IDs not in edge function: ${mismatches.join(', ')}`).toEqual([]);
  });

  it('every edge function VALID_ID exists in PRIMITIVE_MAP (Claude cannot return unknown id)', () => {
    const mismatches: string[] = [];
    for (const id of EDGE_FUNCTION_VALID_IDS) {
      if (!PRIMITIVE_MAP[id]) {
        mismatches.push(id);
      }
    }
    expect(mismatches, `Edge function has IDs not in frontend: ${mismatches.join(', ')}`).toEqual([]);
  });

  it('counts match: PRIMITIVES.length === EDGE_FUNCTION_VALID_IDS.size', () => {
    expect(PRIMITIVES.length).toBe(EDGE_FUNCTION_VALID_IDS.size);
  });
});

describe('PRIMITIVES_BY_CATEGORY', () => {
  it('every category in CATEGORY_ORDER has a primitives array', () => {
    for (const cat of CATEGORY_ORDER) {
      expect(PRIMITIVES_BY_CATEGORY[cat], `No primitives for category "${cat}"`).toBeDefined();
      expect(PRIMITIVES_BY_CATEGORY[cat].length).toBeGreaterThan(0);
    }
  });

  it('total count across all categories equals PRIMITIVES.length', () => {
    const total = Object.values(PRIMITIVES_BY_CATEGORY).reduce((s, arr) => s + arr.length, 0);
    expect(total).toBe(PRIMITIVES.length);
  });

  it('no primitive appears in more than one category bucket', () => {
    const seen = new Set<string>();
    for (const [, prims] of Object.entries(PRIMITIVES_BY_CATEGORY)) {
      for (const p of prims) {
        expect(seen.has(p.id), `"${p.id}" appears in multiple categories`).toBe(false);
        seen.add(p.id);
      }
    }
  });
});

describe('CATEGORY_LABELS', () => {
  it('has a label for every category in CATEGORY_ORDER', () => {
    for (const cat of CATEGORY_ORDER) {
      expect(CATEGORY_LABELS[cat], `No label for category "${cat}"`).toBeDefined();
      expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
    }
  });

  it('every VALID_CATEGORY used in PRIMITIVES has a label', () => {
    const usedCats = new Set(PRIMITIVES.map(p => p.category));
    for (const cat of usedCats) {
      expect(CATEGORY_LABELS[cat], `No label for used category "${cat}"`).toBeDefined();
    }
  });
});
