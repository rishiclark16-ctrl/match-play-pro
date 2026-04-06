import { PlayerWithScores, GameConfig, HoleInfo, Score, Press } from '@/types/golf';
import { calculateSkins, SkinsResult } from './skins';
import { calculateNassau, NassauResult } from './nassau';
import { calculateMatchPlay, MatchPlayResult } from './matchPlay';
import { calculateWolfStandings } from './wolf';
import { calculateHouseGame } from './houseGame';
import { buildScoringConfig } from '@/lib/houseGame/engine';
import { getStrokesPerHole } from '@/lib/handicapUtils';
import { PlayerMoney, PropBet } from '@/types/betting';

interface MoneyBreakdown {
  skins: number;
  nassau: number;
  match: number;
  wolf: number;
  houseGame: number;
  propBets: number;
  total: number;
}

export interface LiveMoneyState {
  players: PlayerMoney[];
  biggestSwing: {
    playerId: string;
    playerName: string;
    amount: number;
    holeNumber: number;
  } | null;
  breakdown: Map<string, MoneyBreakdown>;
}

// Calculate live money standings up to a specific hole
export function calculateLiveMoney(
  players: PlayerWithScores[],
  scores: Score[],
  games: GameConfig[],
  holeInfo: HoleInfo[],
  presses: Press[],
  upToHole: number,
  previousMoney?: Map<string, number>,
  propBets?: PropBet[]
): LiveMoneyState {
  const breakdown = new Map<string, MoneyBreakdown>();
  
  // Initialize breakdown for each player
  players.forEach(p => {
    breakdown.set(p.id, { skins: 0, nassau: 0, match: 0, wolf: 0, houseGame: 0, propBets: 0, total: 0 });
  });

  // Filter scores up to the current hole
  const relevantScores = scores.filter(s => s.holeNumber <= upToHole);
  
  // Build strokes map for net calculations
  const strokesMap = new Map<string, Map<number, number>>();
  players.forEach(p => {
    const playerMap = new Map<number, number>();
    if (p.playingHandicap && p.playingHandicap > 0) {
      const strokesPerHole = getStrokesPerHole(p.playingHandicap, holeInfo);
      strokesPerHole.forEach((strokes, holeNum) => {
        if (strokes > 0) playerMap.set(holeNum, strokes);
      });
    }
    strokesMap.set(p.id, playerMap);
  });

  // Calculate each game's contribution
  games.forEach(game => {
    switch (game.type) {
      case 'skins': {
        const skinsResult = calculateSkins(
          relevantScores,
          players,
          upToHole,
          game.stakes,
          game.carryover ?? true,
          game.useNet ? strokesMap : undefined
        );
        
        // Add skins winnings to breakdown
        skinsResult.standings.forEach(standing => {
          const pb = breakdown.get(standing.playerId);
          if (pb) {
            pb.skins += standing.earnings;
            pb.total += standing.earnings;
          }
        });
        break;
      }
      
      case 'nassau': {
        if (players.length === 2) {
          const nassauResult = calculateNassau(
            relevantScores,
            players,
            game.stakes,
            presses.filter(p => p.startHole <= upToHole),
            (holeInfo.length <= 9 ? 9 : 18) as 9 | 18,
            game.useNet ? strokesMap : undefined
          );
          
          // Calculate Nassau payouts from settlements
          nassauResult.settlements.forEach(settlement => {
            const fromPb = breakdown.get(settlement.fromPlayerId);
            const toPb = breakdown.get(settlement.toPlayerId);
            
            if (fromPb) {
              fromPb.nassau -= settlement.amount;
              fromPb.total -= settlement.amount;
            }
            if (toPb) {
              toPb.nassau += settlement.amount;
              toPb.total += settlement.amount;
            }
          });
        }
        break;
      }
      
      case 'match': {
        if (players.length === 2 && game.stakes > 0) {
          const matchResult = calculateMatchPlay(
            relevantScores,
            players,
            holeInfo,
            game.useNet ? strokesMap : undefined,
            (holeInfo.length <= 9 ? 9 : 18) as 9 | 18
          );

          // Each hole won earns stakes from the opponent
          matchResult.holeResults.forEach(hr => {
            if (hr.winnerId) {
              const loserId = players.find(p => p.id !== hr.winnerId)?.id;
              if (loserId) {
                const winnerPb = breakdown.get(hr.winnerId);
                const loserPb = breakdown.get(loserId);
                if (winnerPb) {
                  winnerPb.match += game.stakes;
                  winnerPb.total += game.stakes;
                }
                if (loserPb) {
                  loserPb.match -= game.stakes;
                  loserPb.total -= game.stakes;
                }
              }
            }
          });
        }
        break;
      }

      case 'wolf': {
        if (players.length === 4 && game.wolfResults) {
          const relevantResults = game.wolfResults.filter(r => r.holeNumber <= upToHole);
          const wolfStandings = calculateWolfStandings(relevantResults, players, game.stakes);

          wolfStandings.forEach(standing => {
            const pb = breakdown.get(standing.playerId);
            if (pb) {
              pb.wolf += standing.earnings;
              pb.total += standing.earnings;
            }
          });
        }
        break;
      }

      case 'house': {
        if (game.activePrimitives && game.activePrimitives.length > 0 && holeInfo.length > 0) {
          try {
            const config = buildScoringConfig(game.activePrimitives);
            const totalHoles = (holeInfo.length <= 9 ? 9 : 18) as 9 | 18;
            const houseResult = calculateHouseGame(
              relevantScores,
              players,
              holeInfo,
              config,
              113, // default slope
              totalHoles,
              game.bbbResults,
            );
            houseResult.standings.forEach(standing => {
              const pb = breakdown.get(standing.playerId);
              if (pb) {
                pb.houseGame += standing.netEarnings;
                pb.total += standing.netEarnings;
              }
            });
          } catch (e) {
            console.error('[MoneyTracker] House game calc error:', e);
          }
        }
        break;
      }
    }
  });

  // Calculate prop bet winnings
  if (propBets && propBets.length > 0) {
    const playerCount = players.length;
    
    // Filter prop bets up to current hole that have winners
    const relevantPropBets = propBets.filter(pb => pb.holeNumber <= upToHole && pb.winnerId);
    
    relevantPropBets.forEach(bet => {
      if (!bet.winnerId) return;
      
      // Winner gets stakes from each other player
      const winnings = bet.stakes * (playerCount - 1);
      const lossPer = bet.stakes;
      
      // Add winnings to winner
      const winnerBreakdown = breakdown.get(bet.winnerId);
      if (winnerBreakdown) {
        winnerBreakdown.propBets += winnings;
        winnerBreakdown.total += winnings;
      }
      
      // Subtract from other players
      players.forEach(p => {
        if (p.id !== bet.winnerId) {
          const playerBreakdown = breakdown.get(p.id);
          if (playerBreakdown) {
            playerBreakdown.propBets -= lossPer;
            playerBreakdown.total -= lossPer;
          }
        }
      });
    });
  }

  // Build player money array
  const playerMoney: PlayerMoney[] = players.map(p => {
    const pb = breakdown.get(p.id)!;
    const prevBalance = previousMoney?.get(p.id) ?? 0;
    
    return {
      playerId: p.id,
      playerName: p.name,
      currentBalance: Math.round(pb.total * 100) / 100,
      previousBalance: prevBalance,
      change: Math.round((pb.total - prevBalance) * 100) / 100,
    };
  });

  // Find biggest swing this hole
  let biggestSwing: LiveMoneyState['biggestSwing'] = null;
  const maxChange = Math.max(...playerMoney.map(p => Math.abs(p.change)));
  
  if (maxChange > 0) {
    const swingPlayer = playerMoney.find(p => Math.abs(p.change) === maxChange);
    if (swingPlayer) {
      biggestSwing = {
        playerId: swingPlayer.playerId,
        playerName: swingPlayer.playerName,
        amount: swingPlayer.change,
        holeNumber: upToHole,
      };
    }
  }

  return {
    players: playerMoney.sort((a, b) => b.currentBalance - a.currentBalance),
    biggestSwing,
    breakdown,
  };
}

export function formatMoney(amount: number): string {
  const absAmount = Math.abs(amount);
  if (amount >= 0) {
    return `+$${absAmount.toFixed(2)}`;
  }
  return `-$${absAmount.toFixed(2)}`;
}

export function getMoneyColor(amount: number): string {
  if (amount > 0) return 'text-success';
  if (amount < 0) return 'text-danger';
  return 'text-muted-foreground';
}
