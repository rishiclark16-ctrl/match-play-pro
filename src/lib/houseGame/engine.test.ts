import { describe, it, expect } from 'vitest';
import { buildScoringConfig, summarizeConfig } from './engine';
import { ActivePrimitive } from '@/types/houseGame';

// Helper: build a single-primitive ActivePrimitive array
const ap = (id: string, value: any = null): ActivePrimitive[] => [{ id, value }];

describe('buildScoringConfig', () => {
  describe('empty input → DEFAULT_CONFIG values', () => {
    it('returns all format flags false', () => {
      const c = buildScoringConfig([]);
      expect(c.nassau).toBe(false);
      expect(c.skins).toBe(false);
      expect(c.skinsBackNineOnly).toBe(false);
      expect(c.matchPlay).toBe(false);
      expect(c.stableford).toBe(false);
      expect(c.modifiedStableford).toBe(false);
      expect(c.wolf).toBe(false);
    });

    it('returns press defaults', () => {
      const c = buildScoringConfig([]);
      expect(c.pressAutoXDown).toBeNull();
      expect(c.pressAutoBirdie).toBe(false);
    });

    it('returns bonus defaults', () => {
      const c = buildScoringConfig([]);
      expect(c.birdieUnitBonus).toBe(0);
      expect(c.eagleUnitBonus).toBe(0);
      expect(c.par3Special).toBe('none');
    });

    it('returns settlement defaults', () => {
      const c = buildScoringConfig([]);
      expect(c.unitValue).toBe(1);
      expect(c.tiesSplit).toBe(true);
      expect(c.tiesCarryover).toBe(false);
    });

    it('returns handicap default of 100%', () => {
      const c = buildScoringConfig([]);
      expect(c.handicapPct).toBe(100);
    });

    it('returns casual defaults', () => {
      const c = buildScoringConfig([]);
      expect(c.gimmeDistance).toBeNull();
      expect(c.mulligans).toBe(0);
      expect(c.noBlood).toBe(false);
    });
  });

  describe('scoring format primitives', () => {
    it('format_nassau → nassau=true', () => {
      expect(buildScoringConfig(ap('format_nassau')).nassau).toBe(true);
    });

    it('format_skins → skins=true', () => {
      const c = buildScoringConfig(ap('format_skins'));
      expect(c.skins).toBe(true);
    });

    it('format_skins_back9_only → skins=true AND skinsBackNineOnly=true', () => {
      const c = buildScoringConfig(ap('format_skins_back9_only'));
      expect(c.skins).toBe(true);
      expect(c.skinsBackNineOnly).toBe(true);
    });

    it('format_match_play → matchPlay=true', () => {
      expect(buildScoringConfig(ap('format_match_play')).matchPlay).toBe(true);
    });

    it('format_stableford → stableford=true', () => {
      const c = buildScoringConfig(ap('format_stableford'));
      expect(c.stableford).toBe(true);
      expect(c.modifiedStableford).toBe(false);
    });

    it('format_modified_stableford → stableford=true AND modifiedStableford=true', () => {
      const c = buildScoringConfig(ap('format_modified_stableford'));
      expect(c.stableford).toBe(true);
      expect(c.modifiedStableford).toBe(true);
    });

    it('format_wolf → wolf=true', () => {
      expect(buildScoringConfig(ap('format_wolf')).wolf).toBe(true);
    });
  });

  describe('press primitives', () => {
    it('press_auto_x_down with value=3 → pressAutoXDown=3', () => {
      expect(buildScoringConfig(ap('press_auto_x_down', 3)).pressAutoXDown).toBe(3);
    });

    it('press_auto_x_down with value=undefined → pressAutoXDown=2 (default)', () => {
      expect(buildScoringConfig(ap('press_auto_x_down', undefined)).pressAutoXDown).toBe(2);
    });

    it('press_auto_x_down with value="bad" → pressAutoXDown=2 (default)', () => {
      expect(buildScoringConfig(ap('press_auto_x_down', 'bad')).pressAutoXDown).toBe(2);
    });
  });

  describe('bonus primitives', () => {
    it('bonus_birdie_unit with value=2 → birdieUnitBonus=2', () => {
      expect(buildScoringConfig(ap('bonus_birdie_unit', 2)).birdieUnitBonus).toBe(2);
    });

    it('bonus_eagle_unit with value=5 → eagleUnitBonus=5', () => {
      expect(buildScoringConfig(ap('bonus_eagle_unit', 5)).eagleUnitBonus).toBe(5);
    });

    it('bonus_par3_special with value="double" → par3Special="double"', () => {
      expect(buildScoringConfig(ap('bonus_par3_special', 'double')).par3Special).toBe('double');
    });

    it('bonus_par3_special with value="invalid" → par3Special="double" (fallback)', () => {
      expect(buildScoringConfig(ap('bonus_par3_special', 'invalid')).par3Special).toBe('double');
    });
  });

  describe('carryover primitives', () => {
    it('carryover_skins_halved → carryoverSkinsHalved=true', () => {
      expect(buildScoringConfig(ap('carryover_skins_halved')).carryoverSkinsHalved).toBe(true);
    });
  });

  describe('handicap primitives', () => {
    it('handicap_full → handicapPct=100', () => {
      expect(buildScoringConfig(ap('handicap_full')).handicapPct).toBe(100);
    });

    it('handicap_90_pct → handicapPct=90', () => {
      expect(buildScoringConfig(ap('handicap_90_pct')).handicapPct).toBe(90);
    });

    it('handicap_80_pct → handicapPct=80', () => {
      expect(buildScoringConfig(ap('handicap_80_pct')).handicapPct).toBe(80);
    });

    it('handicap_75_pct → handicapPct=75', () => {
      expect(buildScoringConfig(ap('handicap_75_pct')).handicapPct).toBe(75);
    });

    it('handicap_scratch → handicapPct=0', () => {
      expect(buildScoringConfig(ap('handicap_scratch')).handicapPct).toBe(0);
    });

    it('handicap_max_cap value=24 → handicapMaxCap=24', () => {
      expect(buildScoringConfig(ap('handicap_max_cap', 24)).handicapMaxCap).toBe(24);
    });
  });

  describe('casual primitives', () => {
    it('casual_gimme_distance value=3 → gimmeDistance=3', () => {
      expect(buildScoringConfig(ap('casual_gimme_distance', 3)).gimmeDistance).toBe(3);
    });

    it('casual_mulligans value=2 → mulligans=2', () => {
      expect(buildScoringConfig(ap('casual_mulligans', 2)).mulligans).toBe(2);
    });

    it('casual_no_blood → noBlood=true', () => {
      expect(buildScoringConfig(ap('casual_no_blood')).noBlood).toBe(true);
    });
  });

  describe('settlement primitives', () => {
    it('settlement_unit_value value=5 → unitValue=5', () => {
      expect(buildScoringConfig(ap('settlement_unit_value', 5)).unitValue).toBe(5);
    });

    it('settlement_net_out → netOut=true', () => {
      expect(buildScoringConfig(ap('settlement_net_out')).netOut).toBe(true);
    });

    it('settlement_rain_shortened → rainShortened=true', () => {
      expect(buildScoringConfig(ap('settlement_rain_shortened')).rainShortened).toBe(true);
    });

    it('settlement_ties_split → tiesSplit=true, tiesCarryover=false', () => {
      const c = buildScoringConfig(ap('settlement_ties_split'));
      expect(c.tiesSplit).toBe(true);
      expect(c.tiesCarryover).toBe(false);
    });

    it('settlement_ties_carryover → tiesCarryover=true, tiesSplit=false', () => {
      const c = buildScoringConfig(ap('settlement_ties_carryover'));
      expect(c.tiesCarryover).toBe(true);
      expect(c.tiesSplit).toBe(false);
    });
  });

  describe('group primitives', () => {
    it('group_min_players value=4 → minPlayers=4', () => {
      expect(buildScoringConfig(ap('group_min_players', 4)).minPlayers).toBe(4);
    });
  });

  describe('multiple primitives together', () => {
    it('nassau + skins + press_auto_x_down(3) + unit_value(5)', () => {
      const primitives: ActivePrimitive[] = [
        { id: 'format_nassau', value: null },
        { id: 'format_skins', value: null },
        { id: 'press_auto_x_down', value: 3 },
        { id: 'settlement_unit_value', value: 5 },
      ];
      const c = buildScoringConfig(primitives);
      expect(c.nassau).toBe(true);
      expect(c.skins).toBe(true);
      expect(c.pressAutoXDown).toBe(3);
      expect(c.unitValue).toBe(5);
    });
  });
});

