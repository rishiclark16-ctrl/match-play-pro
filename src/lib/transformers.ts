/**
 * Centralized data transformation functions for converting
 * Supabase database records to application domain types.
 */

import { Round, Player, Score, Press, HoleInfo, GameConfig } from '@/types/golf';

/**
 * Database record types (snake_case from Supabase)
 * Using `| null` to match Supabase's actual return types
 */
export interface DbRound {
  id: string;
  course_id?: string | null;
  course_name: string;
  holes: number;
  stroke_play?: boolean | null;
  match_play?: boolean | null;
  stakes?: number | null;
  slope?: number | null;
  rating?: number | null;
  handicap_mode?: string | null;
  status: string | null;
  games?: unknown | null;
  hole_info?: unknown | null;
  join_code: string;
  created_at: string | null;
}

export interface DbPlayer {
  id: string;
  round_id: string | null;
  name: string;
  handicap?: number | null;
  order_index: number;
  profile_id?: string | null;
  manual_strokes?: number | null;
  profiles?: {
    avatar_url?: string | null;
  } | null;
}

export interface DbScore {
  id: string;
  round_id: string | null;
  player_id: string | null;
  hole_number: number;
  strokes: number;
}

export interface DbPress {
  id: string;
  start_hole: number;
  initiated_by?: string | null;
  stakes: number;
  status: string | null;
}

/**
 * Transform a database round record to a Round domain object
 */
export function transformRound(db: DbRound): Round {
  return {
    id: db.id,
    courseId: db.course_id ?? '',
    courseName: db.course_name,
    holes: db.holes as 9 | 18,
    strokePlay: db.stroke_play ?? true,
    matchPlay: db.match_play ?? false,
    stakes: db.stakes ?? undefined,
    slope: db.slope ?? undefined,
    rating: db.rating ?? undefined,
    handicapMode: (db.handicap_mode as 'auto' | 'manual') ?? 'auto',
    status: (db.status ?? 'active') as 'active' | 'complete',
    games: (db.games as GameConfig[]) ?? [],
    holeInfo: (db.hole_info as HoleInfo[]) ?? [],
    joinCode: db.join_code,
    createdAt: db.created_at ? new Date(db.created_at) : new Date(),
    presses: [],
  };
}

/**
 * Transform a database player record to a Player domain object
 */
export function transformPlayer(db: DbPlayer): Player {
  return {
    id: db.id,
    roundId: db.round_id ?? '',
    name: db.name,
    handicap: db.handicap ?? undefined,
    orderIndex: db.order_index,
    profileId: db.profile_id ?? undefined,
    avatarUrl: db.profiles?.avatar_url ?? undefined,
    manualStrokes: db.manual_strokes ?? undefined,
  };
}

/**
 * Transform a database score record to a Score domain object
 */
export function transformScore(db: DbScore): Score {
  return {
    id: db.id,
    roundId: db.round_id ?? '',
    playerId: db.player_id ?? '',
    holeNumber: db.hole_number,
    strokes: db.strokes,
  };
}

/**
 * Transform a database press record to a Press domain object
 */
export function transformPress(db: DbPress): Press {
  return {
    id: db.id,
    startHole: db.start_hole,
    initiatedBy: db.initiated_by ?? '',
    stakes: db.stakes,
    status: (db.status ?? 'active') as Press['status'],
  };
}

/**
 * Batch transform helpers
 */
export function transformRounds(records: DbRound[]): Round[] {
  return records.map(transformRound);
}

export function transformPlayers(records: DbPlayer[]): Player[] {
  return records.map(transformPlayer);
}

export function transformScores(records: DbScore[]): Score[] {
  return records.map(transformScore);
}

export function transformPresses(records: DbPress[]): Press[] {
  return records.map(transformPress);
}
