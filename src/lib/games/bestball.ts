import { Score, Player, HoleInfo, Team, BestBallHoleResult } from '@/types/golf';

export interface BestBallStanding {
  teamId: string;
  teamName: string;
  teamColor: string;
  totalScore: number;
  holesPlayed: number;
  relativeToPar: number;
  holeResults: {
    hole: number;
    bestScore: number;
    contributorId: string;
    contributorName: string;
  }[];
  playerContributions: {
    playerId: string;
    playerName: string;
    holesContributed: number;
  }[];
}

export interface BestBallResult {
  standings: BestBallStanding[];
  holeWinners: BestBallHoleResult[];
  holesPlayed: number;
}

export function calculateBestBall(
  scores: Score[],
  players: Player[],
  teams: Team[],
  holeInfo: HoleInfo[],
  holesPlayed: number
): BestBallResult {
  const standings: BestBallStanding[] = teams.map(team => {
    const teamPlayers = players.filter(p => team.playerIds.includes(p.id));
    return {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      totalScore: 0,
      holesPlayed: 0,
      relativeToPar: 0,
      holeResults: [],
      playerContributions: teamPlayers.map(p => ({
        playerId: p.id,
        playerName: p.name,
        holesContributed: 0
      }))
    };
  });
  
  const holeWinners: BestBallHoleResult[] = [];
  
  for (let hole = 1; hole <= holesPlayed; hole++) {
    const holeScores = scores.filter(s => s.holeNumber === hole);
    const holePar = holeInfo.find(h => h.number === hole)?.par || 4;
    
    const holeResult: BestBallHoleResult = {
      holeNumber: hole,
      teamScores: [],
      winningTeamId: null
    };
    
    teams.forEach(team => {
      const teamScores = holeScores.filter(s => 
        team.playerIds.includes(s.playerId)
      );
      
      if (teamScores.length === 0) return;
      
      // Find best (lowest) score on the team
      const bestScore = teamScores.reduce((best, current) => 
        current.strokes < best.strokes ? current : best
      );
      
      const contributor = players.find(p => p.id === bestScore.playerId);
      const standing = standings.find(s => s.teamId === team.id);
      
      if (standing && contributor) {
        standing.totalScore += bestScore.strokes;
        standing.holesPlayed += 1;
        standing.relativeToPar += (bestScore.strokes - holePar);
        standing.holeResults.push({
          hole,
          bestScore: bestScore.strokes,
          contributorId: contributor.id,
          contributorName: contributor.name
        });
        
        // Track contributions
        const contribution = standing.playerContributions.find(
          pc => pc.playerId === contributor.id
        );
        if (contribution) {
          contribution.holesContributed += 1;
        }
      }
      
      holeResult.teamScores.push({
        teamId: team.id,
        bestScore: bestScore.strokes,
        contributorId: bestScore.playerId
      });
    });
    
    // Determine hole winner
    if (holeResult.teamScores.length >= 2) {
      const sorted = [...holeResult.teamScores].sort((a, b) => a.bestScore - b.bestScore);
      if (sorted[0].bestScore < sorted[1].bestScore) {
        holeResult.winningTeamId = sorted[0].teamId;
      }
    }
    
    holeWinners.push(holeResult);
  }
  
  return {
    standings: standings.sort((a, b) => a.totalScore - b.totalScore),
    holeWinners,
    holesPlayed
  };
}

// For match play best ball (2v2)
export interface BestBallMatchResult {
  standings: BestBallStanding[];
  matchStatus: { 
    leadingTeamId: string | null; 
    leadingTeamName: string | null;
    margin: number; 
    thru: number;
    status: string; // "Team A 2 UP" or "All Square"
  };
  holeWinners: BestBallHoleResult[];
}

export function calculateBestBallMatch(
  scores: Score[],
  players: Player[],
  teams: Team[],
  holeInfo: HoleInfo[],
  holesPlayed: number
): BestBallMatchResult {
  const result = calculateBestBall(scores, players, teams, holeInfo, holesPlayed);
  
  let team1Wins = 0;
  let team2Wins = 0;
  
  result.holeWinners.forEach(hw => {
    if (hw.winningTeamId === teams[0]?.id) {
      team1Wins++;
    } else if (hw.winningTeamId === teams[1]?.id) {
      team2Wins++;
    }
  });
  
  const margin = Math.abs(team1Wins - team2Wins);
  const leadingTeamId = team1Wins > team2Wins ? teams[0]?.id : 
                        team2Wins > team1Wins ? teams[1]?.id : null;
  const leadingTeam = teams.find(t => t.id === leadingTeamId);
  
  let status = 'All Square';
  if (leadingTeam && margin > 0) {
    status = `${leadingTeam.name} ${margin} UP`;
  }
  
  return {
    standings: result.standings,
    matchStatus: { 
      leadingTeamId, 
      leadingTeamName: leadingTeam?.name || null,
      margin, 
      thru: holesPlayed,
      status
    },
    holeWinners: result.holeWinners
  };
}

// Generate default teams from players
export function createDefaultTeams(players: Player[]): Team[] {
  if (players.length < 2) return [];
  
  const colors = ['#22c55e', '#3b82f6', '#f97316', '#a855f7'];
  
  if (players.length === 2) {
    // Individual match - each player is their own team
    return players.map((p, i) => ({
      id: `team-${i + 1}`,
      name: p.name,
      playerIds: [p.id],
      color: colors[i]
    }));
  }
  
  if (players.length === 4) {
    // 2v2 - pair up players
    return [
      {
        id: 'team-1',
        name: `${players[0].name.split(' ')[0]} & ${players[1].name.split(' ')[0]}`,
        playerIds: [players[0].id, players[1].id],
        color: colors[0]
      },
      {
        id: 'team-2',
        name: `${players[2].name.split(' ')[0]} & ${players[3].name.split(' ')[0]}`,
        playerIds: [players[2].id, players[3].id],
        color: colors[1]
      }
    ];
  }
  
  // 3 players - less common, but support it
  if (players.length === 3) {
    return players.map((p, i) => ({
      id: `team-${i + 1}`,
      name: p.name,
      playerIds: [p.id],
      color: colors[i]
    }));
  }
  
  return [];
}

// Format best ball status
export function formatBestBallStatus(relativeToPar: number): string {
  if (relativeToPar === 0) return 'E';
  if (relativeToPar > 0) return `+${relativeToPar}`;
  return `${relativeToPar}`;
}
