/**
 * Checks a custom game before anyone plays for money. Every problem comes back in
 * plain words; an empty list means the spec can be scored as written.
 */
import type { GameSpec } from './types';

const MAX_FACTOR = 10;

export function validateSpec(spec: GameSpec, playerIds: string[], holes: number[]): string[] {
  const issues: string[] = [];
  const known = new Set(playerIds);
  const holeSet = new Set(holes);
  const first = Math.min(...holes);
  const last = Math.max(...holes);
  const partition = (teams: string[][], where: string) => {
    const all = teams.flat();
    if (teams.length < 2) issues.push(`${where}: needs at least two sides`);
    if (teams.some(t => !t.length)) issues.push(`${where}: a side has no players`);
    if (all.some(p => !known.has(p))) issues.push(`${where}: someone on a team isn't in this round`);
    if (new Set(all).size !== all.length) issues.push(`${where}: a player is on two teams`);
    if (all.length !== playerIds.length) issues.push(`${where}: every player needs a team`);
  };

  const s = spec.sides;
  const sideSize = new Set<number>();
  switch (s.kind) {
    case 'individual':
      if (playerIds.length < 2) issues.push('Needs at least two players');
      sideSize.add(1);
      break;
    case 'teams':
      partition(s.teams, 'Teams');
      s.teams.forEach(t => sideSize.add(t.length));
      break;
    case 'rotating_teams': {
      const sorted = [...s.rotations].sort((a, b) => a.from - b.from);
      let next = first;
      for (const r of sorted) {
        if (r.from !== next || r.to < r.from) { issues.push('Partner changes must cover every hole once, in order'); break; }
        partition(r.teams, `Holes ${r.from}–${r.to}`);
        r.teams.forEach(t => sideSize.add(t.length));
        next = r.to + 1;
      }
      if (next !== last + 1 && !issues.length) issues.push('Partner changes must cover every hole once, in order');
      break;
    }
    case 'one_vs_field':
      if (playerIds.length < 3) issues.push('One against the field needs at least three players');
      if (!s.order.length || s.order.some(p => !known.has(p))) issues.push('Pick the order the lone player rotates in');
      if (!(s.loneWeight > 0) || s.loneWeight > MAX_FACTOR) issues.push('The lone player weighting must be between 1 and 10');
      break;
  }

  if (!spec.contests.length) issues.push('Say how a hole is won');
  for (const c of spec.contests) {
    if ((c.metric === 'vegas' || c.metric === 'daytona') && ![...sideSize].every(n => n === 2)) {
      issues.push(`${c.metric === 'vegas' ? 'Vegas' : 'Daytona'} numbers need two players a side`);
    }
    if (c.kind === 'low_wins' && !(c.points > 0)) issues.push('Points for winning a hole must be more than zero');
    if (c.kind === 'rank') {
      const sides = s.kind === 'individual' ? playerIds.length : s.kind === 'teams' ? s.teams.length : 2;
      if (c.table.length < 2 || c.table.length > sides) issues.push(`The points table needs one entry per finishing place (${sides})`);
      if (c.table.some(v => !Number.isFinite(v))) issues.push('The points table has a value that is not a number');
    }
    if (c.kind === 'vs_par' && (c.metric === 'vegas' || c.metric === 'daytona')) issues.push('Points against par use a score, not a Vegas number');
  }

  for (const m of spec.multipliers) {
    if (!(m.factor > 0) || m.factor > MAX_FACTOR) issues.push('Multipliers must be between 1 and 10');
    if (m.when === 'holes' && (!m.holes?.length || m.holes.some(h => !holeSet.has(h)))) issues.push('A doubled hole is not on this course');
  }

  for (const seg of spec.segments) {
    if (seg.from > seg.to || !holeSet.has(seg.from) || !holeSet.has(seg.to)) issues.push(`${seg.label}: holes ${seg.from}–${seg.to} aren't in this round`);
  }
  if (spec.payout === 'per_segment') {
    if (s.kind === 'one_vs_field') issues.push('One against the field is paid per point, not per bet');
    if (s.kind === 'rotating_teams' && spec.segments.length) {
      for (const seg of spec.segments) {
        const inside = s.rotations.filter(r => r.from <= seg.to && r.to >= seg.from);
        if (inside.length > 1) issues.push(`${seg.label}: partners change in the middle of this bet`);
      }
    }
    if (s.kind === 'rotating_teams' && !spec.segments.length) issues.push('Rotating partners need a bet for each set of holes');
  }
  if (spec.quota && (s.kind !== 'individual' || !spec.contests.some(c => c.kind === 'vs_par'))) {
    issues.push('Quota needs everyone for themselves and points against par');
  }
  return [...new Set(issues)];
}
