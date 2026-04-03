import { describe, it, expect } from 'vitest';
import { calculateLiveMoney } from './moneyTracker';
import { PlayerWithScores, GameConfig, HoleInfo, Score } from '@/types/golf';

const holeInfo: HoleInfo[] = [
  { par: 4, number: 1, yardage: 388, handicap: 15 },
  { par: 5, number: 2, yardage: 554, handicap: 3 },
  { par: 4, number: 3, yardage: 411, handicap: 9 },
  { par: 3, number: 4, yardage: 204, handicap: 13 },
  { par: 4, number: 5, yardage: 431, handicap: 1 },
  { par: 4, number: 6, yardage: 422, handicap: 11 },
  { par: 3, number: 7, yardage: 220, handicap: 7 },
  { par: 5, number: 8, yardage: 595, handicap: 5 },
  { par: 4, number: 9, yardage: 346, handicap: 17 },
  { par: 4, number: 10, yardage: 426, handicap: 10 },
  { par: 4, number: 11, yardage: 359, handicap: 14 },
  { par: 4, number: 12, yardage: 427, handicap: 4 },
  { par: 5, number: 13, yardage: 550, handicap: 12 },
  { par: 3, number: 14, yardage: 216, handicap: 6 },
  { par: 4, number: 15, yardage: 433, handicap: 2 },
  { par: 5, number: 16, yardage: 544, handicap: 16 },
  { par: 3, number: 17, yardage: 146, handicap: 18 },
  { par: 4, number: 18, yardage: 410, handicap: 8 },
];

const players: PlayerWithScores[] = [
  {
    id: 'p1', roundId: 'r1', name: 'Alice', handicap: undefined,
    orderIndex: 0, scores: [], totalStrokes: 0, totalRelativeToPar: 0, holesPlayed: 0,
  },
  {
    id: 'p2', roundId: 'r1', name: 'Bob', handicap: 14,
    orderIndex: 1, scores: [], totalStrokes: 0, totalRelativeToPar: 0, holesPlayed: 0,
  },
];

// Alice wins all 3 holes
const scores3holes: Score[] = [
  { id: 's1', playerId: 'p1', roundId: 'r1', holeNumber: 1, strokes: 3 },
  { id: 's2', playerId: 'p2', roundId: 'r1', holeNumber: 1, strokes: 5 },
  { id: 's3', playerId: 'p1', roundId: 'r1', holeNumber: 2, strokes: 4 },
  { id: 's4', playerId: 'p2', roundId: 'r1', holeNumber: 2, strokes: 6 },
  { id: 's5', playerId: 'p1', roundId: 'r1', holeNumber: 3, strokes: 3 },
  { id: 's6', playerId: 'p2', roundId: 'r1', holeNumber: 3, strokes: 5 },
];

