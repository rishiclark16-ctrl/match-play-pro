/**
 * Display-only money formatting for the live game sections.
 * +$14 / −$2 / $0, with cents only when the amount isn't whole.
 * Uses a true minus sign so "owed" reads at a glance in sunlight.
 */
export function signedMoney(amount: number): string {
  const abs = Math.abs(amount);
  const body = Number.isInteger(abs) ? `${abs}` : abs.toFixed(2);
  if (amount > 0) return `+$${body}`;
  if (amount < 0) return `−$${body}`;
  return '$0';
}
