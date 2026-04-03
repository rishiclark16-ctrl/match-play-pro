import { motion } from 'framer-motion';
import { MessageCircle, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatGameType } from '@/lib/formatGameType';
import { cn } from '@/lib/utils';
import type { FeedRoundItem } from '@/hooks/useSocialFeed';

const REACTION_EMOJI: Record<string, string> = {
  pay_up: '💰',
  cold_blooded: '🥶',
  robbery: '🦹',
  press_that: '📢',
  respect: '🫡',
  fraud: '🤡',
};

interface FeedItemProps {
  item: FeedRoundItem;
  onPress: () => void;
  currentUserId?: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function FeedItem({ item, onPress, currentUserId }: FeedItemProps) {
  const navigate = useNavigate();
  const playerCount = item.participantIds.filter(Boolean).length || 1;
  const firstNames = item.participantNames.map(n => n.split(' ')[0]);
  const shownNames = firstNames.slice(0, 5);
  const overflowCount = firstNames.length - shownNames.length;

  const userPlayed = currentUserId ? item.participantIds.includes(currentUserId) : false;

  const dateStr = new Date(item.completedAt).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  // Extract unique game types
  const gameTypes = item.games
    .map((g: Record<string, unknown>) => g.type as string)
    .filter((t, i, arr) => t && arr.indexOf(t) === i);

  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onPress}
      className={cn(
        'w-full text-left bg-white rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)]',
        userPlayed && 'border-l-[3px] border-l-[#F0EE3A]'
      )}
    >
      {/* Top accent line */}
      <div className={cn('h-[3px]', userPlayed ? 'bg-[#F0EE3A]' : 'bg-[#F0EE3A]/60')} />

      <div className="p-4">
        {/* Course name */}
        <div className="mb-1.5">
          <h3 className="text-[17px] font-black tracking-[-0.03em] text-foreground leading-tight">
            {item.courseName}
          </h3>
        </div>

        {/* Date */}
        <p className="text-[11px] text-muted-foreground/70 mb-2 font-medium">{dateStr}</p>

        {/* Game type badges */}
        {gameTypes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {gameTypes.map(type => (
              <span
                key={type}
                className="text-[10px] font-bold bg-foreground/[0.06] text-foreground/60 px-2 py-0.5 rounded-md"
              >
                {formatGameType(type)}
              </span>
            ))}
          </div>
        )}

        {/* Scores leaderboard */}
        {item.playerScores.length > 0 && (
          <div className="bg-[#F8F8F6] rounded-xl p-2.5 mb-3">
            {item.playerScores.slice(0, 4).map((ps, i) => {
              const isCurrentUser = currentUserId && ps.profileId === currentUserId;
              const isLeader = i === 0;
              const firstName = ps.name.split(' ')[0];
              const isClickable = !!ps.profileId && ps.profileId !== currentUserId;
              return (
                <div
                  key={ps.playerId}
                  className={cn(
                    'flex items-center justify-between py-1.5',
                    i < Math.min(item.playerScores.length, 4) - 1 && 'border-b border-border/20'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isLeader && <Trophy className="w-3 h-3 text-[#D4A900] flex-shrink-0" />}
                    {!isLeader && <span className="w-3 text-center text-[10px] font-bold text-muted-foreground/50">{i + 1}</span>}
                    {isClickable ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/profile/${ps.profileId}`); }}
                        className={cn(
                          'text-[12px] font-semibold truncate active:opacity-70',
                          isCurrentUser ? 'text-foreground font-bold' : 'text-foreground'
                        )}
                      >
                        {isCurrentUser ? 'You' : firstName}
                      </button>
                    ) : (
                      <span className={cn(
                        'text-[12px] font-semibold truncate',
                        isCurrentUser ? 'text-foreground font-bold' : 'text-foreground'
                      )}>
                        {isCurrentUser ? 'You' : firstName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      'text-[14px] font-black tabular-nums',
                      isLeader ? 'text-foreground' : 'text-foreground/70'
                    )}>
                      {ps.totalStrokes}
                    </span>
                    {ps.holesPlayed < item.holes && (
                      <span className="text-[9px] text-muted-foreground">({ps.holesPlayed}h)</span>
                    )}
                  </div>
                </div>
              );
            })}
            {item.playerScores.length > 4 && (
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                +{item.playerScores.length - 4} more
              </p>
            )}
          </div>
        )}

        {/* Player name chips (only shown when no scores available) */}
        {item.playerScores.length === 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {shownNames.map((name, i) => {
              const pid = item.participantIds[i];
              const isClickable = !!pid && pid !== currentUserId;
              const chipClass = cn(
                'text-[11px] font-bold border px-2.5 py-1 rounded-lg',
                currentUserId && pid === currentUserId
                  ? 'bg-[#F0EE3A]/10 border-[#F0EE3A]/40 text-foreground'
                  : 'bg-[#F8F8F6] border-border/60 text-foreground'
              );

              if (isClickable) {
                return (
                  <button
                    key={pid}
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${pid}`); }}
                    className={cn(chipClass, 'active:opacity-70 transition-opacity')}
                  >
                    {name}
                  </button>
                );
              }

              return (
                <span key={pid ?? `name-${i}`} className={chipClass}>
                  {name}
                </span>
              );
            })}
            {overflowCount > 0 && (
              <span className="text-[11px] font-bold bg-muted text-muted-foreground px-2.5 py-1 rounded-lg">
                +{overflowCount}
              </span>
            )}
          </div>
        )}

        {/* Footer: reactions + creator + time */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/40">
          <div className="flex items-center gap-2">
            <Avatar className="w-5 h-5 rounded-full flex-shrink-0">
              <AvatarImage src={item.creatorAvatar ?? undefined} />
              <AvatarFallback className="rounded-full text-[8px] font-black bg-muted">
                {item.creatorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground">{item.creatorName.split(' ')[0]}</span>
              {' · '}{timeAgo(item.completedAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Reactions */}
            {item.reactions.length > 0 && (
              <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg px-2 py-1">
                <span className="text-[11px]">
                  {item.reactions.slice(0, 3).map(r => REACTION_EMOJI[r.type] || '👍').join('')}
                </span>
                {item.totalReactions > 0 && (
                  <span className="text-[10px] font-bold text-muted-foreground ml-0.5">{item.totalReactions}</span>
                )}
              </div>
            )}
            {/* Comments */}
            {item.commentCount > 0 ? (
              <div className="flex items-center gap-1 bg-muted/60 rounded-lg px-2 py-1">
                <MessageCircle className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-black text-muted-foreground">{item.commentCount}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-muted-foreground/40">
                <MessageCircle className="w-3 h-3" />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
