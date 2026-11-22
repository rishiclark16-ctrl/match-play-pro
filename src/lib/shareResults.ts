import { Round, Player, Score, PlayerWithScores, formatRelativeToPar, HoleInfo } from '@/types/golf';

function getPlayerTotal(playerId: string, scores: Score[]): number {
  return scores
    .filter(s => s.playerId === playerId)
    .reduce((sum, s) => sum + s.strokes, 0);
}

function getRelativeToPar(playerId: string, scores: Score[], holeInfo: HoleInfo[]): number {
  return scores
    .filter(s => s.playerId === playerId)
    .reduce((sum, s) => {
      const hole = holeInfo.find(h => h.number === s.holeNumber);
      return sum + (s.strokes - (hole?.par || 4));
    }, 0);
}

function getWinner(players: Player[], scores: Score[], holeInfo: HoleInfo[]): { name: string; total: number; relativeToPar: string } | null {
  if (players.length === 0) return null;

  const playerScores = players.map(p => ({
    ...p,
    total: getPlayerTotal(p.id, scores),
    relToPar: getRelativeToPar(p.id, scores, holeInfo)
  }));

  const winner = playerScores.reduce((best, current) => 
    current.total < best.total ? current : best
  );

  return {
    name: winner.name,
    total: winner.total,
    relativeToPar: formatRelativeToPar(winner.relToPar)
  };
}

export async function generateShareImage(
  round: Round,
  players: Player[],
  scores: Score[]
): Promise<Blob> {
  // Create a canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350; // Instagram story size
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#14532D');
  gradient.addColorStop(0.15, '#FFFFFF');
  gradient.addColorStop(1, '#FAFAF7');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header background
  ctx.fillStyle = '#14532D';
  ctx.fillRect(0, 0, canvas.width, 200);

  // MATCH logo
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 64px Sora, Inter, system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MATCH', canvas.width / 2, 80);

  // Course name
  ctx.font = '32px Sora, Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText(round.courseName, canvas.width / 2, 140);

  // Date
  ctx.font = '24px Sora, Inter, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#CFE3D6';
  ctx.fillText(new Date(round.createdAt).toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  }), canvas.width / 2, 180);

  // Winner section
  const winner = getWinner(players, scores, round.holeInfo);
  if (winner) {
    ctx.fillStyle = '#0F1F17';
    ctx.font = '800 48px Sora, Inter, system-ui, -apple-system, sans-serif';
    ctx.fillText('🏆 ' + winner.name, canvas.width / 2, 300);

    ctx.font = '36px Sora, Inter, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#5A6B61';
    ctx.fillText(`${winner.total} (${winner.relativeToPar})`, canvas.width / 2, 360);
  }

  // Leaderboard
  let y = 450;
  const sortedPlayers = players
    .map(p => ({
      ...p,
      total: getPlayerTotal(p.id, scores),
      relativeToPar: getRelativeToPar(p.id, scores, round.holeInfo)
    }))
    .sort((a, b) => a.total - b.total);

  sortedPlayers.forEach((player, index) => {
    // Row background
    ctx.fillStyle = index === 0 ? '#ECFCCB' : '#FAFAF7';
    const rowHeight = 80;
    const rowMargin = 80;
    ctx.beginPath();
    ctx.roundRect(rowMargin, y - 40, canvas.width - (rowMargin * 2), rowHeight, 12);
    ctx.fill();
    
    // Rank
    ctx.fillStyle = index === 0 ? '#14532D' : '#5A6B61';
    ctx.font = '800 28px Sora, Inter, system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${index + 1}.`, rowMargin + 20, y + 10);
    
    // Name
    ctx.fillStyle = '#0F1F17';
    ctx.font = '28px Sora, Inter, system-ui, -apple-system, sans-serif';
    ctx.fillText(player.name, rowMargin + 60, y + 10);
    
    // Score
    ctx.textAlign = 'right';
    ctx.font = '800 28px Sora, Inter, system-ui, -apple-system, sans-serif';
    ctx.fillText(`${player.total}`, canvas.width - rowMargin - 100, y + 10);
    
    // Relative to par
    const relColor = player.relativeToPar > 0 ? '#B42318' : 
                     player.relativeToPar < 0 ? '#14532D' : '#5A6B61';
    ctx.fillStyle = relColor;
    ctx.fillText(formatRelativeToPar(player.relativeToPar), canvas.width - rowMargin - 20, y + 10);
    
    y += 100;
  });

  // Games results (if any)
  if (round.games && round.games.length > 0) {
    y += 30;
    ctx.fillStyle = '#0F1F17';
    ctx.font = '800 24px Sora, Inter, system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SIDE GAMES', canvas.width / 2, y);
    y += 40;
    
    round.games.forEach(game => {
      ctx.font = '20px Sora, Inter, system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#5A6B61';
      const gameLabel = game.type.charAt(0).toUpperCase() + game.type.slice(1);
      ctx.fillText(`${gameLabel}${game.stakes ? ` • $${game.stakes}` : ''}`, canvas.width / 2, y);
      y += 30;
    });
  }

  // Footer
  ctx.fillStyle = '#5A6B61';
  ctx.font = '20px Sora, Inter, system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Created with MATCH', canvas.width / 2, canvas.height - 50);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to generate image'));
      }
    }, 'image/png');
  });
}

export async function shareResults(
  round: Round,
  players: Player[],
  scores: Score[]
): Promise<void> {
  const imageBlob = await generateShareImage(round, players, scores);
  const file = new File([imageBlob], 'match-results.png', { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    // Native share (mobile)
    await navigator.share({
      title: `Golf Round at ${round.courseName}`,
      text: `Check out our round at ${round.courseName}!`,
      files: [file]
    });
  } else {
    // Fallback: download image
    const url = URL.createObjectURL(imageBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'match-results.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export async function shareText(
  round: Round,
  players: PlayerWithScores[]
): Promise<void> {
  const sortedPlayers = [...players].sort((a, b) => a.totalStrokes - b.totalStrokes);
  const winner = sortedPlayers[0];
  const hasTie = sortedPlayers.length > 1 && sortedPlayers[0]?.totalStrokes === sortedPlayers[1]?.totalStrokes;
  
  const dateStr = new Date(round.createdAt).toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  const winnerText = hasTie 
    ? `🤝 Tied: ${sortedPlayers.filter(p => p.totalStrokes === winner?.totalStrokes).map(p => p.name).join(' & ')}`
    : `🏆 Winner: ${winner?.name}`;
  
  const text = `⛳ MATCH Golf Round Complete!\n\n📍 ${round.courseName}\n📅 ${dateStr}\n${winnerText}\n\n${sortedPlayers.map((p, i) => `${i + 1}. ${p.name}: ${p.totalStrokes} (${formatRelativeToPar(p.totalRelativeToPar)})`).join('\n')}`;
  
  if (navigator.share) {
    await navigator.share({ text });
  } else {
    await navigator.clipboard.writeText(text);
  }
}
