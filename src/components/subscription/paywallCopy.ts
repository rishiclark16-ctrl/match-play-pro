import { Users, Zap, Trophy, BarChart3, Sparkles } from 'lucide-react';

// Feature comparison data — must match TIER_LIMITS in src/hooks/useSubscription.ts
export const PRO_FEATURES = [
  { icon: Sparkles, label: 'AI Game Builder: describe any game and MATCH sets it up', free: '1 saved format' },
  { icon: Zap, label: 'Nassau, Wolf, Vegas, Stableford, Best Ball and 5 more', free: 'Stroke, Match and Skins' },
  { icon: Users, label: 'Up to 8 players, unlimited friends and groups', free: '4 players, 4 friends, 1 group' },
  { icon: Trophy, label: 'All prop bets and skins carryover', free: 'Closest to the pin, longest drive' },
  { icon: BarChart3, label: 'Full stats and settlement tracking', free: 'Basic stats' },
];

/** Headline tailored to whatever the user just tried to use. */
export function paywallHeadline(feature?: string): { title: string; subtitle: string } {
  if (!feature || feature === 'Pro') {
    return { title: 'Unlock the full experience', subtitle: 'Every game your group plays, every player, every dollar tracked.' };
  }
  if (/house game|format/i.test(feature)) {
    return { title: 'Build any game with AI', subtitle: "Describe your group's game in plain English. MATCH turns it into rules and keeps score." };
  }
  if (/friend|group|player/i.test(feature)) {
    return { title: 'Bring the whole crew', subtitle: 'Up to 8 players a round, unlimited friends and groups.' };
  }
  return { title: 'Play ' + feature + ' with MATCH Pro', subtitle: 'Unlock every betting game and let MATCH handle the math.' };
}

/** Percent saved by paying yearly vs 12 months of monthly. Rounded down so it never overstates. */
export function annualSavingsPercent(monthly: number, annual: number): number {
  if (!(monthly > 0) || !(annual > 0)) return 0;
  return Math.max(0, Math.floor((1 - annual / (monthly * 12)) * 100));
}
