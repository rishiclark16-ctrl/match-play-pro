import { describe, it, expect } from 'vitest';
import { validateConfig, buildConfig, summarizeScoringConfig, ScoringConfig } from './HouseGameEngine';
import { ActivePrimitive, PrimitiveValue } from '@/types/houseGame';

// Helper: build an ActivePrimitive array from id/value pairs
const aps = (...pairs: Array<[string, PrimitiveValue?]>): ActivePrimitive[] =>
  pairs.map(([id, value = null]) => ({ id, value: value ?? null }));

// Helper: single primitive
const ap = (id: string, value: PrimitiveValue = null): ActivePrimitive[] => [{ id, value }];

describe('validateConfig', () => {
  it('empty → { valid: true, errors: [] }', () => {
    const result = validateConfig([]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('nassau alone → valid', () => {
    const result = validateConfig(ap('format_nassau'));
    expect(result.valid).toBe(true);
  });

  it('skins alone → valid', () => {
    const result = validateConfig(ap('format_skins'));
    expect(result.valid).toBe(true);
  });

  it('nassau + stableford → invalid, error mentions "Nassau and Stableford"', () => {
    const result = validateConfig(aps(['format_nassau'], ['format_stableford']));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/Nassau and Stableford/);
  });

  it('match_play + stableford → invalid, error mentions "Match Play and Stableford"', () => {
    const result = validateConfig(aps(['format_match_play'], ['format_stableford']));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Match Play and Stableford'))).toBe(true);
  });

  it('nassau + skins together → valid (they are compatible)', () => {
    const result = validateConfig(aps(['format_nassau'], ['format_skins']));
    expect(result.valid).toBe(true);
  });

  it('nassau + skins + press_auto_x_down → valid', () => {
    const result = validateConfig(aps(['format_nassau'], ['format_skins'], ['press_auto_x_down', 2]));
    expect(result.valid).toBe(true);
  });

  it('nassau + match_play → invalid', () => {
    const result = validateConfig(aps(['format_nassau'], ['format_match_play']));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Nassau') && e.includes('Match Play'))).toBe(true);
  });

  it('format_skins + format_skins_back9_only → invalid', () => {
    const result = validateConfig(aps(['format_skins'], ['format_skins_back9_only']));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('skins'))).toBe(true);
  });

  it('settlement_ties_carryover + settlement_ties_split → invalid', () => {
    const result = validateConfig(aps(['settlement_ties_carryover'], ['settlement_ties_split']));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('ties'))).toBe(true);
  });

  it('handicap_scratch + handicap_full → invalid', () => {
    const result = validateConfig(aps(['handicap_scratch'], ['handicap_full']));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('handicap'))).toBe(true);
  });

  it('handicap_scratch + handicap_90_pct → invalid', () => {
    const result = validateConfig(aps(['handicap_scratch'], ['handicap_90_pct']));
    expect(result.valid).toBe(false);
  });

  it('handicap_scratch alone → valid', () => {
    const result = validateConfig(ap('handicap_scratch'));
    expect(result.valid).toBe(true);
  });

  it('handicap_full alone → valid', () => {
    const result = validateConfig(ap('handicap_full'));
    expect(result.valid).toBe(true);
  });

  it('multiple errors can accumulate', () => {
    // nassau+stableford AND matchPlay+stableford triggers two errors
    const result = validateConfig(aps(['format_nassau'], ['format_stableford'], ['format_match_play']));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('buildConfig', () => {
  describe('activeFormats', () => {
    it('format_nassau → activeFormats includes "nassau"', () => {
      expect(buildConfig(ap('format_nassau')).activeFormats).toContain('nassau');
    });

    it('format_skins → activeFormats includes "skins"', () => {
      expect(buildConfig(ap('format_skins')).activeFormats).toContain('skins');
    });

    it('format_match_play → activeFormats includes "match"', () => {
      expect(buildConfig(ap('format_match_play')).activeFormats).toContain('match');
    });

    it('format_stableford → activeFormats includes "stableford"', () => {
      expect(buildConfig(ap('format_stableford')).activeFormats).toContain('stableford');
    });
  });

  describe('pressRules', () => {
    it('press_auto_x_down value=2 → trigger="x_down", threshold=2', () => {
      const pr = buildConfig(ap('press_auto_x_down', 2)).pressRules;
      expect(pr.trigger).toBe('x_down');
      expect(pr.threshold).toBe(2);
    });

    it('no press primitives → trigger="none"', () => {
      const pr = buildConfig([]).pressRules;
      expect(pr.trigger).toBe('none');
    });
  });

  describe('multipliers', () => {
    it('bonus_par5_double → multipliers.par5Double=true', () => {
      expect(buildConfig(ap('bonus_par5_double')).multipliers.par5Double).toBe(true);
    });

    it('bonus_birdie_unit value=1 → multipliers.birdieUnits=1', () => {
      expect(buildConfig(ap('bonus_birdie_unit', 1)).multipliers.birdieUnits).toBe(1);
    });

    it('bonus_eagle_unit value=3 → multipliers.eagleUnits=3', () => {
      expect(buildConfig(ap('bonus_eagle_unit', 3)).multipliers.eagleUnits).toBe(3);
    });
  });

  describe('carryoverRules', () => {
    it('carryover_skins_halved → carryoverRules.skinsCarry=true', () => {
      expect(buildConfig(ap('carryover_skins_halved')).carryoverRules.skinsCarry).toBe(true);
    });
  });

  describe('handicapConfig', () => {
    it('handicap_90_pct → handicapConfig.percentage=90', () => {
      expect(buildConfig(ap('handicap_90_pct')).handicapConfig.percentage).toBe(90);
    });

    it('handicap_ghost_player → handicapConfig.ghostPlayer=true', () => {
      expect(buildConfig(ap('handicap_ghost_player')).handicapConfig.ghostPlayer).toBe(true);
    });
  });

  describe('casualRules', () => {
    it('casual_gimme_distance value=2 → casualRules.gimmeDistance=2', () => {
      expect(buildConfig(ap('casual_gimme_distance', 2)).casualRules.gimmeDistance).toBe(2);
    });

    it('casual_mulligans value=1 → casualRules.mulligans=1', () => {
      expect(buildConfig(ap('casual_mulligans', 1)).casualRules.mulligans).toBe(1);
    });

    it('casual_no_blood → casualRules.noBlood=true', () => {
      expect(buildConfig(ap('casual_no_blood')).casualRules.noBlood).toBe(true);
    });
  });

  describe('settlementConfig', () => {
    it('settlement_unit_value value=5 → settlementConfig.unitValue=5', () => {
      expect(buildConfig(ap('settlement_unit_value', 5)).settlementConfig.unitValue).toBe(5);
    });

    it('settlement_net_out → settlementConfig.netOut=true', () => {
      expect(buildConfig(ap('settlement_net_out')).settlementConfig.netOut).toBe(true);
    });

    it('settlement_rain_shortened → settlementConfig.rainShortened=true', () => {
      expect(buildConfig(ap('settlement_rain_shortened')).settlementConfig.rainShortened).toBe(true);
    });
  });

  describe('garbageBets', () => {
    it('bonus_greenie → garbageBets includes "greenie"', () => {
      expect(buildConfig(ap('bonus_greenie')).garbageBets).toContain('greenie');
    });

    it('bonus_sandie → garbageBets includes "sandie"', () => {
      expect(buildConfig(ap('bonus_sandie')).garbageBets).toContain('sandie');
    });

    it('bonus_barkie → garbageBets includes "barkie"', () => {
      expect(buildConfig(ap('bonus_barkie')).garbageBets).toContain('barkie');
    });
  });

  describe('complex combination', () => {
    it('nassau + skins + press_auto_x_down(3) + unit_value(5) + carryover_skins_halved + birdie_unit(1)', () => {
      const primitives: ActivePrimitive[] = [
        { id: 'format_nassau', value: null },
        { id: 'format_skins', value: null },
        { id: 'press_auto_x_down', value: 3 },
        { id: 'settlement_unit_value', value: 5 },
        { id: 'carryover_skins_halved', value: null },
        { id: 'bonus_birdie_unit', value: 1 },
      ];
      const config = buildConfig(primitives);
      expect(config.activeFormats).toContain('nassau');
      expect(config.activeFormats).toContain('skins');
      expect(config.pressRules.trigger).toBe('x_down');
      expect(config.pressRules.threshold).toBe(3);
      expect(config.settlementConfig.unitValue).toBe(5);
      expect(config.carryoverRules.skinsCarry).toBe(true);
      expect(config.multipliers.birdieUnits).toBe(1);
    });
  });
});

describe('summarizeScoringConfig', () => {
  // Helper: build a ScoringConfig from primitives
  const configFrom = (...pairs: Array<[string, PrimitiveValue?]>): ScoringConfig =>
    buildConfig(pairs.map(([id, value = null]) => ({ id, value })));

  it('nassau config → first line includes "Nassau"', () => {
    const lines = summarizeScoringConfig(configFrom(['format_nassau']));
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toContain('Nassau');
  });

  it('skins config → includes "Skins"', () => {
    const lines = summarizeScoringConfig(configFrom(['format_skins']));
    expect(lines.some(l => l.includes('Skins'))).toBe(true);
  });

  it('skins + carryover → includes "Skins with carryover"', () => {
    const lines = summarizeScoringConfig(configFrom(['format_skins'], ['carryover_skins_halved']));
    expect(lines.some(l => l.includes('Skins with carryover'))).toBe(true);
  });

  it('nassau + skins + press → multiple lines in correct order', () => {
    const lines = summarizeScoringConfig(
      configFrom(['format_nassau'], ['format_skins'], ['press_auto_x_down', 2])
    );
    expect(lines.length).toBeGreaterThanOrEqual(3);
    const nassauIdx = lines.findIndex(l => l.includes('Nassau'));
    const skinsIdx = lines.findIndex(l => l.includes('Skins'));
    const pressIdx = lines.findIndex(l => l.includes('Auto-press'));
    expect(nassauIdx).toBeLessThan(skinsIdx);
    expect(skinsIdx).toBeLessThan(pressIdx);
  });

  it('limit=2 → max 2 lines returned', () => {
    const lines = summarizeScoringConfig(
      configFrom(['format_nassau'], ['format_skins'], ['press_auto_x_down', 2]),
      2
    );
    expect(lines.length).toBeLessThanOrEqual(2);
  });

  it('limit=1 → at most 1 line returned', () => {
    const lines = summarizeScoringConfig(configFrom(['format_nassau'], ['format_skins']), 1);
    expect(lines.length).toBeLessThanOrEqual(1);
  });

  it('limit=0 → returns empty array', () => {
    const lines = summarizeScoringConfig(configFrom(['format_nassau']), 0);
    expect(lines).toEqual([]);
  });

  it('empty config → []', () => {
    const lines = summarizeScoringConfig(configFrom());
    expect(lines).toEqual([]);
  });
});
