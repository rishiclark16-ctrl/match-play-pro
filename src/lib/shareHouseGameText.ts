interface HouseGameStanding {
  playerName: string;
  netEarnings: number;
}

interface JunkSummaryEntry {
  name: string;
  net: number;
}

interface BuildHouseGameShareTextArgs {
  courseName: string;
  /** Round date (Date or ISO string). */
  date: string | Date;
  standings: HouseGameStanding[];
  junkSummary: JunkSummaryEntry[];
}

/**
 * Builds the plaintext "House Game Results" share string. Pure — no I/O.
 *
 * Sample output:
 *   Pebble Beach — Apr 28, 2026
 *   House Game Results:
 *     Alice: +$42
 *     Bob: -$15
 *   Junk: Charlie +$3
 */
export function buildHouseGameShareText({
  courseName,
  date,
  standings,
  junkSummary,
}: BuildHouseGameShareTextArgs): string {
  const dateStr = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const courseLine = `${courseName} — ${dateStr}`;

  const standingsLines = standings
    .slice()
    .sort((a, b) => b.netEarnings - a.netEarnings)
    .map(s => {
      const sign = s.netEarnings >= 0 ? '+' : '';
      return `  ${s.playerName.split(' ')[0]}: ${sign}$${s.netEarnings.toFixed(0)}`;
    });

  const junkLine =
    junkSummary.length > 0
      ? `\nJunk: ${junkSummary
          .map(e => `${e.name.split(' ')[0]} ${e.net >= 0 ? '+' : ''}$${e.net.toFixed(0)}`)
          .join(', ')}`
      : '';

  return [courseLine, 'House Game Results:', ...standingsLines, junkLine].filter(Boolean).join('\n');
}
