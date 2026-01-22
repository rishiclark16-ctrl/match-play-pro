// Generate shareable round summary text
import { PlayerWithScores, Round, formatRelativeToPar } from '@/types/golf';
import { NetSettlement } from '@/lib/games/settlement';
import { SkinsResult } from '@/lib/games/skins';
import { NassauResult } from '@/lib/games/nassau';
import { MatchPlayResult } from '@/lib/games/matchPlay';
import { format } from 'date-fns';

interface RoundSummaryOptions {
  round: Round;
  players: PlayerWithScores[];
  settlements: NetSettlement[];
  winner: PlayerWithScores | null;
  hasTie: boolean;
  useNetScoring: boolean;
  matchPlayResult?: MatchPlayResult | null;
  skinsResult?: SkinsResult;
  nassauResult?: NassauResult;
}

/**
 * Generate a shareable text summary of the round results
 */
export function generateRoundSummary({
  round,
  players,
  settlements,
  winner,
  hasTie,
  useNetScoring,
  matchPlayResult,
  skinsResult,
  nassauResult,
}: RoundSummaryOptions): string {
  const lines: string[] = [];

  // Header
  lines.push('⛳ MATCH Golf Round Complete!');
  lines.push('');

  // Course and date
  lines.push(`📍 ${round.courseName}`);
  const dateStr = format(new Date(round.createdAt), 'MMM d, yyyy');
  lines.push(`📅 ${dateStr} • ${round.holes} holes`);
  lines.push('');

  // Winner
  if (winner) {
    if (hasTie) {
      lines.push('🤝 Result: Tied!');
    } else if (round.matchPlay && matchPlayResult) {
      lines.push(`🏆 Winner: ${winner.name}`);
      lines.push(`   ${matchPlayResult.statusText}`);
    } else {
      const score = useNetScoring
        ? (winner.totalNetStrokes ?? winner.totalStrokes)
        : winner.totalStrokes;
      const relPar = useNetScoring
        ? (winner.netRelativeToPar ?? winner.totalRelativeToPar)
        : winner.totalRelativeToPar;
      lines.push(`🏆 Winner: ${winner.name}`);
      lines.push(`   ${score} ${formatRelativeToPar(relPar)}${useNetScoring ? ' (net)' : ''}`);
    }
    lines.push('');
  }

  // Final standings
  lines.push('📊 Final Standings:');
  const sortedPlayers = [...players].sort((a, b) => {
    if (useNetScoring) {
      return (a.totalNetStrokes ?? a.totalStrokes) - (b.totalNetStrokes ?? b.totalStrokes);
    }
    return a.totalStrokes - b.totalStrokes;
  });

  sortedPlayers.forEach((player, index) => {
    const score = useNetScoring
      ? (player.totalNetStrokes ?? player.totalStrokes)
      : player.totalStrokes;
    const relPar = useNetScoring
      ? (player.netRelativeToPar ?? player.totalRelativeToPar)
      : player.totalRelativeToPar;
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    lines.push(`${medal} ${player.name}: ${score} ${formatRelativeToPar(relPar)}`);
  });
  lines.push('');

  // Game results
  const hasGames = skinsResult || nassauResult || (round.matchPlay && matchPlayResult);
  if (hasGames) {
    lines.push('🎯 Game Results:');

    if (round.matchPlay && matchPlayResult && matchPlayResult.winnerId) {
      const mpWinner = players.find(p => p.id === matchPlayResult.winnerId);
      lines.push(`• Match Play: ${mpWinner?.name || 'Unknown'} wins (${matchPlayResult.statusText})`);
    }

    if (skinsResult && skinsResult.standings.length > 0) {
      const topSkins = skinsResult.standings.filter(s => s.skins > 0);
      if (topSkins.length > 0) {
        const skinsText = topSkins
          .map(s => `${s.playerName.split(' ')[0]} ${s.skins}`)
          .join(', ');
        lines.push(`• Skins: ${skinsText}`);
      }
    }

    if (nassauResult) {
      const front9Winner = players.find(p => p.id === nassauResult.front9.winnerId);
      const back9Winner = players.find(p => p.id === nassauResult.back9.winnerId);
      const overallWinner = players.find(p => p.id === nassauResult.overall.winnerId);

      const nassauParts: string[] = [];
      if (front9Winner) nassauParts.push(`F9: ${front9Winner.name.split(' ')[0]}`);
      if (back9Winner) nassauParts.push(`B9: ${back9Winner.name.split(' ')[0]}`);
      if (overallWinner) nassauParts.push(`Overall: ${overallWinner.name.split(' ')[0]}`);

      if (nassauParts.length > 0) {
        lines.push(`• Nassau: ${nassauParts.join(', ')}`);
      }
    }
    lines.push('');
  }

  // Settlements (who owes who)
  if (settlements.length > 0) {
    lines.push('💰 Settlements:');
    settlements.forEach(s => {
      lines.push(`• ${s.fromPlayerName.split(' ')[0]} owes ${s.toPlayerName.split(' ')[0]} $${s.amount.toFixed(0)}`);
    });
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('Shared from MATCH Golf');

  return lines.join('\n');
}

/**
 * Generate a shorter SMS-friendly summary
 */
export function generateShortSummary({
  round,
  players,
  settlements,
  winner,
  hasTie,
  useNetScoring,
}: Omit<RoundSummaryOptions, 'matchPlayResult' | 'skinsResult' | 'nassauResult'>): string {
  const lines: string[] = [];

  lines.push(`⛳ ${round.courseName}`);

  if (winner && !hasTie) {
    const score = useNetScoring
      ? (winner.totalNetStrokes ?? winner.totalStrokes)
      : winner.totalStrokes;
    lines.push(`🏆 ${winner.name} wins with ${score}!`);
  } else if (hasTie) {
    lines.push('🤝 Tied round!');
  }

  // Add settlements if any
  if (settlements.length > 0) {
    lines.push('');
    lines.push('💰 Settle up:');
    settlements.slice(0, 5).forEach(s => {
      lines.push(`${s.fromPlayerName.split(' ')[0]} → ${s.toPlayerName.split(' ')[0]}: $${s.amount.toFixed(0)}`);
    });
    if (settlements.length > 5) {
      lines.push(`+ ${settlements.length - 5} more...`);
    }
  }

  return lines.join('\n');
}
