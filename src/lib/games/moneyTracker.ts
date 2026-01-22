import { PlayerWithScores, GameConfig, HoleInfo, Score, Press } from '@/types/golf';
import { calculateSkins, SkinsResult } from './skins';
import { calculateNassau, NassauResult } from './nassau';
import { PlayerMoney, PropBet } from '@/types/betting';

interface MoneyBreakdown {
  skins: number;
  nassau: number;
  wolf: number;
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
    breakdown.set(p.id, { skins: 0, nassau: 0, wolf: 0, propBets: 0, total: 0 });
  });

  // Filter scores up to the current hole
  const relevantScores = scores.filter(s => s.holeNumber <= upToHole);
  
  // Build strokes map for net calculations
  const strokesMap = new Map<string, Map<number, number>>();
  players.forEach(p => {
    const playerMap = new Map<number, number>();
    if (p.playingHandicap && p.playingHandicap > 0) {
      holeInfo.forEach(hole => {
        if (hole.handicap && hole.handicap <= p.playingHandicap!) {
          playerMap.set(hole.number, 1);
        }
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
            18, // default to 18 holes
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
      
      case 'wolf': {
        if (players.length === 4 && game.wolfResults) {
          const relevantResults = game.wolfResults.filter(r => r.holeNumber <= upToHole);
          
          relevantResults.forEach(result => {
            const pointValue = game.stakes * (result.isBlindWolf ? (game.blindWolfMultiplier || 2) : 1);
            
            if (result.winningTeam === 'wolf') {
              // Wolf team wins
              const pbWolf = breakdown.get(result.wolfId);
              if (pbWolf) {
                if (result.partnerId) {
                  // Wolf + partner vs 2 hunters
                  pbWolf.wolf += pointValue;
                  pbWolf.total += pointValue;
                  
                  const pbPartner = breakdown.get(result.partnerId);
                  if (pbPartner) {
                    pbPartner.wolf += pointValue;
                    pbPartner.total += pointValue;
                  }
                  
                  // Hunters lose
                  players.forEach(p => {
                    if (p.id !== result.wolfId && p.id !== result.partnerId) {
                      const pb = breakdown.get(p.id);
                      if (pb) {
                        pb.wolf -= pointValue;
                        pb.total -= pointValue;
                      }
                    }
                  });
                } else {
                  // Lone Wolf wins - gets 4 points from each hunter (doubled stakes)
                  // Blind wolf: 4 × blindWolfMultiplier points per hunter
                  const basePointsPerHunter = result.isBlindWolf
                    ? 4 * (game.blindWolfMultiplier || 2)
                    : 4;
                  const wolfWinnings = game.stakes * basePointsPerHunter * 3; // 3 hunters
                  pbWolf.wolf += wolfWinnings;
                  pbWolf.total += wolfWinnings;

                  const hunterLoss = game.stakes * basePointsPerHunter;
                  players.forEach(p => {
                    if (p.id !== result.wolfId) {
                      const pb = breakdown.get(p.id);
                      if (pb) {
                        pb.wolf -= hunterLoss;
                        pb.total -= hunterLoss;
                      }
                    }
                  });
                }
              }
            } else if (result.winningTeam === 'hunters') {
              // Hunters win - reverse of above
              const pbWolf = breakdown.get(result.wolfId);
              if (pbWolf) {
                if (result.partnerId) {
                  pbWolf.wolf -= pointValue;
                  pbWolf.total -= pointValue;
                  
                  const pbPartner = breakdown.get(result.partnerId);
                  if (pbPartner) {
                    pbPartner.wolf -= pointValue;
                    pbPartner.total -= pointValue;
                  }
                  
                  players.forEach(p => {
                    if (p.id !== result.wolfId && p.id !== result.partnerId) {
                      const pb = breakdown.get(p.id);
                      if (pb) {
                        pb.wolf += pointValue;
                        pb.total += pointValue;
                      }
                    }
                  });
                } else {
                  // Hunters win - Lone Wolf loses to all hunters
                  const basePointsPerHunter = result.isBlindWolf
                    ? 4 * (game.blindWolfMultiplier || 2)
                    : 4;
                  const wolfLoss = game.stakes * basePointsPerHunter * 3; // 3 hunters
                  pbWolf.wolf -= wolfLoss;
                  pbWolf.total -= wolfLoss;

                  const hunterWinnings = game.stakes * basePointsPerHunter;
                  players.forEach(p => {
                    if (p.id !== result.wolfId) {
                      const pb = breakdown.get(p.id);
                      if (pb) {
                        pb.wolf += hunterWinnings;
                        pb.total += hunterWinnings;
                      }
                    }
                  });
                }
              }
            }
          });
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
    return `+$${absAmount.toFixed(0)}`;
  }
  return `-$${absAmount.toFixed(0)}`;
}

export function getMoneyColor(amount: number): string {
  if (amount > 0) return 'text-success';
  if (amount < 0) return 'text-danger';
  return 'text-muted-foreground';
}
