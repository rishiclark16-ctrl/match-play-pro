import { Player, Settlement, GameConfig, WolfHoleResult } from '@/types/golf';
import { SkinsResult } from './skins';
import { NassauResult } from './nassau';
import { calculateWolfStandings } from './wolf';
import { VegasResult } from './vegas';
import { NinesResult } from './nines';
import { DefenderResult } from './defender';
import { SixesResult } from './sixes';
import { HouseGameResult } from './houseGame';
import { PropBet } from '@/types/betting';

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
  wolfStakes?: number,
  propBets?: PropBet[],
  houseGameResult?: HouseGameResult,
  vegasResult?: VegasResult,
  ninesResult?: NinesResult,
  defenderResult?: DefenderResult,
  sixesResult?: SixesResult,
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
    const remainingWinnings = winners.reduce((sum, w) => sum + w.earnings, 0);
    
    losers.forEach(loser => {
      let lossToDistribute = Math.abs(loser.earnings);

      winners.forEach((winner, idx) => {
        if (lossToDistribute <= 0) return;
        const isLast = idx === winners.length - 1;
        const payment = isLast
          ? Math.round(lossToDistribute * 100) / 100
          : Math.round((winner.earnings / remainingWinnings) * Math.abs(loser.earnings) * 100) / 100;
        const actualPayment = Math.min(lossToDistribute, payment);
        ledger[loser.playerId][winner.playerId] += actualPayment;
        lossToDistribute -= actualPayment;
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
  if (wolfResults && wolfResults.length > 0 && wolfStakes) {
    const wolfStandings = calculateWolfStandings(wolfResults, players, wolfStakes);
    
    // Add Wolf earnings to ledger
    const winners = wolfStandings.filter(s => s.earnings > 0);
    const losers = wolfStandings.filter(s => s.earnings < 0);
    
    const totalWinnings = winners.reduce((sum, w) => sum + w.earnings, 0);

    if (totalWinnings > 0) {
      losers.forEach(loser => {
        let lossToDistribute = Math.abs(loser.earnings);

        winners.forEach(winner => {
          if (lossToDistribute > 0) {
            const proportion = winner.earnings / totalWinnings;
            const payment = Math.round(proportion * Math.abs(loser.earnings) * 100) / 100;

            if (payment > 0 && ledger[loser.playerId]?.[winner.playerId] !== undefined) {
              ledger[loser.playerId][winner.playerId] += payment;
              lossToDistribute -= payment;
            } else if (payment > 0) {
              console.warn('[Settlement] Wolf ledger entry missing for:', loser.playerId, '->', winner.playerId);
            }
          }
        });
      });
    }
  }

  // Process prop bets
  if (propBets && propBets.length > 0) {
    // Only include settled prop bets (have a winner)
    const settledBets = propBets.filter(pb => pb.winnerId);

    settledBets.forEach(bet => {
      if (!bet.winnerId) return;

      // Each non-winner pays the winner the bet stakes
      players.forEach(player => {
        if (player.id !== bet.winnerId) {
          // player owes winner the stakes
          if (ledger[player.id]?.[bet.winnerId!] !== undefined) {
            ledger[player.id][bet.winnerId!] += bet.stakes;
          } else {
            console.warn('[Settlement] Prop bet player not in ledger, skipping:', player.id, '->', bet.winnerId);
          }
        }
      });
    });
  }

  // Process house game earnings
  if (houseGameResult && houseGameResult.standings.length > 0) {
    const winners = houseGameResult.standings.filter(s => s.netEarnings > 0);
    const losers = houseGameResult.standings.filter(s => s.netEarnings < 0);
    const totalWinnings = winners.reduce((sum, w) => sum + w.netEarnings, 0);

    if (totalWinnings > 0) {
      losers.forEach(loser => {
        let lossToDistribute = Math.abs(loser.netEarnings);

        winners.forEach((winner, idx) => {
          if (lossToDistribute <= 0) return;
          const isLast = idx === winners.length - 1;
          const payment = isLast
            ? Math.round(lossToDistribute * 100) / 100
            : Math.round((winner.netEarnings / totalWinnings) * Math.abs(loser.netEarnings) * 100) / 100;
          const actualPayment = Math.min(lossToDistribute, payment);

          if (ledger[loser.playerId]?.[winner.playerId] !== undefined) {
            ledger[loser.playerId][winner.playerId] += actualPayment;
          }
          lossToDistribute -= actualPayment;
        });
      });
    }
  }

  // Process Vegas earnings (team-based)
  if (vegasResult && players.length === 4) {
    const teamA = [players[0], players[1]];
    const teamB = [players[2], players[3]];
    const perPlayerA = vegasResult.teamAEarnings / 2;
    const perPlayerB = vegasResult.teamBEarnings / 2;

    // If team A wins, team B members each owe team A members
    if (vegasResult.teamAEarnings > 0) {
      teamB.forEach(loser => {
        teamA.forEach(winner => {
          if (ledger[loser.id]?.[winner.id] !== undefined) {
            ledger[loser.id][winner.id] += Math.abs(perPlayerB);
          }
        });
      });
    } else if (vegasResult.teamBEarnings > 0) {
      teamA.forEach(loser => {
        teamB.forEach(winner => {
          if (ledger[loser.id]?.[winner.id] !== undefined) {
            ledger[loser.id][winner.id] += Math.abs(perPlayerA);
          }
        });
      });
    }
  }

  // Process Nines earnings (pairwise settlement)
  if (ninesResult && ninesResult.standings.length > 0) {
    const winners = ninesResult.standings.filter(s => s.earnings > 0);
    const losers = ninesResult.standings.filter(s => s.earnings < 0);
    const totalWinnings = winners.reduce((sum, w) => sum + w.earnings, 0);

    if (totalWinnings > 0) {
      losers.forEach(loser => {
        let lossToDistribute = Math.abs(loser.earnings);
        winners.forEach((winner, idx) => {
          if (lossToDistribute <= 0) return;
          const isLast = idx === winners.length - 1;
          const payment = isLast
            ? Math.round(lossToDistribute * 100) / 100
            : Math.round((winner.earnings / totalWinnings) * Math.abs(loser.earnings) * 100) / 100;
          const actualPayment = Math.min(lossToDistribute, payment);
          if (ledger[loser.playerId]?.[winner.playerId] !== undefined) {
            ledger[loser.playerId][winner.playerId] += actualPayment;
          }
          lossToDistribute -= actualPayment;
        });
      });
    }
  }

  // Process Defender earnings (pairwise settlement)
  if (defenderResult && defenderResult.standings.length > 0) {
    const winners = defenderResult.standings.filter(s => s.earnings > 0);
    const losers = defenderResult.standings.filter(s => s.earnings < 0);
    const totalWinnings = winners.reduce((sum, w) => sum + w.earnings, 0);

    if (totalWinnings > 0) {
      losers.forEach(loser => {
        let lossToDistribute = Math.abs(loser.earnings);
        winners.forEach((winner, idx) => {
          if (lossToDistribute <= 0) return;
          const isLast = idx === winners.length - 1;
          const payment = isLast
            ? Math.round(lossToDistribute * 100) / 100
            : Math.round((winner.earnings / totalWinnings) * Math.abs(loser.earnings) * 100) / 100;
          const actualPayment = Math.min(lossToDistribute, payment);
          if (ledger[loser.playerId]?.[winner.playerId] !== undefined) {
            ledger[loser.playerId][winner.playerId] += actualPayment;
          }
          lossToDistribute -= actualPayment;
        });
      });
    }
  }

  // Process Sixes earnings (pairwise settlement)
  if (sixesResult && sixesResult.standings.length > 0) {
    const winners = sixesResult.standings.filter(s => s.earnings > 0);
    const losers = sixesResult.standings.filter(s => s.earnings < 0);
    const totalWinnings = winners.reduce((sum, w) => sum + w.earnings, 0);

    if (totalWinnings > 0) {
      losers.forEach(loser => {
        let lossToDistribute = Math.abs(loser.earnings);
        winners.forEach((winner, idx) => {
          if (lossToDistribute <= 0) return;
          const isLast = idx === winners.length - 1;
          const payment = isLast
            ? Math.round(lossToDistribute * 100) / 100
            : Math.round((winner.earnings / totalWinnings) * Math.abs(loser.earnings) * 100) / 100;
          const actualPayment = Math.min(lossToDistribute, payment);
          if (ledger[loser.playerId]?.[winner.playerId] !== undefined) {
            ledger[loser.playerId][winner.playerId] += actualPayment;
          }
          lossToDistribute -= actualPayment;
        });
      });
    }
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
  return `${settlement.fromPlayerName} owes ${settlement.toPlayerName} $${settlement.amount.toFixed(2)}`;
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
