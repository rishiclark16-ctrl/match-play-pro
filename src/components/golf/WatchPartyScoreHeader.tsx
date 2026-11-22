import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RecencyBadge } from './RecencyBadge';
import { PlayerScoreInfo } from '@/hooks/useWatchPartyScores';
import { Round, GameConfig } from '@/types/golf';
import { cn } from '@/lib/utils';

interface WatchPartyScoreHeaderProps {
  round: Round | null;
  playerScores: PlayerScoreInfo[];
  currentHole: number;
  memberCount: number;
  isRoundComplete: boolean;
}

function formatScoreVsPar(score: number): string {
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}

function getGameTypeLabels(games: GameConfig[]): string[] {
  return games.map(g => {
    switch (g.type) {
      case 'nassau': return 'Nassau';
      case 'skins': return 'Skins';
      case 'match': return 'Match Play';
      case 'stableford': return 'Stableford';
      case 'bestball': return 'Best Ball';
      case 'wolf': return 'Wolf';
      case 'vegas': return 'Vegas';
      case 'nines': return 'Nines';
      case 'defender': return 'Defender';
      case 'sixes': return 'Sixes';
      case 'house': return 'House Game';
      default: return g.type;
    }
  });
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function WatchPartyScoreHeader({
  round,
  playerScores,
  currentHole,
  memberCount,
  isRoundComplete,
}: WatchPartyScoreHeaderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [pulsing, setPulsing] = useState<Set<string>>(new Set());
  const prevScoresRef = useRef<Map<string, number>>(new Map());
  const totalHoles = round?.holes ?? 18;
  const gameLabels = round ? getGameTypeLabels(round.games) : [];

  // Detect score changes and trigger pulse
  useEffect(() => {
    const newPulsing = new Set<string>();
    for (const ps of playerScores) {
      const prev = prevScoresRef.current.get(ps.playerId);
      if (prev !== undefined && prev !== ps.totalStrokes) {
        newPulsing.add(ps.playerId);
      }
      prevScoresRef.current.set(ps.playerId, ps.totalStrokes);
    }
    if (newPulsing.size > 0) {
      setPulsing(newPulsing);
      const timer = setTimeout(() => setPulsing(new Set()), 600);
      return () => clearTimeout(timer);
    }
  }, [playerScores]);

  return (
    <div className="bg-white border-b border-gray-100">
      {/* Top info bar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-4 py-3 flex items-center justify-between"
      >
        <div className="flex flex-col items-start">
          <span className="text-[15px] font-semibold text-gray-900 tracking-tight">
            {round?.courseName ?? 'Loading...'}
          </span>
          {gameLabels.length > 0 && (
            <div className="flex gap-1.5 mt-1">
              {gameLabels.map(label => (
                <span key={label} className="text-[10px] font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isRoundComplete ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ECFCCB]0 animate-pulse" />
              <span className="text-[12px] font-semibold text-[#14532D]">Live</span>
            </div>
          ) : (
            <span className="text-[12px] font-semibold text-[#5A6B61]">Final</span>
          )}
          {collapsed ? <ChevronDown className="w-4 h-4 text-[#5A6B61]" /> : <ChevronUp className="w-4 h-4 text-[#5A6B61]" />}
        </div>
      </button>

      {/* Expanded score zone */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Player score cards */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
              {playerScores.map(ps => (
                <motion.div
                  key={ps.playerId}
                  layout
                  animate={pulsing.has(ps.playerId) ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 0.4 }}
                  className={cn(
                    "bg-gray-50 rounded-xl px-3 py-2.5 min-w-[80px] flex flex-col items-center shrink-0 transition-shadow",
                    pulsing.has(ps.playerId) && "shadow-[0_0_0_2px_rgba(139,92,246,0.4)]"
                  )}
                >
                  <Avatar className="w-8 h-8 mb-1">
                    {ps.avatarUrl ? <AvatarImage src={ps.avatarUrl} /> : null}
                    <AvatarFallback className="text-[10px] bg-gray-200 text-gray-600">
                      {getInitials(ps.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] font-medium text-gray-700 truncate max-w-[70px]">
                    {ps.name.split(' ')[0]}
                  </span>
                  <span className={cn(
                    'text-[13px] font-bold mt-0.5',
                    ps.scoreVsPar < 0 ? 'text-[#B42318]' : ps.scoreVsPar > 0 ? 'text-gray-900' : 'text-[#14532D]'
                  )}>
                    {formatScoreVsPar(ps.scoreVsPar)} ({ps.totalStrokes})
                  </span>
                  <RecencyBadge lastUpdatedAt={ps.lastUpdatedAt} />
                </motion.div>
              ))}
            </div>

            {/* Bottom bar: hole progress + spectator count */}
            <div className="px-4 pb-3 flex items-center justify-between">
              <span className="text-[12px] text-[#5A6B61]">
                {isRoundComplete
                  ? `${totalHoles} holes complete`
                  : `Hole ${currentHole} of ${totalHoles}`
                }
              </span>
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-[#5A6B61]" />
                <span className="text-[12px] text-[#5A6B61]">{memberCount} watching</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
