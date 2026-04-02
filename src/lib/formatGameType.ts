const GAME_TYPE_MAP: Record<string, string> = {
  nassau: 'Nassau',
  skins: 'Skins',
  match_play: 'Match Play',
  wolf: 'Wolf',
  stableford: 'Stableford',
  best_ball: 'Best Ball',
  stroke_play: 'Stroke Play',
  prop_bets: 'Props',
};

export function formatGameType(type: string): string {
  return GAME_TYPE_MAP[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
