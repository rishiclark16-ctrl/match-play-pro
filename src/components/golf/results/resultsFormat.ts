/**
 * Display-only formatting for the results screens (Fairway Day money convention).
 * Nothing here computes money; it only formats and colours amounts.
 */

/** Money convention: won = Forest, owed = loss red, even = Ink. */
export const MONEY_WON = 'text-[#14532D]';
export const MONEY_OWED = 'text-[#B42318]';
export const MONEY_EVEN = 'text-foreground';

export function moneyClass(amount: number): string {
  if (amount > 0) return MONEY_WON;
  if (amount < 0) return MONEY_OWED;
  return MONEY_EVEN;
}

/** "+$28", "−$28" (true minus), "$0". Whole dollars unless cents are present. */
export function formatMoney(amount: number, { signed = true }: { signed?: boolean } = {}): string {
  const abs = Math.abs(amount);
  const body = Number.isInteger(Math.round(abs * 100) / 100) ? abs.toFixed(0) : abs.toFixed(2);
  if (!signed || amount === 0) return `$${body}`;
  return `${amount > 0 ? '+' : '−'}$${body}`;
}

/** Relative-to-par colour on white: under = Forest, over = loss red, even = Ink. */
export function toParClass(relToPar: number): string {
  if (relToPar < 0) return 'text-[#14532D]';
  if (relToPar > 0) return 'text-[#B42318]';
  return 'text-foreground';
}

export function firstName(name: string): string {
  return name.split(' ')[0] || name;
}
