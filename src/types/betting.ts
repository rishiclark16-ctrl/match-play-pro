// Prop bet types
export interface PropBet {
  id: string;
  roundId: string;
  type: 'ctp' | 'longest_drive' | 'custom';
  holeNumber: number;
  stakes: number;
  description?: string;
  winnerId?: string;
  createdBy?: string;
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

// Prop bet templates
export const PROP_BET_TEMPLATES = [
  { type: 'ctp' as const, label: 'Closest to Pin', icon: '🎯', description: 'Closest to the pin on par 3s' },
  { type: 'longest_drive' as const, label: 'Longest Drive', icon: '💪', description: 'Longest drive on this hole' },
  { type: 'custom' as const, label: 'Custom Bet', icon: '🎲', description: 'Create your own side bet' },
] as const;

export function getPropBetLabel(type: PropBet['type']): string {
  const template = PROP_BET_TEMPLATES.find(t => t.type === type);
  return template?.label || 'Custom Bet';
}

export function getPropBetIcon(type: PropBet['type']): string {
  const template = PROP_BET_TEMPLATES.find(t => t.type === type);
  return template?.icon || '🎲';
}
