export interface Course {
  id: string;
  name: string;
  location?: string;
  holes: HoleInfo[];
  slope?: number;
  rating?: number;
  isUserCreated?: boolean;
  createdAt: Date;
}

// Team for Best Ball format
export interface Team {
  id: string;
  name: string;
  playerIds: string[];
  color: string;  // For visual distinction
}

// Betting game configuration
export interface GameConfig {
  id: string;
  type: 'skins' | 'nassau' | 'match' | 'stableford' | 'bestball' | 'wolf';
  stakes: number;
  carryover?: boolean;           // Skins/Wolf: ties carry to next hole
  autoPress?: boolean;           // Nassau: auto-press when 2 down
  modifiedStableford?: boolean;  // Stableford: modified scoring (negative points)
  teams?: Team[];                // Best Ball: team assignments
  useNet?: boolean;              // Use handicap strokes for this game
  blindWolfMultiplier?: number;  // Wolf: Blind Wolf point multiplier (default 2x)
  wolfResults?: WolfHoleResult[]; // Wolf: Results for each hole
}

// Wolf hole result (imported from wolf.ts but defined here for type)
export interface WolfHoleResult {
  holeNumber: number;
  wolfId: string;
  partnerId: string | null;
  isBlindWolf: boolean;
  winningTeam: 'wolf' | 'hunters' | 'push';
  points: number;
}

// Stableford point values
export interface StablefordPoints {
  albatross: number;   // -3 = 5 pts (or 8 modified)
  eagle: number;       // -2 = 4 pts (or 5 modified)
  birdie: number;      // -1 = 3 pts
  par: number;         // 0 = 2 pts
  bogey: number;       // +1 = 1 pt
  doubleBogey: number; // +2 = 0 pts
  worse: number;       // +3 or worse = 0 pts (or negative in modified)
}

// Best Ball hole result
export interface BestBallHoleResult {
  holeNumber: number;
  teamScores: { teamId: string; bestScore: number; contributorId: string }[];
  winningTeamId: string | null;
}

// Skins game tracking
export interface SkinResult {
  holeNumber: number;
  winnerId: string | null;  // null = carried over
  value: number;            // skins this hole is worth
}

// Nassau press tracking
export interface Press {
  id: string;
  startHole: number;
  initiatedBy: string;
  stakes: number;
  status: 'active' | 'won' | 'lost' | 'pushed';
}

// Settlement for final payouts
export interface Settlement {
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  amount: number;
  description: string;
}

export interface HoleInfo {
  number: number;
  par: number;
  handicap?: number;
  yardage?: number;
}

export interface Round {
  id: string;
  courseId: string;
  courseName: string;
  holes: 9 | 18;
  strokePlay: boolean;
  matchPlay: boolean;
  stakes?: number;
  status: 'active' | 'complete';
  createdAt: Date;
  joinCode: string;
  holeInfo: HoleInfo[];
  // Course rating info for handicap calculations
  slope?: number;
  rating?: number;
  // Betting games
  games: GameConfig[];
  presses: Press[];
}

export interface Player {
  id: string;
  roundId: string;
  name: string;
  handicap?: number;
  orderIndex: number;
}

export interface Score {
  id: string;
  roundId: string;
  playerId: string;
  holeNumber: number;
  strokes: number;
}

export interface PlayerWithScores extends Player {
  scores: Score[];
  totalStrokes: number;
  totalRelativeToPar: number;
  holesPlayed: number;
  // Net score calculations (handicap-adjusted)
  playingHandicap?: number;
  totalNetStrokes?: number;
  netRelativeToPar?: number;
  strokesPerHole?: Map<number, number>;
}

export type ScoreType = 'ace' | 'albatross' | 'eagle' | 'birdie' | 'par' | 'bogey' | 'double' | 'triple' | 'worse';

export function getScoreType(strokes: number, par: number): ScoreType {
  const diff = strokes - par;
  
  if (strokes === 1) return 'ace';
  if (diff <= -3) return 'albatross';
  if (diff === -2) return 'eagle';
  if (diff === -1) return 'birdie';
  if (diff === 0) return 'par';
  if (diff === 1) return 'bogey';
  if (diff === 2) return 'double';
  if (diff === 3) return 'triple';
  return 'worse';
}

export function getScoreLabel(strokes: number, par: number): string {
  const type = getScoreType(strokes, par);
  const labels: Record<ScoreType, string> = {
    ace: 'Ace!',
    albatross: 'Albatross',
    eagle: 'Eagle',
    birdie: 'Birdie',
    par: 'Par',
    bogey: 'Bogey',
    double: 'Double',
    triple: 'Triple',
    worse: `+${strokes - par}`,
  };
  return labels[type];
}

export function getScoreColor(strokes: number, par: number): string {
  const diff = strokes - par;
  if (diff <= -1) return 'text-success';
  if (diff === 0) return 'text-foreground';
  if (diff === 1) return 'text-warning';
  return 'text-danger';
}

export function formatRelativeToPar(relativeToPar: number): string {
  if (relativeToPar === 0) return 'E';
  if (relativeToPar > 0) return `+${relativeToPar}`;
  return `${relativeToPar}`;
}

export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
