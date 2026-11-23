/**
 * Builds a short, readable name for an AI-parsed game format,
 * e.g. "$5 Nassau + Presses" instead of a truncated description.
 * Pure function — safe to call during render.
 */
export interface NameablePrimitive {
  id: string;
  value?: unknown;
  infeasible?: boolean;
}

const FORMAT_LABELS: Record<string, string> = {
  format_nassau: 'Nassau',
  format_skins: 'Skins',
  format_skins_back9_only: 'Back-9 Skins',
  format_match_play: 'Match Play',
  format_stroke_play: 'Stroke Play',
  format_stableford: 'Stableford',
  format_modified_stableford: 'Mod Stableford',
  format_wolf: 'Wolf',
  format_vegas: 'Vegas',
  format_hammer: 'Hammer',
  format_bingo_bango_bongo: 'Bingo Bango Bongo',
  format_rabbit: 'Rabbit',
  format_quota: 'Quota',
  format_defender: 'Defender',
};

const MAX_LEN = 30;

export function suggestFormatName(
  primitives: NameablePrimitive[],
  description: string | undefined,
  fallback = 'My Format',
): string {
  const usable = primitives.filter(p => !p.infeasible);
  const ids = new Set(usable.map(p => p.id));
  const formats = usable.map(p => FORMAT_LABELS[p.id]).filter(Boolean) as string[];

  if (formats.length > 0) {
    const unit = usable.find(p => p.id === 'settlement_unit_value')?.value;
    const prefix = typeof unit === 'number' && unit > 0 ? `$${unit} ` : '';
    let name = prefix + formats.slice(0, 2).join(' + ');
    const hasPress = [...ids].some(id => id.startsWith('press_'));
    if (hasPress && formats.length === 1) name += ' + Presses';
    if (name.length <= MAX_LEN) return name;
    return prefix + formats[0];
  }

  if (!description?.trim()) return fallback;
  const firstSentence = description.split(/[.!?]/)[0].trim();
  if (firstSentence.length > 0 && firstSentence.length <= MAX_LEN) return firstSentence;
  // Cut at a word boundary rather than mid-word.
  const cut = description.slice(0, MAX_LEN - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 10 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}
