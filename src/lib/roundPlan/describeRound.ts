import type { GameConfig } from '@/types/golf';
import { GAME_LABEL, STAKE_UNIT } from './games';
import { PLAN_GAME_TYPES, type PlanGameType } from './types';

export interface PastRound {
  courseName: string;
  games: GameConfig[];
  /** Everyone except the round's creator, in seat order. */
  otherPlayers: string[];
}

function money(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

function describeGame(g: GameConfig): string | null {
  if (!(PLAN_GAME_TYPES as readonly string[]).includes(g.type)) return null;
  const type = g.type as PlanGameType;
  const label = GAME_LABEL[type].toLowerCase();
  const unit = STAKE_UNIT[type];
  let s = unit && g.stakes > 0 ? `${money(g.stakes)} ${label}` : label;
  if (g.carryover) s += ' with carryovers';
  if (g.autoPress) s += ' with auto presses';
  if (g.modifiedStableford) s = `modified ${s}`;
  return s;
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * A sentence that recreates a past round, e.g.
 * "Sonoma GC from the II tees with Jack Turner, James Reid and Tim Shaw. $5 skins"
 * It goes through the same parser and checks as anything the user says.
 */
export function describeRound(r: PastRound): string | null {
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(r.courseName);
  const course = m ? `${m[1]} from the ${m[2]} tees` : r.courseName;
  if (!course.trim()) return null;
  let head = course;
  if (r.otherPlayers.length) head += ` with ${list(r.otherPlayers)}`;
  const games = r.games.map(describeGame).filter((g): g is string => !!g);
  return games.length ? `${head}. ${list(games)}` : head;
}
