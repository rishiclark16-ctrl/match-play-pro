import { describe, it, expect } from 'vitest';
import {
  calculateBestBall,
  calculateBestBallMatch,
  createDefaultTeams,
  formatBestBallStatus,
  getBestBallHoleContext,
} from './bestball';
import { Player, Score, HoleInfo, Team } from '@/types/golf';
import { StrokesPerHoleMap } from './skins';

const TEST_ROUND_ID = 'test-round-123';

const createPlayer = (id: string, name: string, orderIndex = 0): Player => ({
  id,
  name,
  handicap: 0,
  roundId: TEST_ROUND_ID,
  orderIndex,
});

const createScore = (playerId: string, holeNumber: number, strokes: number): Score => ({
  id: `${playerId}-${holeNumber}`,
  playerId,
  holeNumber,
  strokes,
  roundId: TEST_ROUND_ID,
});

const createHoleInfo = (number: number, par: number): HoleInfo => ({
  number,
  par,
  handicap: number,
  distance: 350 + (par - 3) * 100,
});

const defaultHoles: HoleInfo[] = [
  createHoleInfo(1, 4),
  createHoleInfo(2, 4),
  createHoleInfo(3, 3),
  createHoleInfo(4, 5),
  createHoleInfo(5, 4),
  createHoleInfo(6, 4),
  createHoleInfo(7, 3),
  createHoleInfo(8, 5),
  createHoleInfo(9, 4),
];

const fourPlayers: Player[] = [
  createPlayer('p1', 'Alice'),
  createPlayer('p2', 'Bob'),
  createPlayer('p3', 'Charlie'),
  createPlayer('p4', 'Diana'),
];

const twoTeams: Team[] = [
  { id: 'team-1', name: 'Team A', playerIds: ['p1', 'p2'], color: '#22c55e' },
  { id: 'team-2', name: 'Team B', playerIds: ['p3', 'p4'], color: '#3b82f6' },
];

