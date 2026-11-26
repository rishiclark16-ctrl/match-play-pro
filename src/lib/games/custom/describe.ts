/**
 * The rules of a custom game in plain words, generated from the spec. This is what
 * the golfer confirms before teeing off and what the scorecard shows, so it must
 * say exactly what the engine scores, nothing more or less.
 */
import type { ContestSpec, GameSpec, ParTable, SideMetric } from './types';

const METRIC: Record<SideMetric, string> = {
  score: 'low score',
  best: 'low ball',
  worst: 'better high ball',
  total: 'low team total',
  vegas: 'lower Vegas number',
  daytona: 'lower Daytona number',
};

const money = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function parTable(t: ParTable): string {
  const rows: [string, number][] = [
    ['albatross', t.albatross], ['eagle', t.eagle], ['birdie', t.birdie], ['par', t.par],
    ['bogey', t.bogey], ['double', t.double], ['worse', t.worse],
  ];
  return rows.filter(([, v]) => v !== 0).map(([k, v]) => `${k} ${v > 0 ? v : `−${-v}`}`).join(', ');
}

function contestLine(c: ContestSpec, spec: GameSpec): string {
  const lone = spec.sides.kind === 'one_vs_field';
  switch (c.kind) {
    case 'low_wins':
      return lone
        ? `Each hole: ${plural(c.points, 'point')} to the lower of the lone player and the field`
        : `Each hole: ${plural(c.points, 'point')} for the ${METRIC[c.metric]}`;
    case 'rank':
      return `Each hole: points by finish, ${c.table.join('-')}${c.ties === 'share' ? ' (ties split the points)' : ' (a tie for a place scores nothing)'}`;
    case 'vs_par':
      return `Points for score against par${c.metric === 'total' ? ', every player counts' : c.metric === 'best' ? ', best ball counts' : ''}: ${parTable(c.table)}`;
    case 'diff':
      return c.metric === 'vegas' || c.metric === 'daytona'
        ? `Each hole: the difference between the ${c.metric === 'vegas' ? 'Vegas' : 'Daytona'} numbers counts`
        : `Every stroke of difference counts${c.metric === 'total' ? ' (team totals)' : c.metric === 'best' ? ' (best balls)' : ''}`;
  }
}

export function describeSpec(spec: GameSpec, nameOf: (id: string) => string, stake: number): string[] {
  const team = (ids: string[]) => ids.map(nameOf).join(' & ');
  const lines: string[] = [];
  const s = spec.sides;
  if (s.kind === 'individual') lines.push('Everyone for themselves');
  else if (s.kind === 'teams') lines.push(s.teams.map(team).join(' vs '));
  else if (s.kind === 'rotating_teams') {
    lines.push(`Partners change: ${s.rotations.map(r => `holes ${r.from}–${r.to} ${r.teams.map(team).join(' vs ')}`).join('; ')}`);
  } else {
    const weight = s.loneWeight === 1 ? '' : s.loneWeight === 2 ? '; the lone player\'s score counts double' : `; the lone player's score counts ×${s.loneWeight}`;
    lines.push(`One against the field, rotating ${s.order.map(nameOf).join(' → ')}. The field plays its ${s.fieldMetric === 'best' ? 'best ball' : 'combined total'}${weight}`);
  }
  for (const c of spec.contests) lines.push(contestLine(c, spec));
  if (spec.contests.some(c => c.kind === 'low_wins')) lines.push(spec.ties === 'carry' ? 'Tied holes carry over' : 'Tied holes are halved');
  for (const m of spec.multipliers) {
    const x = m.factor === 2 ? 'double' : m.factor === 3 ? 'triple' : `×${m.factor}`;
    if (m.when === 'winner_birdie') lines.push(`A hole won with a birdie counts ${x}`);
    else if (m.when === 'any_birdie') lines.push(`Any birdie makes the hole count ${x}`);
    else if (m.when === 'par3') lines.push(`Par 3s count ${x}`);
    else if (m.when === 'par5') lines.push(`Par 5s count ${x}`);
    else lines.push(`${m.holes!.length === 1 ? `Hole ${m.holes![0]} counts` : `Holes ${list(m.holes!.map(String))} count`} ${x}`);
  }
  if (spec.scoring === 'holes') lines.push('Match play: the side with more points on a hole wins the hole');
  if (spec.quota) lines.push('Quota: each player is measured against 36 minus their handicap');
  if (spec.segments.length) lines.push(`Separate bets: ${list(spec.segments.map(g => `${g.label} (${g.from}–${g.to})`))}`);

  const unit = spec.scoring === 'holes' ? 'hole' : 'point';
  const perMan = s.kind !== 'individual' && spec.money === 'per_man' ? ', a man' : '';
  if (stake > 0) {
    if (spec.payout === 'per_point') {
      lines.push(spec.money === 'each_opponent' && s.kind !== 'individual'
        ? `${money(stake)} a ${unit} against each opponent`
        : `${money(stake)} a ${unit}${perMan}, settled between every pair`);
    } else {
      lines.push(`${money(stake)}${perMan} to the winner of ${spec.segments.length > 1 ? 'each bet' : 'the bet'}`);
    }
  }
  lines.push(spec.net ? 'Net scores' : 'Gross scores');
  return lines;
}
