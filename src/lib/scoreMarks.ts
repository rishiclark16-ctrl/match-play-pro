/** Golf score-to-par helpers shared by the ScoreMark component and screens. */
export type ScoreMarkKind = 'eagle' | 'birdie' | 'par' | 'bogey' | 'double';

export function scoreMarkKind(diffToPar: number): ScoreMarkKind {
  if (diffToPar <= -2) return 'eagle';
  if (diffToPar === -1) return 'birdie';
  if (diffToPar === 0) return 'par';
  if (diffToPar === 1) return 'bogey';
  return 'double';
}


/** Sentence-case name for a score relative to par ("Birdie", "Double bogey"). */
export function scoreName(strokes: number, par: number): string {
  const diff = strokes - par;
  if (strokes === 1) return 'Hole in one';
  if (diff <= -3) return 'Albatross';
  if (diff === -2) return 'Eagle';
  if (diff === -1) return 'Birdie';
  if (diff === 0) return 'Par';
  if (diff === 1) return 'Bogey';
  if (diff === 2) return 'Double bogey';
  if (diff === 3) return 'Triple bogey';
  return `+${diff}`;
}