describe('calculateBestBall', () => {
  describe('basic best ball scoring', () => {
    it('should select lowest score from each team', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4), // Team A
        createScore('p2', 1, 5), // Team A
        createScore('p3', 1, 5), // Team B
        createScore('p4', 1, 4), // Team B
      ];

      const result = calculateBestBall(scores, fourPlayers, twoTeams, defaultHoles, 1);

      expect(result.standings[0].totalScore).toBe(4); // Team A: min(4,5) = 4
      expect(result.standings[1].totalScore).toBe(4); // Team B: min(5,4) = 4
    });

    it('should track contributing player for each hole', () => {
      const scores: Score[] = [
        createScore('p1', 1, 3), // Team A - Alice contributes
        createScore('p2', 1, 5), // Team A
        createScore('p3', 1, 4), // Team B - Charlie contributes
        createScore('p4', 1, 6), // Team B
      ];

      const result = calculateBestBall(scores, fourPlayers, twoTeams, defaultHoles, 1);

      const teamA = result.standings.find(s => s.teamId === 'team-1');
      expect(teamA?.holeResults[0].contributorId).toBe('p1');
      expect(teamA?.holeResults[0].contributorName).toBe('Alice');

      const teamB = result.standings.find(s => s.teamId === 'team-2');
      expect(teamB?.holeResults[0].contributorId).toBe('p3');
    });

    it('should accumulate scores over multiple holes', () => {
      const scores: Score[] = [
        // Hole 1
        createScore('p1', 1, 4), createScore('p2', 1, 5),
        createScore('p3', 1, 5), createScore('p4', 1, 4),
        // Hole 2
        createScore('p1', 2, 3), createScore('p2', 2, 4),
        createScore('p3', 2, 4), createScore('p4', 2, 5),
      ];

      const result = calculateBestBall(scores, fourPlayers, twoTeams, defaultHoles, 2);

      const teamA = result.standings.find(s => s.teamId === 'team-1');
      expect(teamA?.totalScore).toBe(7); // 4 + 3
      expect(teamA?.holesPlayed).toBe(2);

      const teamB = result.standings.find(s => s.teamId === 'team-2');
      expect(teamB?.totalScore).toBe(8); // 4 + 4
    });

    it('should calculate relative to par', () => {
      const scores: Score[] = [
        createScore('p1', 1, 3), // Birdie on par 4
        createScore('p2', 1, 4),
        createScore('p3', 1, 5), // Bogey on par 4
        createScore('p4', 1, 5),
      ];

      const result = calculateBestBall(scores, fourPlayers, twoTeams, defaultHoles, 1);

      const teamA = result.standings.find(s => s.teamId === 'team-1');
      expect(teamA?.relativeToPar).toBe(-1); // 1 under

      const teamB = result.standings.find(s => s.teamId === 'team-2');
      expect(teamB?.relativeToPar).toBe(1); // 1 over
    });

    it('should track player contributions count', () => {
      const scores: Score[] = [
        // Hole 1 - Alice contributes for Team A
        createScore('p1', 1, 3), createScore('p2', 1, 5),
        createScore('p3', 1, 4), createScore('p4', 1, 4),
        // Hole 2 - Alice contributes again
        createScore('p1', 2, 4), createScore('p2', 2, 5),
        createScore('p3', 2, 4), createScore('p4', 2, 5),
        // Hole 3 - Bob contributes
        createScore('p1', 3, 4), createScore('p2', 3, 2),
        createScore('p3', 3, 3), createScore('p4', 3, 4),
      ];

      const result = calculateBestBall(scores, fourPlayers, twoTeams, defaultHoles, 3);

      const teamA = result.standings.find(s => s.teamId === 'team-1');
      const aliceContrib = teamA?.playerContributions.find(c => c.playerId === 'p1');
      const bobContrib = teamA?.playerContributions.find(c => c.playerId === 'p2');

      expect(aliceContrib?.holesContributed).toBe(2);
      expect(bobContrib?.holesContributed).toBe(1);
    });
  });

  describe('hole winners', () => {
    it('should determine hole winner when one team has lower score', () => {
      const scores: Score[] = [
        createScore('p1', 1, 3), createScore('p2', 1, 5),
        createScore('p3', 1, 4), createScore('p4', 1, 5),
      ];

      const result = calculateBestBall(scores, fourPlayers, twoTeams, defaultHoles, 1);

      expect(result.holeWinners).toHaveLength(1);
      expect(result.holeWinners[0].winningTeamId).toBe('team-1');
    });

    it('should handle tied hole (no winner)', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4), createScore('p2', 1, 5),
        createScore('p3', 1, 4), createScore('p4', 1, 6),
      ];

      const result = calculateBestBall(scores, fourPlayers, twoTeams, defaultHoles, 1);

      expect(result.holeWinners[0].winningTeamId).toBeNull();
    });

    it('should track team scores for each hole', () => {
      const scores: Score[] = [
        createScore('p1', 1, 3), createScore('p2', 1, 5),
        createScore('p3', 1, 4), createScore('p4', 1, 4),
      ];

      const result = calculateBestBall(scores, fourPlayers, twoTeams, defaultHoles, 1);

      expect(result.holeWinners[0].teamScores).toHaveLength(2);
      const teamAScore = result.holeWinners[0].teamScores.find(ts => ts.teamId === 'team-1');
      expect(teamAScore?.bestScore).toBe(3);
    });
  });

  describe('net scoring with handicaps', () => {
    it('should use net scores when strokesPerHole provided', () => {
      const scores: Score[] = [
        createScore('p1', 1, 5), // Gross 5
        createScore('p2', 1, 5),
        createScore('p3', 1, 4), // Gross 4
        createScore('p4', 1, 5),
      ];

      // p1 gets 2 strokes on hole 1
      const strokesPerHole: StrokesPerHoleMap = new Map([
        ['p1', new Map([[1, 2]])],
      ]);

      const result = calculateBestBall(scores, fourPlayers, twoTeams, defaultHoles, 1, strokesPerHole);

      // Team A: p1 net = 5-2=3, p2 net = 5, best = 3
      // Team B: p3 net = 4, p4 net = 5, best = 4
      const teamA = result.standings.find(s => s.teamId === 'team-1');
      expect(teamA?.totalScore).toBe(3);
    });

    it('should change contributor based on net scores', () => {
      const scores: Score[] = [
        createScore('p1', 1, 6), // Gross 6
        createScore('p2', 1, 4), // Gross 4
        createScore('p3', 1, 4),
        createScore('p4', 1, 5),
      ];

      // p1 gets 3 strokes on hole 1
      const strokesPerHole: StrokesPerHoleMap = new Map([
        ['p1', new Map([[1, 3]])],
      ]);

      const result = calculateBestBall(scores, fourPlayers, twoTeams, defaultHoles, 1, strokesPerHole);

      // Team A: p1 net = 6-3=3, p2 net = 4, best = 3 (Alice)
      const teamA = result.standings.find(s => s.teamId === 'team-1');
      expect(teamA?.holeResults[0].contributorId).toBe('p1');
      expect(teamA?.holeResults[0].bestScore).toBe(3);
    });
  });

  describe('sorting', () => {
    it('should sort standings by total score ascending', () => {
      const scores: Score[] = [
        createScore('p1', 1, 5), createScore('p2', 1, 6),
        createScore('p3', 1, 3), createScore('p4', 1, 4),
      ];

      const result = calculateBestBall(scores, fourPlayers, twoTeams, defaultHoles, 1);

      expect(result.standings[0].teamId).toBe('team-2'); // 3
      expect(result.standings[1].teamId).toBe('team-1'); // 5
    });
  });

  describe('edge cases', () => {
    it('should handle empty scores', () => {
      const result = calculateBestBall([], fourPlayers, twoTeams, defaultHoles, 0);

      expect(result.standings).toHaveLength(2);
      expect(result.holesPlayed).toBe(0);
    });

    it('should handle missing player scores for a hole', () => {
      const scores: Score[] = [
        createScore('p1', 1, 4), // Only p1 from Team A scored
        createScore('p3', 1, 5),
        createScore('p4', 1, 4),
      ];

      const result = calculateBestBall(scores, fourPlayers, twoTeams, defaultHoles, 1);

      // Team A still uses p1's score
      const teamA = result.standings.find(s => s.teamId === 'team-1');
      expect(teamA?.totalScore).toBe(4);
    });

    it('should handle team with no scores', () => {
      const scores: Score[] = [
        createScore('p3', 1, 4),
        createScore('p4', 1, 5),
      ];

      const result = calculateBestBall(scores, fourPlayers, twoTeams, defaultHoles, 1);

      const teamA = result.standings.find(s => s.teamId === 'team-1');
      expect(teamA?.totalScore).toBe(0);
      expect(teamA?.holesPlayed).toBe(0);
    });
  });
});