describe('calculateLiveMoney — house game (skins)', () => {
  it('tracks skins money in house game format', () => {
    const game: GameConfig = {
      id: 'g1', type: 'house', stakes: 50,
      activePrimitives: [
        { id: 'format_skins', value: null },
        { id: 'settlement_unit_value', value: 50 },
      ],
    };
    const result = calculateLiveMoney(players, scores3holes, [game], holeInfo, [], 3);
    const alice = result.players.find(p => p.playerId === 'p1')!;
    const bob = result.players.find(p => p.playerId === 'p2')!;

    // Alice wins all 3 gross skins. potPerSkin=50*2=100. contribution=3*50=150
    // Alice: 3*100 - 150 = +150. Bob: 0*100 - 150 = -150.
    expect(alice.currentBalance).toBe(150);
    expect(bob.currentBalance).toBe(-150);
  });

  it('tracks skins with carryover in house game', () => {
    const tiedScores: Score[] = [
      { id: 's1', playerId: 'p1', roundId: 'r1', holeNumber: 1, strokes: 4 },
      { id: 's2', playerId: 'p2', roundId: 'r1', holeNumber: 1, strokes: 4 }, // tie
      { id: 's3', playerId: 'p1', roundId: 'r1', holeNumber: 2, strokes: 3 },
      { id: 's4', playerId: 'p2', roundId: 'r1', holeNumber: 2, strokes: 5 }, // Alice wins + carry
    ];
    const game: GameConfig = {
      id: 'g1', type: 'house', stakes: 10,
      activePrimitives: [
        { id: 'format_skins', value: null },
        { id: 'settlement_unit_value', value: 10 },
      ],
    };
    const result = calculateLiveMoney(players, tiedScores, [game], holeInfo, [], 2);
    const alice = result.players.find(p => p.playerId === 'p1')!;
    // Hole 1 tied (carry 1), hole 2 Alice wins (value=2). potPerSkin=10*2=20
    // Alice: 2*20 - 2*10 = 40-20=+20. Bob: 0*20 - 2*10 = -20
    expect(alice.currentBalance).toBe(20);
  });

  it('tracks birdie bonus in house game', () => {
    // Alice makes birdie on hole 1 (par 4, scores 3)
    const game: GameConfig = {
      id: 'g1', type: 'house', stakes: 5,
      activePrimitives: [
        { id: 'format_skins', value: null },
        { id: 'settlement_unit_value', value: 5 },
        { id: 'bonus_birdie_unit', value: 10 },
      ],
    };
    const result = calculateLiveMoney(players, scores3holes.slice(0, 2), [game], holeInfo, [], 1);
    const alice = result.players.find(p => p.playerId === 'p1')!;
    const bob = result.players.find(p => p.playerId === 'p2')!;
    // Skin: Alice wins. potPerSkin=5*2=10. contribution=1*5=5. skin=10-5=+5
    // Birdie bonus: Alice gets $10 from Bob. net birdie = +10
    // Alice total = 5 + 10 = 15
    expect(alice.currentBalance).toBe(15);
    expect(bob.currentBalance).toBe(-15);
  });

  it('handles custom AI primitives without crashing', () => {
    const game: GameConfig = {
      id: 'g1', type: 'house', stakes: 1,
      activePrimitives: [
        { id: 'format_skins', value: null },
        { id: 'settlement_unit_value', value: 1 },
        { id: 'custom_most_bogeys_penalty', value: 100 },
      ],
    };
    // Should not throw — custom primitives are ignored by buildScoringConfig
    const result = calculateLiveMoney(players, scores3holes, [game], holeInfo, [], 3);
    expect(result.players.length).toBe(2);
    expect(result.players.some(p => p.currentBalance !== 0)).toBe(true);
  });
});

describe('calculateLiveMoney — standard game types', () => {
  it('tracks skins game', () => {
    const game: GameConfig = { id: 'g1', type: 'skins', stakes: 5, carryover: true };
    const result = calculateLiveMoney(players, scores3holes, [game], holeInfo, [], 3);
    const alice = result.players.find(p => p.playerId === 'p1')!;
    const breakdown = result.breakdown.get('p1')!;
    expect(breakdown.skins).toBeGreaterThan(0);
    expect(alice.currentBalance).toBeGreaterThan(0);
  });

  it('tracks nassau game', () => {
    const game: GameConfig = { id: 'g1', type: 'nassau', stakes: 10 };
    const result = calculateLiveMoney(players, scores3holes, [game], holeInfo, [], 3);
    // Nassau with only 3 holes scored — front 9 not complete, may not settle yet
    expect(result.players.length).toBe(2);
  });

  it('tracks match play game', () => {
    const game: GameConfig = { id: 'g1', type: 'match', stakes: 5 };
    const result = calculateLiveMoney(players, scores3holes, [game], holeInfo, [], 3);
    const alice = result.players.find(p => p.playerId === 'p1')!;
    const breakdown = result.breakdown.get('p1')!;
    // Alice wins all 3 holes at $5 each
    expect(breakdown.match).toBe(15);
    expect(alice.currentBalance).toBe(15);
  });

  it('tracks multiple games simultaneously', () => {
    const games: GameConfig[] = [
      { id: 'g1', type: 'skins', stakes: 5, carryover: true },
      { id: 'g2', type: 'match', stakes: 10 },
    ];
    const result = calculateLiveMoney(players, scores3holes, [games[0], games[1]], holeInfo, [], 3);
    const alice = result.players.find(p => p.playerId === 'p1')!;
    const breakdown = result.breakdown.get('p1')!;
    expect(breakdown.skins).toBeGreaterThan(0);
    expect(breakdown.match).toBe(30);
    expect(alice.currentBalance).toBe(breakdown.skins + breakdown.match);
  });

  it('tracks house game + standard game together', () => {
    const games: GameConfig[] = [
      {
        id: 'g1', type: 'house', stakes: 50,
        activePrimitives: [
          { id: 'format_skins', value: null },
          { id: 'settlement_unit_value', value: 50 },
        ],
      },
      { id: 'g2', type: 'match', stakes: 5 },
    ];
    const result = calculateLiveMoney(players, scores3holes, games, holeInfo, [], 3);
    const breakdown = result.breakdown.get('p1')!;
    expect(breakdown.houseGame).toBe(150);
    expect(breakdown.match).toBe(15);
  });
});