describe('summarizeConfig', () => {
  it('nassau=true → includes "Nassau"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), nassau: true });
    expect(lines.some(l => l.includes('Nassau'))).toBe(true);
  });

  it('skins=true → includes "Skins"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), skins: true });
    expect(lines.some(l => l.includes('Skins'))).toBe(true);
  });

  it('skinsBackNineOnly=true → includes "back 9 only"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), skins: true, skinsBackNineOnly: true });
    expect(lines.some(l => l.includes('back 9 only'))).toBe(true);
  });

  it('matchPlay=true → includes "Match Play"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), matchPlay: true });
    expect(lines.some(l => l.includes('Match Play'))).toBe(true);
  });

  it('wolf=true → includes "Wolf"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), wolf: true });
    expect(lines.some(l => l.includes('Wolf'))).toBe(true);
  });

  it('stableford + modifiedStableford=true → includes "Modified Stableford"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), stableford: true, modifiedStableford: true });
    expect(lines.some(l => l.includes('Modified Stableford'))).toBe(true);
  });

  it('pressAutoXDown=2 → includes "Auto-press when 2 down"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), pressAutoXDown: 2 });
    expect(lines.some(l => l.includes('Auto-press when 2 down'))).toBe(true);
  });

  it('pressBack9Auto=true → includes "back 9"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), pressBack9Auto: true });
    expect(lines.some(l => l.toLowerCase().includes('back 9'))).toBe(true);
  });

  it('par5Double=true → includes "double"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), par5Double: true });
    expect(lines.some(l => l.toLowerCase().includes('double'))).toBe(true);
  });

  it('birdieUnitBonus=1 → includes "Birdie"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), birdieUnitBonus: 1 });
    expect(lines.some(l => l.includes('Birdie'))).toBe(true);
  });

  it('eagleUnitBonus=2 → includes "Eagle"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), eagleUnitBonus: 2 });
    expect(lines.some(l => l.includes('Eagle'))).toBe(true);
  });

  it('handicapPct=90 → includes "90%"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), handicapPct: 90 });
    expect(lines.some(l => l.includes('90%'))).toBe(true);
  });

  it('handicapGhostPlayer=true → includes "Ghost"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), handicapGhostPlayer: true });
    expect(lines.some(l => l.includes('Ghost'))).toBe(true);
  });

  it('gimmeDistance=2 → includes "2ft"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), gimmeDistance: 2 });
    expect(lines.some(l => l.includes('2ft'))).toBe(true);
  });

  it('noBlood=true → includes "No blood"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), noBlood: true });
    expect(lines.some(l => l.includes('No blood'))).toBe(true);
  });

  it('mulligans=2 → includes "2 mulligan"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), mulligans: 2 });
    expect(lines.some(l => l.includes('2 mulligan'))).toBe(true);
  });

  it('netOut=true → includes "Net out"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), netOut: true });
    expect(lines.some(l => l.includes('Net out'))).toBe(true);
  });

  it('unitValue=5 → includes "$5"', () => {
    const lines = summarizeConfig({ ...buildScoringConfig([]), unitValue: 5 });
    expect(lines.some(l => l.includes('$5'))).toBe(true);
  });

  it('DEFAULT_CONFIG (empty) → returns empty array', () => {
    const lines = summarizeConfig(buildScoringConfig([]));
    expect(lines).toEqual([]);
  });
});
