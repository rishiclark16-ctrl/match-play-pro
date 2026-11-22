import { PlayerBalance } from '@/hooks/useGroupLedger';

export const ledgerSpringTransition = { type: 'spring', stiffness: 300, damping: 28 } as const;

/** Fairway Day sentence-case section label. */
export const ledgerSectionLabel = 'text-[13px] font-semibold text-muted-foreground mb-2 px-1';

/** Money convention on white: won = Forest, owed = #B42318, even = Ink. */
export function moneyTone(amount: number): string {
  if (amount > 0.005) return 'text-primary';
  if (amount < -0.005) return 'text-[#B42318]';
  return 'text-foreground';
}

export function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  return `$${abs.toFixed(2).replace(/\.00$/, '')}`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Compute the minimum set of peer-to-peer payments required to zero out
 * every player's balance in the group.
 */
export function computeMinimumSettlements(
  balances: PlayerBalance[],
): { fromProfileId: string; toProfileId: string; amount: number }[] {
  const debtors = balances
    .filter(p => p.netBalance < 0)
    .map(p => ({ id: p.profileId, amount: Math.abs(p.netBalance) }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter(p => p.netBalance > 0)
    .map(p => ({ id: p.profileId, amount: p.netBalance }))
    .sort((a, b) => b.amount - a.amount);

  const payments: { fromProfileId: string; toProfileId: string; amount: number }[] = [];
  let di = 0, ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const payment = Math.min(debtors[di].amount, creditors[ci].amount);
    if (payment > 0.005) {
      payments.push({
        fromProfileId: debtors[di].id,
        toProfileId: creditors[ci].id,
        amount: Math.round(payment * 100) / 100,
      });
    }
    debtors[di].amount -= payment;
    creditors[ci].amount -= payment;
    if (debtors[di].amount < 0.005) di++;
    if (creditors[ci].amount < 0.005) ci++;
  }
  return payments;
}
