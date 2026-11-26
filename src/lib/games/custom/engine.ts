/**
 * Scores a custom game (GameSpec) from a scorecard. Pure: same inputs, same result.
 *
 * Money is accrued hole by hole between every pair of sides, so it nets to zero by
 * construction and works when partners rotate (Sixes) or the lone player rotates
 * (Defender). See types.ts for the building blocks.
 */
import type { HoleInfo, Score } from '@/types/golf';
import type {
  ContestSpec, CustomGameResult, CustomHoleResult, CustomSegmentResult, GameSpec, ParTable, SideMetric, Transfer,
} from './types';

export type StrokesMap = Map<string, Map<number, number>>;

export interface CustomGameInput {
  spec: GameSpec;
  playerIds: string[];
  scores: Score[];
  holeInfo: HoleInfo[];
  /** Handicap strokes per player per hole (used when spec.net, and for quota). */
  strokes?: StrokesMap;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The sides playing a given hole. */
export function sidesForHole(spec: GameSpec, hole: number, playerIds: string[]): string[][] {
  const s = spec.sides;
  switch (s.kind) {
    case 'individual':
      return playerIds.map(p => [p]);
    case 'teams':
      return s.teams;
    case 'rotating_teams':
      return s.rotations.find(r => hole >= r.from && hole <= r.to)?.teams ?? [];
    case 'one_vs_field': {
      if (!s.order.length) return [];
      const lone = s.order[(hole - 1) % s.order.length];
      return [[lone], playerIds.filter(p => p !== lone)];
    }
  }
}

function parPoints(table: ParTable, toPar: number): number {
  if (toPar <= -3) return table.albatross;
  if (toPar === -2) return table.eagle;
  if (toPar === -1) return table.birdie;
  if (toPar === 0) return table.par;
  if (toPar === 1) return table.bogey;
  if (toPar === 2) return table.double;
  return table.worse;
}

/** A side's number on the hole for a metric. */
export function sideMetric(metric: SideMetric, scores: number[], par: number): number {
  const sorted = [...scores].sort((a, b) => a - b);
  switch (metric) {
    case 'score':
    case 'best':
      return sorted[0];
    case 'worst':
      return sorted[sorted.length - 1];
    case 'total':
      return sorted.reduce((a, b) => a + b, 0);
    case 'vegas':
    case 'daytona': {
      if (sorted.length < 2) return sorted[0];
      const [lo, hi] = [sorted[0], sorted[sorted.length - 1]];
      // A double-digit score always leads (a 10 and a 4 make 104).
      const highFirst = hi >= 10 || (metric === 'daytona' && lo > par);
      return highFirst ? Number(`${hi}${lo}`) : Number(`${lo}${hi}`);
    }
  }
}

interface HoleCtx {
  hole: number;
  par: number;
  sides: string[][];
  /** Net (or gross) scores per player, for the game's comparisons. */
  play: Map<string, number>;
  gross: Map<string, number>;
}

/** Each side's metric for a contest; one-vs-field games weight the lone player. */
function metricsFor(spec: GameSpec, c: ContestSpec, ctx: HoleCtx): number[] {
  const s = spec.sides;
  return ctx.sides.map((side, i) => {
    const vals = side.map(p => ctx.play.get(p)!);
    if (s.kind === 'one_vs_field') {
      return i === 0 ? vals[0] * s.loneWeight : sideMetric(s.fieldMetric, vals, ctx.par * side.length);
    }
    return sideMetric(c.metric, vals, ctx.par);
  });
}

function uniqueMin(values: number[]): number {
  const min = Math.min(...values);
  return values.filter(v => v === min).length === 1 ? values.indexOf(min) : -1;
}

/** Points per side for one contest on one hole. Returns the winner (low_wins) for multipliers. */
function scoreContest(
  spec: GameSpec, c: ContestSpec, ctx: HoleCtx, carry: number,
): { points: number[]; winner: number; carryOut: number } {
  const n = ctx.sides.length;
  const points = new Array(n).fill(0);
  const m = metricsFor(spec, c, ctx);
  switch (c.kind) {
    case 'low_wins': {
      const w = uniqueMin(m);
      if (w < 0) return { points, winner: -1, carryOut: spec.ties === 'carry' ? carry + c.points : 0 };
      points[w] = c.points + carry;
      return { points, winner: w, carryOut: 0 };
    }
    case 'rank': {
      const order = m.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
      let pos = 0;
      while (pos < order.length) {
        let end = pos;
        while (end + 1 < order.length && order[end + 1].v === order[pos].v) end++;
        const slots = c.table.slice(pos, end + 1);
        while (slots.length < end - pos + 1) slots.push(0);
        const tied = end > pos;
        const each = tied && c.ties === 'void' ? 0 : slots.reduce((a, b) => a + b, 0) / slots.length;
        for (let k = pos; k <= end; k++) points[order[k].i] = each;
        pos = end + 1;
      }
      return { points, winner: -1, carryOut: 0 };
    }
    case 'vs_par': {
      ctx.sides.forEach((side, i) => {
        if (c.metric === 'total') {
          points[i] = side.reduce((sum, p) => sum + parPoints(c.table, ctx.play.get(p)! - ctx.par), 0);
        } else {
          const v = sideMetric(c.metric === 'vegas' || c.metric === 'daytona' ? 'best' : c.metric, side.map(p => ctx.play.get(p)!), ctx.par);
          points[i] = parPoints(c.table, v - ctx.par);
        }
      });
      return { points, winner: -1, carryOut: 0 };
    }
    case 'diff':
      return { points: m.map(v => -v), winner: -1, carryOut: 0 };
  }
}

function holeMultiplier(spec: GameSpec, ctx: HoleCtx): number {
  let f = 1;
  for (const mu of spec.multipliers) {
    if (mu.when === 'par3' && ctx.par === 3) f *= mu.factor;
    else if (mu.when === 'par5' && ctx.par === 5) f *= mu.factor;
    else if (mu.when === 'holes' && mu.holes?.includes(ctx.hole)) f *= mu.factor;
    else if (mu.when === 'any_birdie' && [...ctx.gross.values()].some(g => g <= ctx.par - 1)) f *= mu.factor;
  }
  return f;
}

function winnerBirdieFactor(spec: GameSpec, ctx: HoleCtx, winner: number): number {
  if (winner < 0) return 1;
  let f = 1;
  const best = Math.min(...ctx.sides[winner].map(p => ctx.gross.get(p)!));
  for (const mu of spec.multipliers) if (mu.when === 'winner_birdie' && best <= ctx.par - 1) f *= mu.factor;
  return f;
}

/** Adds what side `to` is owed by side `from` (amount per point already applied) to the ledger. */
function owe(ledger: Map<string, number>, spec: GameSpec, fromSide: string[], toSide: string[], amount: number) {
  if (!(amount > 0) || !fromSide.length || !toSide.length) return;
  const each = spec.money === 'per_man' ? amount / toSide.length : amount;
  for (const f of fromSide) for (const t of toSide) {
    if (f === t) continue;
    const k = `${f}|${t}`;
    ledger.set(k, (ledger.get(k) ?? 0) + each);
  }
}

function settlePairs(ledger: Map<string, number>, spec: GameSpec, sides: string[][], pts: number[], stake: number) {
  for (let a = 0; a < sides.length; a++) for (let b = a + 1; b < sides.length; b++) {
    const d = pts[a] - pts[b];
    if (d > 0) owe(ledger, spec, sides[b], sides[a], d * stake);
    else if (d < 0) owe(ledger, spec, sides[a], sides[b], -d * stake);
  }
}

function netLedger(ledger: Map<string, number>): Transfer[] {
  const out: Transfer[] = [];
  const seen = new Set<string>();
  for (const [k, v] of ledger) {
    const [f, t] = k.split('|');
    const pair = [f, t].sort().join('|');
    if (seen.has(pair)) continue;
    seen.add(pair);
    const back = ledger.get(`${t}|${f}`) ?? 0;
    const net = round2(v - back);
    if (net > 0) out.push({ from: f, to: t, amount: net });
    else if (net < 0) out.push({ from: t, to: f, amount: -net });
  }
  return out;
}

function quotaFor(strokes: StrokesMap | undefined, player: string, holes: number[]): number {
  const received = holes.reduce((s, h) => s + (strokes?.get(player)?.get(h) ?? 0), 0);
  return (36 * holes.length) / 18 - received;
}

/** Scores every hole of the round. */
export function calculateCustomGame({ spec, playerIds, scores, holeInfo, strokes }: CustomGameInput): CustomGameResult {
  const byHole = new Map<number, Map<string, number>>();
  for (const s of scores) {
    if (!byHole.has(s.holeNumber)) byHole.set(s.holeNumber, new Map());
    byHole.get(s.holeNumber)!.set(s.playerId, s.strokes);
  }
  const holes: CustomHoleResult[] = [];
  const byPlayer: Record<string, number> = Object.fromEntries(playerIds.map(p => [p, 0]));
  const carries = spec.contests.map(() => 0);

  for (const info of [...holeInfo].sort((a, b) => a.number - b.number)) {
    const sides = sidesForHole(spec, info.number, playerIds);
    const gross = byHole.get(info.number) ?? new Map<string, number>();
    const everyone = sides.flat();
    const played = sides.length >= 2 && everyone.length > 0 && everyone.every(p => gross.has(p));
    if (!played) {
      holes.push({ hole: info.number, played: false, sides, points: sides.map(() => 0), carried: carries.reduce((a, b) => a + b, 0), multiplier: 1 });
      continue;
    }
    const play = new Map(everyone.map(p => [p, gross.get(p)! - (spec.net ? strokes?.get(p)?.get(info.number) ?? 0 : 0)]));
    const ctx: HoleCtx = { hole: info.number, par: info.par, sides, play, gross };
    const mult = holeMultiplier(spec, ctx);
    const pts = sides.map(() => 0);
    spec.contests.forEach((c, ci) => {
      const r = scoreContest(spec, c, ctx, carries[ci]);
      carries[ci] = r.carryOut;
      const f = mult * winnerBirdieFactor(spec, ctx, r.winner);
      r.points.forEach((p, i) => { pts[i] += p * f; });
    });
    let sidePoints = pts;
    if (spec.scoring === 'holes') {
      const best = Math.max(...pts);
      const leaders = pts.filter(p => p === best).length;
      sidePoints = pts.map(p => (p === best && leaders === 1 ? 1 : 0));
    }
    sides.forEach((side, i) => side.forEach(p => { byPlayer[p] = (byPlayer[p] ?? 0) + sidePoints[i]; }));
    holes.push({ hole: info.number, played: true, sides, points: sidePoints, carried: carries.reduce((a, b) => a + b, 0), multiplier: mult });
  }

  const segDefs = spec.segments.length
    ? spec.segments
    : [{ from: holeInfo[0]?.number ?? 1, to: holeInfo[holeInfo.length - 1]?.number ?? 18, label: 'Round' }];
  const segments: CustomSegmentResult[] = segDefs.map(seg => {
    const inSeg = holes.filter(h => h.hole >= seg.from && h.hole <= seg.to);
    const segPlayers: Record<string, number> = {};
    for (const h of inSeg) h.sides.forEach((side, i) => side.forEach(p => { segPlayers[p] = (segPlayers[p] ?? 0) + h.points[i]; }));
    if (spec.quota) {
      const segHoles = inSeg.filter(h => h.played).map(h => h.hole);
      for (const p of Object.keys(segPlayers)) segPlayers[p] -= quotaFor(strokes, p, segHoles);
    }
    const sides = sidesForHole(spec, seg.from, playerIds);
    const totals = sides.map(side => segPlayers[side[0]] ?? 0);
    const best = Math.max(...totals);
    const leaderIdx = totals.filter(t => t === best).length === 1 ? totals.indexOf(best) : -1;
    return {
      label: seg.label, from: seg.from, to: seg.to,
      byPlayer: segPlayers,
      leaders: leaderIdx >= 0 ? sides[leaderIdx] : [],
      complete: inSeg.length > 0 && inSeg.every(h => h.played),
    };
  });

  if (spec.quota) {
    const playedHoles = holes.filter(h => h.played).map(h => h.hole);
    for (const p of playerIds) byPlayer[p] -= quotaFor(strokes, p, playedHoles);
  }
  return { holes, byPlayer, segments, holesPlayed: holes.filter(h => h.played).length };
}

/**
 * Money for a custom game. `final` false is the live view: an unfinished per-segment
 * bet credits whoever leads it now, "if it ended here".
 */
export function customGameTransfers(
  spec: GameSpec, result: CustomGameResult, playerIds: string[], stake: number, final: boolean, strokes?: StrokesMap,
): Transfer[] {
  if (!(stake > 0)) return [];
  const ledger = new Map<string, number>();
  if (spec.payout === 'per_point') {
    for (const h of result.holes) if (h.played) settlePairs(ledger, spec, h.sides, h.points, stake);
    if (spec.quota) {
      // Quota is part of each player's total: settle the quota differences once.
      const played = result.holes.filter(h => h.played).map(h => h.hole);
      if (played.length) settlePairs(ledger, spec, playerIds.map(p => [p]), playerIds.map(p => -quotaFor(strokes, p, played)), stake);
    }
  } else {
    for (const seg of result.segments) {
      if (!seg.leaders.length || (final && !seg.complete)) continue;
      const sides = sidesForHole(spec, seg.from, playerIds);
      const winner = sides.find(side => side.includes(seg.leaders[0]));
      if (!winner) continue;
      for (const other of sides) if (other !== winner) owe(ledger, spec, other, winner, stake);
    }
  }
  return netLedger(ledger);
}

/** Scores the game and returns its money in one call. */
export function settleCustomGame(input: CustomGameInput & { stake: number; final: boolean }): { result: CustomGameResult; transfers: Transfer[] } {
  const result = calculateCustomGame(input);
  return { result, transfers: customGameTransfers(input.spec, result, input.playerIds, input.stake, input.final, input.strokes) };
}
