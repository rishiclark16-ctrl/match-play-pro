import { Player, Settlement, GameConfig, WolfHoleResult } from '@/types/golf';
import { SkinsResult } from './skins';
import { NassauResult } from './nassau';
import { calculateWolfStandings } from './wolf';

export interface NetSettlement {
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  amount: number;
}

export function calculateSettlement(
  players: Player[],
  skinsResult?: SkinsResult,
  nassauResult?: NassauResult,
  matchPlayWinnerId?: string | null,
  matchPlayStakes?: number,
  wolfResults?: WolfHoleResult[],
  wolfStakes?: number
): NetSettlement[] {
  // Build a ledger of who owes whom
  const ledger: Record<string, Record<string, number>> = {};
  
  players.forEach(p1 => {
    ledger[p1.id] = {};
    players.forEach(p2 => {
      if (p1.id !== p2.id) {
        ledger[p1.id][p2.id] = 0;
      }
    });
  });
  
  // Process skins earnings
  if (skinsResult) {
    const { standings, potPerSkin } = skinsResult;
    
    // Players with negative earnings owe those with positive earnings
    const winners = standings.filter(s => s.earnings > 0);
    const losers = standings.filter(s => s.earnings < 0);
    
    // Distribute losses to winners proportionally
    let remainingWinnings = winners.reduce((sum, w) => sum + w.earnings, 0);
    
    losers.forEach(loser => {
      let lossToDistribute = Math.abs(loser.earnings);
      
      winners.forEach(winner => {
        if (lossToDistribute > 0 && remainingWinnings > 0) {
          const proportion = winner.earnings / remainingWinnings;
          const payment = Math.min(lossToDistribute, Math.round(proportion * Math.abs(loser.earnings) * 100) / 100);
          
          ledger[loser.playerId][winner.playerId] += payment;
          lossToDistribute -= payment;
        }
      });
    });
  }
  
  // Process Nassau settlements
  if (nassauResult) {
    nassauResult.settlements.forEach(settlement => {
      ledger[settlement.fromPlayerId][settlement.toPlayerId] += settlement.amount;
    });
  }
  
  // Process match play
  if (matchPlayWinnerId && matchPlayStakes && players.length === 2) {
    const loserId = players.find(p => p.id !== matchPlayWinnerId)?.id;
    if (loserId) {
      ledger[loserId][matchPlayWinnerId] += matchPlayStakes;
    }
  }
  
  // Process Wolf settlements
  if (wolfResults && wolfResults.length > 0 && wolfStakes && players.length === 4) {
    const wolfStandings = calculateWolfStandings(wolfResults, players, wolfStakes);
    
    // Add Wolf earnings to ledger
    const winners = wolfStandings.filter(s => s.earnings > 0);
    const losers = wolfStandings.filter(s => s.earnings < 0);
    
    losers.forEach(loser => {
      let lossToDistribute = Math.abs(loser.earnings);
      
      winners.forEach(winner => {
        if (lossToDistribute > 0) {
          const proportion = winner.earnings / winners.reduce((sum, w) => sum + w.earnings, 0);
          const payment = Math.round(proportion * Math.abs(loser.earnings) * 100) / 100;
          
          if (payment > 0 && ledger[loser.playerId] && ledger[loser.playerId][winner.playerId] !== undefined) {
            ledger[loser.playerId][winner.playerId] += payment;
          }
          lossToDistribute -= payment;
        }
      });
    });
  }
  
  // Net out the ledger (A owes B $10, B owes A $4 = A owes B $6)
  const netSettlements: NetSettlement[] = [];
  const processed = new Set<string>();
  
  players.forEach(p1 => {
    players.forEach(p2 => {
      if (p1.id !== p2.id) {
        const key = [p1.id, p2.id].sort().join('-');
        if (processed.has(key)) return;
        processed.add(key);
        
        const p1OwesP2 = ledger[p1.id][p2.id] || 0;
        const p2OwesP1 = ledger[p2.id][p1.id] || 0;
        const net = p1OwesP2 - p2OwesP1;
        
        if (Math.abs(net) > 0.01) { // Ignore tiny amounts due to rounding
          if (net > 0) {
            netSettlements.push({
              fromPlayerId: p1.id,
              fromPlayerName: p1.name,
              toPlayerId: p2.id,
              toPlayerName: p2.name,
              amount: Math.round(net * 100) / 100
            });
          } else {
            netSettlements.push({
              fromPlayerId: p2.id,
              fromPlayerName: p2.name,
              toPlayerId: p1.id,
              toPlayerName: p1.name,
              amount: Math.round(Math.abs(net) * 100) / 100
            });
          }
        }
      }
    });
  });
  
  // Sort by amount descending
  return netSettlements.sort((a, b) => b.amount - a.amount);
}

export function formatSettlementText(settlement: NetSettlement): string {
  return `${settlement.fromPlayerName} owes ${settlement.toPlayerName} $${settlement.amount.toFixed(0)}`;
}

export function getTotalWinnings(
  playerId: string,
  settlements: NetSettlement[]
): number {
  let total = 0;
  
  settlements.forEach(s => {
    if (s.toPlayerId === playerId) {
      total += s.amount;
    } else if (s.fromPlayerId === playerId) {
      total -= s.amount;
    }
  });
  
  return total;
}
