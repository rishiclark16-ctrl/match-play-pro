import { useMemo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Crown, Swords } from 'lucide-react';
import { PlayerWithScores, HoleInfo, Score, Team } from '@/types/golf';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { calculateFourballMatchPlay, StrokesPerHoleMap, type FourballOptions } from '@/lib/games/matchPlay';

interface LiveLeaderboardProps {
  players: PlayerWithScores[];
  useNetScoring?: boolean;
  isMatchPlay?: boolean;
  holeInfo?: HoleInfo[];
  scores?: Score[];
  /** When set + matchPlayTeams has 2 entries, renders the team-vs-team match status. */
  matchPlayFormat?: 'singles' | 'fourball';
  matchPlayTeams?: Team[];
  /** Team match scoring and payout (best ball, combined total, or both). */
  matchOptions?: FourballOptions;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '??';
  return parts
    .map(n => n[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
}

function formatRelativeToPar(score: number): string {
  if (score === 0) return 'E';
  if (score > 0) return `+${score}`;
  return score.toString();
}

interface MatchPlayStatus {
  leaderId: string | null;
  holesUp: number;
  holesRemaining: number;
  isDormie: boolean;
  isAllSquare: boolean;
  matchOver: boolean;
  winnerId: string | null;
}

function calculateMatchPlayStatus(
  players: PlayerWithScores[],
  holeInfo: HoleInfo[],
  scores: Score[],
  useNet: boolean
): MatchPlayStatus | null {
  if (players.length !== 2) return null;

  const [player1, player2] = players;
  let player1HolesWon = 0;
  let player2HolesWon = 0;
  let holesPlayed = 0;
  const totalHoles = holeInfo.length;

  // Calculate holes won by each player
  for (const hole of holeInfo) {
    const p1Score = scores.find(s => s.playerId === player1.id && s.holeNumber === hole.number);
    const p2Score = scores.find(s => s.playerId === player2.id && s.holeNumber === hole.number);

    if (!p1Score || !p2Score) continue;

    holesPlayed++;

    let p1Strokes = p1Score.strokes;
    let p2Strokes = p2Score.strokes;

    // Apply handicap strokes if using net scoring
    if (useNet) {
      const p1StrokesOnHole = player1.strokesPerHole?.get(hole.number) || 0;
      const p2StrokesOnHole = player2.strokesPerHole?.get(hole.number) || 0;
      p1Strokes -= p1StrokesOnHole;
      p2Strokes -= p2StrokesOnHole;
    }

    if (p1Strokes < p2Strokes) {
      player1HolesWon++;
    } else if (p2Strokes < p1Strokes) {
      player2HolesWon++;
    }
  }

  const holesRemaining = totalHoles - holesPlayed;
  const holeDifference = player1HolesWon - player2HolesWon;
  const absHoleDiff = Math.abs(holeDifference);

  const isAllSquare = holeDifference === 0;
  const leaderId = holeDifference > 0 ? player1.id : holeDifference < 0 ? player2.id : null;
  const isDormie = absHoleDiff === holesRemaining && holesRemaining > 0;
  const matchOver = absHoleDiff > holesRemaining && holesRemaining >= 0;
  const winnerId = matchOver ? leaderId : null;

  return {
    leaderId,
    holesUp: absHoleDiff,
    holesRemaining,
    isDormie,
    isAllSquare,
    matchOver,
    winnerId,
  };
}

function formatMatchPlayScore(status: MatchPlayStatus, isLeader: boolean): string {
  if (status.isAllSquare) return 'AS';
  if (status.matchOver) {
    return `${status.holesUp}&${status.holesRemaining === 0 ? status.holesUp : status.holesRemaining}`;
  }
  if (isLeader) {
    return `${status.holesUp} UP`;
  }
  return `${status.holesUp} DN`;
}

const TEAM_MATCH_TITLE = {
  best: 'Best ball match',
  aggregate: 'Low total match',
  best_and_aggregate: 'Low ball, low total',
} as const;

export const LiveLeaderboard = forwardRef<HTMLDivElement, LiveLeaderboardProps>(function LiveLeaderboard({
  players,
  useNetScoring = false,
  isMatchPlay = false,
  holeInfo = [],
  scores = [],
  matchPlayFormat,
  matchPlayTeams,
  matchOptions,
}, ref) {

  // Calculate match play status for 2-player matches
  const matchPlayStatus = useMemo(() => {
    if (!isMatchPlay || players.length !== 2) return null;
    return calculateMatchPlayStatus(players, holeInfo, scores, useNetScoring);
  }, [isMatchPlay, players, holeInfo, scores, useNetScoring]);

  // Fourball team-vs-team match status — only when 4 players + 2 teams configured.
  const fourballResult = useMemo(() => {
    if (matchPlayFormat !== 'fourball') return null;
    if (!matchPlayTeams || matchPlayTeams.length !== 2) return null;
    if (players.length !== 4) return null;
    if (holeInfo.length === 0) return null;
    const strokesMap: StrokesPerHoleMap | undefined = useNetScoring
      ? new Map(players.filter(p => p.strokesPerHole).map(p => [p.id, p.strokesPerHole as Map<number, number>]))
      : undefined;
    const totalHoles = (holeInfo.length === 9 ? 9 : 18) as 9 | 18;
    return calculateFourballMatchPlay(scores, players, holeInfo, strokesMap, totalHoles, matchPlayTeams, matchOptions);
  }, [matchPlayFormat, matchPlayTeams, matchOptions, players, scores, holeInfo, useNetScoring]);

  // Sort players by score (relative to par) for stroke play
  const sortedPlayers = useMemo(() => {
    const playersWithHoles = players.filter(p => p.holesPlayed > 0);

    if (playersWithHoles.length === 0) return [];

    // For match play, sort by match status
    if (matchPlayStatus) {
      if (matchPlayStatus.isAllSquare) return playersWithHoles;
      const leader = playersWithHoles.find(p => p.id === matchPlayStatus.leaderId);
      const trailing = playersWithHoles.find(p => p.id !== matchPlayStatus.leaderId);
      if (leader && trailing) return [leader, trailing];
    }

    return [...playersWithHoles].sort((a, b) => {
      const aScore = useNetScoring && a.netRelativeToPar !== undefined
        ? a.netRelativeToPar
        : a.totalRelativeToPar;
      const bScore = useNetScoring && b.netRelativeToPar !== undefined
        ? b.netRelativeToPar
        : b.totalRelativeToPar;
      return aScore - bScore;
    });
  }, [players, useNetScoring, matchPlayStatus]);

  if (sortedPlayers.length === 0) {
    return null;
  }

  // Match Play fourball (2v2) display — team-vs-team status, not individual deltas.
  if (fourballResult && matchPlayTeams && matchPlayTeams.length === 2) {
    const [teamA, teamB] = matchPlayTeams;
    const leaderId = fourballResult.leaderId;
    const isAllSquare = leaderId === null && fourballResult.holesUp === 0;
    const isOver = fourballResult.matchStatus === 'won' || fourballResult.matchStatus === 'halved';
    const isDormie = fourballResult.matchStatus === 'dormie';

    const teamFirstNames = (team: Team) =>
      team.playerIds
        .map(pid => (players.find(p => p.id === pid)?.name || '').split(' ')[0])
        .filter(Boolean)
        .join(' & ');

    const renderTeamSide = (team: Team, align: 'left' | 'right') => {
      const isLeader = leaderId === team.id;
      const initials = teamFirstNames(team).split(' & ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'T';
      return (
        // min-w-0: without it the names can't truncate and the card overflows the screen.
        <div className={cn('flex-1 min-w-0 flex items-center gap-2.5', align === 'right' && 'justify-end')}>
          {align === 'right' && (
            <div className="min-w-0 text-right">
              {/* One player per line: "Sam & Jack" doesn't fit beside the score on a phone. */}
              {teamFirstNames(team).split(' & ').map(n => (
                <p key={n} className="font-semibold text-[15px] leading-tight text-[#0F1F17] truncate">{n}</p>
              ))}
            </div>
          )}
          <div className="relative flex-shrink-0">
            <Avatar className={cn('w-11 h-11 border-2', isLeader ? 'border-[#14532D]' : 'border-border')}>
              <AvatarFallback className={cn('font-bold text-lg', isLeader ? 'bg-[#14532D] text-white' : 'bg-[#F0F2EC] text-[#5A6B61]')}>
                {initials}
              </AvatarFallback>
            </Avatar>
            {isLeader && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#BEF264] border-2 border-white flex items-center justify-center">
                <Crown className="w-2.5 h-2.5 text-[#14532D]" />
              </div>
            )}
          </div>
          {align === 'left' && (
            <div className="min-w-0">
              {/* One player per line: "Sam & Jack" doesn't fit beside the score on a phone. */}
              {teamFirstNames(team).split(' & ').map(n => (
                <p key={n} className="font-semibold text-[15px] leading-tight text-[#0F1F17] truncate">{n}</p>
              ))}
            </div>
          )}
        </div>
      );
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className={CARD}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Swords className="w-4 h-4 text-[#5A6B61]" />
            <span className="text-[12px] font-semibold text-[#5A6B61]">
              {TEAM_MATCH_TITLE[fourballResult.scoring ?? 'best']}
            </span>
            {isDormie && (
              <span className="bg-[#0F1F17] text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">Dormie</span>
            )}
            {isAllSquare && !isOver && (
              <span className="bg-[#F0F2EC] text-[#0F1F17] text-[11px] font-semibold px-2 py-0.5 rounded-full">All square</span>
            )}
            {isOver && (
              <span className="bg-[#F0F2EC] text-[#5A6B61] text-[11px] font-semibold px-2 py-0.5 rounded-full">Match over</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {renderTeamSide(teamA, 'left')}
            <div className="flex flex-col items-center px-1 flex-shrink-0">
              <div className="font-extrabold text-[26px] leading-none tracking-[-0.02em] text-[#14532D]">
                {isAllSquare
                  ? 'AS'
                  : isOver && fourballResult.winMargin
                    ? fourballResult.winMargin
                    : fourballResult.scoring === 'best_and_aggregate'
                      ? `${fourballResult.holesUp} ${fourballResult.holesUp === 1 ? 'pt' : 'pts'}`
                      : `${fourballResult.holesUp} up`}
              </div>
              <p className="text-[12px] text-[#5A6B61] font-medium mt-1 whitespace-nowrap">
                Thru {fourballResult.holesPlayed} · {fourballResult.holesRemaining} to play
              </p>
            </div>
            {renderTeamSide(teamB, 'right')}
          </div>
        </div>
      </motion.div>
    );
  }

  // Match Play 2-player display
  if (isMatchPlay && matchPlayStatus && sortedPlayers.length === 2) {
    const [player1, player2] = sortedPlayers;

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className={CARD}
      >
        <div className="px-4 py-3">
          {/* Match Play Header */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <Swords className="w-4 h-4 text-[#5A6B61]" />
            <span className="text-[12px] font-semibold text-[#5A6B61]">
              Match play
            </span>
            {matchPlayStatus.isDormie && (
              <span className="bg-[#0F1F17] text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                Dormie
              </span>
            )}
            {matchPlayStatus.isAllSquare && !matchPlayStatus.matchOver && (
              <span className="bg-[#F0F2EC] text-[#0F1F17] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                All square
              </span>
            )}
            {matchPlayStatus.matchOver && (
              <span className="bg-[#F0F2EC] text-[#5A6B61] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                Match over
              </span>
            )}
          </div>

          {/* Head to Head Display */}
          <div className="flex items-center justify-between gap-4">
            {/* Player 1 */}
            <div className="flex-1 flex items-center gap-3">
              <div className="relative">
                <Avatar className={cn(
                  "w-12 h-12 border-2",
                  matchPlayStatus.leaderId === player1.id
                    ? "border-[#14532D]"
                    : "border-border"
                )}>
                  <AvatarImage src={player1.avatarUrl} />
                  <AvatarFallback className={cn(
                    "font-bold text-lg",
                    matchPlayStatus.leaderId === player1.id
                      ? "bg-[#14532D] text-white"
                      : "bg-[#F0F2EC] text-[#5A6B61]"
                  )}>
                    {getInitials(player1.name)}
                  </AvatarFallback>
                </Avatar>
                {matchPlayStatus.leaderId === player1.id && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#BEF264] border-2 border-white flex items-center justify-center">
                    <Crown className="w-2.5 h-2.5 text-[#14532D]" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[15px] text-[#0F1F17] truncate">{(player1.name || 'Player').split(' ')[0]}</p>
                <p className={cn(
                  "text-[13px] font-bold tabular-nums",
                  (() => {
                    const s = useNetScoring && player1.netRelativeToPar !== undefined ? player1.netRelativeToPar : player1.totalRelativeToPar;
                    return toParColor(s);
                  })()
                )}>
                  {formatRelativeToPar(useNetScoring && player1.netRelativeToPar !== undefined
                    ? player1.netRelativeToPar
                    : player1.totalRelativeToPar)}
                </p>
              </div>
            </div>

            {/* Match Status */}
            <div className="flex flex-col items-center px-4">
              <div className="font-extrabold text-[26px] leading-none tracking-[-0.02em] text-[#14532D]">
                {matchPlayStatus.isAllSquare
                  ? 'AS'
                  : matchPlayStatus.matchOver
                    ? formatMatchPlayScore(matchPlayStatus, true)
                    : `${matchPlayStatus.holesUp} up`
                }
              </div>
              <p className="text-[12px] text-[#5A6B61] font-medium mt-1 whitespace-nowrap">
                Thru {player1.holesPlayed} · {matchPlayStatus.holesRemaining} to play
              </p>
            </div>

            {/* Player 2 */}
            <div className="flex-1 flex items-center justify-end gap-3">
              <div className="min-w-0 text-right">
                <p className="font-semibold text-[15px] text-[#0F1F17] truncate">{(player2.name || 'Player').split(' ')[0]}</p>
                <p className={cn(
                  "text-[13px] font-bold tabular-nums",
                  (() => {
                    const s = useNetScoring && player2.netRelativeToPar !== undefined ? player2.netRelativeToPar : player2.totalRelativeToPar;
                    return toParColor(s);
                  })()
                )}>
                  {formatRelativeToPar(useNetScoring && player2.netRelativeToPar !== undefined
                    ? player2.netRelativeToPar
                    : player2.totalRelativeToPar)}
                </p>
              </div>
              <div className="relative">
                <Avatar className={cn(
                  "w-12 h-12 border-2",
                  matchPlayStatus.leaderId === player2.id
                    ? "border-[#14532D]"
                    : "border-border"
                )}>
                  <AvatarImage src={player2.avatarUrl} />
                  <AvatarFallback className={cn(
                    "font-bold text-lg",
                    matchPlayStatus.leaderId === player2.id
                      ? "bg-[#14532D] text-white"
                      : "bg-[#F0F2EC] text-[#5A6B61]"
                  )}>
                    {getInitials(player2.name)}
                  </AvatarFallback>
                </Avatar>
                {matchPlayStatus.leaderId === player2.id && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#BEF264] border-2 border-white flex items-center justify-center">
                    <Crown className="w-2.5 h-2.5 text-[#14532D]" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Standard stroke play standings
  const scoreOf = (p: PlayerWithScores) =>
    useNetScoring && p.netRelativeToPar !== undefined ? p.netRelativeToPar : p.totalRelativeToPar;
  const leaderScore = scoreOf(sortedPlayers[0]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={CARD}
    >
      <div className="px-4 pt-3.5 pb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[#5A6B61]">Standings</span>
        {useNetScoring && (
          <span className="rounded-full bg-[#F0F2EC] px-2 py-0.5 text-[11px] font-semibold text-[#5A6B61]">Net</span>
        )}
      </div>
      <ol className="pb-1.5">
        {sortedPlayers.map((player, index) => {
          const score = scoreOf(player);
          const back = score - leaderScore;
          // Tie-aware position: share the position of the first player on the same score
          const firstIdx = sortedPlayers.findIndex(p => scoreOf(p) === score);
          const tied = sortedPlayers.filter(p => scoreOf(p) === score).length > 1;
          const isLeader = back === 0;
          return (
            <li key={player.id} className={cn('px-4 py-2 flex items-center gap-3', index > 0 && 'border-t border-[#E7E9E3]')}>
              <span className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold tabular-nums shrink-0',
                isLeader ? 'bg-[#14532D] text-white' : 'bg-[#F0F2EC] text-[#5A6B61]'
              )}>
                {tied ? `T${firstIdx + 1}` : firstIdx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-[#0F1F17] truncate leading-tight">
                  {(player.name || 'Player').split(' ')[0]}
                </p>
                <p className="text-[12px] font-medium text-[#5A6B61] tabular-nums leading-tight mt-0.5">
                  Thru {player.holesPlayed}{back > 0 ? ` · ${back} back` : ''}
                </p>
              </div>
              <span className={cn('text-[20px] font-extrabold tabular-nums', toParColor(score))}>
                {formatRelativeToPar(score)}
              </span>
            </li>
          );
        })}
      </ol>
    </motion.div>
  );
});

const CARD = 'bg-white rounded-[20px] border border-[#E7E9E3]';

/** Under par reads Forest; even and over stay Ink (red is reserved for money owed). */
function toParColor(score: number): string {
  return score < 0 ? 'text-[#14532D]' : 'text-[#0F1F17]';
}