describe('calculateBestBallMatch', () => {
  it('should calculate match status', () => {
    const scores: Score[] = [
      // Hole 1 - Team A wins (3 < 4)
      createScore('p1', 1, 3), createScore('p2', 1, 5),
      createScore('p3', 1, 4), createScore('p4', 1, 5),
      // Hole 2 - Team B wins (3 < 4)
      createScore('p1', 2, 4), createScore('p2', 2, 5),
      createScore('p3', 2, 3), createScore('p4', 2, 5),
    ];

    const result = calculateBestBallMatch(scores, fourPlayers, twoTeams, defaultHoles, 2);

    expect(result.matchStatus.margin).toBe(0); // 1-1
    expect(result.matchStatus.status).toBe('All Square');
  });

  it('should show leading team and margin', () => {
    const scores: Score[] = [
      // Hole 1 - Team A wins
      createScore('p1', 1, 3), createScore('p2', 1, 5),
      createScore('p3', 1, 4), createScore('p4', 1, 5),
      // Hole 2 - Team A wins again
      createScore('p1', 2, 3), createScore('p2', 2, 5),
      createScore('p3', 2, 4), createScore('p4', 2, 5),
    ];

    const result = calculateBestBallMatch(scores, fourPlayers, twoTeams, defaultHoles, 2);

    expect(result.matchStatus.leadingTeamId).toBe('team-1');
    expect(result.matchStatus.leadingTeamName).toBe('Team A');
    expect(result.matchStatus.margin).toBe(2);
    expect(result.matchStatus.thru).toBe(2);
    expect(result.matchStatus.status).toBe('Team A 2 UP');
  });

  it('should show 1 UP correctly', () => {
    const scores: Score[] = [
      createScore('p1', 1, 3), createScore('p2', 1, 5),
      createScore('p3', 1, 4), createScore('p4', 1, 5),
    ];

    const result = calculateBestBallMatch(scores, fourPlayers, twoTeams, defaultHoles, 1);

    expect(result.matchStatus.status).toBe('Team A 1 UP');
  });
});

