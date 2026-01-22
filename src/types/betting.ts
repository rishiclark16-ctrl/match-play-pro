// Prop bet types
export type PropBetType =
  | 'ctp'           // Closest to pin (par 3s)
  | 'longest_drive' // Longest drive
  | 'greenie'       // Hit green on par 3 + closest + 1-putt
  | 'sandie'        // Up and down from bunker
  | 'barkie'        // Hit a tree, still make par or better
  | 'polie'         // 3-putt or worse but still make par
  | 'arnie'         // Par or better after hitting a tree
  | 'ferret'        // Hole out from off the green
  | 'snake'         // 3-putt (negative, loser pays)
  | 'custom';

export interface PropBet {
  id: string;
  roundId: string;
  type: PropBetType;
  holeNumber: number;
  stakes: number;
  description?: string | null;
  winnerId?: string | null;
  createdBy?: string | null;
  createdAt: Date;
}

// Settlement types
export interface BetSettlement {
  id: string;
  roundId: string;
  fromPlayerId: string;
  toPlayerId: string;
  amount: number;
  status: 'pending' | 'paid' | 'forgiven';
  paidAt?: Date;
  createdAt: Date;
}

// Live money tracking
export interface PlayerMoney {
  playerId: string;
  playerName: string;
  currentBalance: number; // positive = winning, negative = losing
  previousBalance: number;
  change: number; // change from last hole
}

// Prop bet templates grouped by category
export const PROP_BET_TEMPLATES = [
  // Standard bets
  { type: 'ctp' as const, label: 'Closest to Pin', icon: '🎯', description: 'Closest to the pin on par 3s', category: 'standard' },
  { type: 'longest_drive' as const, label: 'Longest Drive', icon: '💪', description: 'Longest drive on this hole', category: 'standard' },
  { type: 'greenie' as const, label: 'Greenie', icon: '🟢', description: 'Hit green on par 3, closest, and 1-putt', category: 'standard' },

  // Junk/Save bets
  { type: 'sandie' as const, label: 'Sandie', icon: '🏖️', description: 'Up and down from a bunker', category: 'junk' },
  { type: 'barkie' as const, label: 'Barkie', icon: '🌲', description: 'Hit a tree, still make par or better', category: 'junk' },
  { type: 'polie' as const, label: 'Polie', icon: '🏁', description: '3-putt or worse but still make par', category: 'junk' },
  { type: 'arnie' as const, label: 'Arnie', icon: '⛳', description: 'Par or better after hitting a tree', category: 'junk' },
  { type: 'ferret' as const, label: 'Ferret', icon: '🦡', description: 'Hole out from off the green', category: 'junk' },

  // Negative bets (loser pays)
  { type: 'snake' as const, label: 'Snake', icon: '🐍', description: '3-putt penalty (loser pays)', category: 'negative' },

  // Custom
  { type: 'custom' as const, label: 'Custom Bet', icon: '🎲', description: 'Create your own side bet', category: 'custom' },
] as const;

export function getPropBetLabel(type: PropBet['type']): string {
  const template = PROP_BET_TEMPLATES.find(t => t.type === type);
  return template?.label || 'Custom Bet';
}

export function getPropBetIcon(type: PropBet['type']): string {
  const template = PROP_BET_TEMPLATES.find(t => t.type === type);
  return template?.icon || '🎲';
}