describe('createDefaultTeams', () => {
  it('should create individual teams for 2 players', () => {
    const twoPlayers = [
      createPlayer('p1', 'Alice'),
      createPlayer('p2', 'Bob'),
    ];

    const teams = createDefaultTeams(twoPlayers);

    expect(teams).toHaveLength(2);
    expect(teams[0].name).toBe('Alice');
    expect(teams[0].playerIds).toEqual(['p1']);
    expect(teams[1].name).toBe('Bob');
    expect(teams[1].playerIds).toEqual(['p2']);
  });

  it('should create 2v2 teams for 4 players', () => {
    const teams = createDefaultTeams(fourPlayers);

    expect(teams).toHaveLength(2);
    expect(teams[0].playerIds).toEqual(['p1', 'p2']);
    expect(teams[1].playerIds).toEqual(['p3', 'p4']);
  });

  it('should use first names in team names for 4 players', () => {
    const teams = createDefaultTeams(fourPlayers);

    expect(teams[0].name).toBe('Alice & Bob');
    expect(teams[1].name).toBe('Charlie & Diana');
  });

  it('should create individual teams for 3 players', () => {
    const threePlayers = [
      createPlayer('p1', 'Alice'),
      createPlayer('p2', 'Bob'),
      createPlayer('p3', 'Charlie'),
    ];

    const teams = createDefaultTeams(threePlayers);

    expect(teams).toHaveLength(3);
    teams.forEach((team, i) => {
      expect(team.playerIds).toHaveLength(1);
    });
  });

  it('should return empty for less than 2 players', () => {
    const singlePlayer = [createPlayer('p1', 'Solo')];

    expect(createDefaultTeams(singlePlayer)).toHaveLength(0);
    expect(createDefaultTeams([])).toHaveLength(0);
  });

  it('should assign different colors to teams', () => {
    const teams = createDefaultTeams(fourPlayers);

    expect(teams[0].color).not.toBe(teams[1].color);
  });
});

describe('formatBestBallStatus', () => {
  it('should return E for even par', () => {
    expect(formatBestBallStatus(0)).toBe('E');
  });

  it('should return positive format for over par', () => {
    expect(formatBestBallStatus(1)).toBe('+1');
    expect(formatBestBallStatus(5)).toBe('+5');
  });

  it('should return negative format for under par', () => {
    expect(formatBestBallStatus(-1)).toBe('-1');
    expect(formatBestBallStatus(-3)).toBe('-3');
  });
});

describe('getBestBallHoleContext', () => {
  it('should show opportunity when all square', () => {
    const scores: Score[] = []; // No scores yet

    const context = getBestBallHoleContext(scores, fourPlayers, twoTeams, defaultHoles, 1);

    expect(context.status).toBe('All Square');
    expect(context.urgency).toBe('opportunity');
    expect(context.message).toBe('Win to go 1 UP');
  });

  it('should show status after one hole', () => {
    const scores: Score[] = [
      createScore('p1', 1, 3), createScore('p2', 1, 5),
      createScore('p3', 1, 4), createScore('p4', 1, 5),
    ];

    const context = getBestBallHoleContext(scores, fourPlayers, twoTeams, defaultHoles, 2);

    expect(context.status).toBe('Team A 1 UP');
  });

  it('should show critical urgency when down by 2+', () => {
    const scores: Score[] = [
      // Team B wins first 2 holes
      createScore('p1', 1, 5), createScore('p2', 1, 6),
      createScore('p3', 1, 3), createScore('p4', 1, 4),
      createScore('p1', 2, 5), createScore('p2', 2, 6),
      createScore('p3', 2, 3), createScore('p4', 2, 4),
    ];

    const context = getBestBallHoleContext(scores, fourPlayers, twoTeams, defaultHoles, 3);

    expect(context.urgency).toBe('critical');
  });

  it('should show must-win urgency when margin >= holes remaining', () => {
    const shortHoles = defaultHoles.slice(0, 3); // Only 3 holes
    const scores: Score[] = [
      // Team B wins first 2 holes (2 down with 1 to play)
      createScore('p1', 1, 5), createScore('p2', 1, 6),
      createScore('p3', 1, 3), createScore('p4', 1, 4),
      createScore('p1', 2, 5), createScore('p2', 2, 6),
      createScore('p3', 2, 3), createScore('p4', 2, 4),
    ];

    const context = getBestBallHoleContext(scores, fourPlayers, twoTeams, shortHoles, 3);

    expect(context.urgency).toBe('critical');
    expect(context.message).toBe('Must win to stay alive');
  });
});
