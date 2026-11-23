import { motion } from 'framer-motion';
import { MessageCircle, Trophy, Swords } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WatchPartyFeedBadge } from '@/components/golf/WatchPartyFeedBadge';
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

  // Extract result headlines from games (e.g., match play results)
  const resultHeadlines = item.games
    .map((g: Record<string, unknown>) => g.resultHeadline as string | undefined)
    .filter((h): h is string => !!h);

  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onPress}
      className="w-full text-left rounded-[20px] border border-border bg-card p-4"
    >
      {/* Course + date */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[17px] font-bold leading-tight tracking-[-0.02em] text-foreground">
            {item.courseName}
          </h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{dateStr}</p>
        </div>
        {userPlayed && (
          <span className="flex-shrink-0 rounded-full bg-gold px-2.5 py-1 text-[12px] font-semibold text-gold-foreground">
            You played
          </span>
        )}
      </div>

      {/* Game type chips */}
      {gameTypes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {gameTypes.map(type => (
            <span key={type} className="rounded-full bg-muted px-2.5 py-[3px] text-[12px] font-medium text-foreground/80">
              {formatGameType(type)}
            </span>
          ))}
        </div>
      )}

      {/* Match result headlines */}
      {resultHeadlines.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {resultHeadlines.map((headline, i) => (
            <div key={i} className="flex items-center gap-2 rounded-[14px] bg-primary/[0.06] px-3 py-2.5">
              <Swords className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="text-[14px] font-semibold tracking-[-0.01em] text-primary">{headline}</span>
            </div>
          ))}
        </div>
      )}

      {/* Scores leaderboard */}
      {item.playerScores.length > 0 && (
        <div className="mt-3 rounded-[14px] bg-muted/60 px-3 py-1">
          {item.playerScores.slice(0, 4).map((ps, i) => {
            const isCurrentUser = currentUserId && ps.profileId === currentUserId;
            const isLeader = i === 0;
            const firstName = ps.name.split(' ')[0];
            const isClickable = !!ps.profileId && ps.profileId !== currentUserId;
            return (
              <div
                key={ps.playerId}
                className={cn(
                  'flex items-center justify-between py-2',
                  i < Math.min(item.playerScores.length, 4) - 1 && 'border-b border-border'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {isLeader ? (
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gold">
                      <Trophy className="h-3 w-3 text-gold-foreground" />
                    </span>
                  ) : (
                    <span className="w-5 text-center text-[12px] font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                  )}
                  {isClickable ? (
                    <span
                      role="link"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); navigate(`/profile/${ps.profileId}`); }}
                      className="text-[14px] font-semibold text-foreground truncate active:opacity-70"
                    >
                      {firstName}
                    </span>
                  ) : (
                    <span className="text-[14px] font-semibold text-foreground truncate">
                      {isCurrentUser ? 'You' : firstName}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  {ps.holesPlayed < item.holes && (
                    <span className="text-[11px] text-muted-foreground">thru {ps.holesPlayed}</span>
                  )}
                  <span className={cn('text-[17px] font-extrabold tabular-nums', isLeader ? 'text-foreground' : 'text-foreground/70')}>
                    {ps.totalStrokes}
                  </span>
                </div>
              </div>
            );
          })}
          {item.playerScores.length > 4 && (
            <p className="py-1.5 text-center text-[12px] text-muted-foreground">
              +{item.playerScores.length - 4} more
            </p>
          )}
        </div>
      )}

      {/* Player name chips (only shown when no scores available) */}
      {item.playerScores.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {shownNames.map((name, i) => {
            const pid = item.participantIds[i];
            const isClickable = !!pid && pid !== currentUserId;
            const chipClass = cn(
              'rounded-full px-2.5 py-1 text-[12px] font-semibold',
              currentUserId && pid === currentUserId
                ? 'bg-gold text-gold-foreground'
                : 'bg-muted text-foreground'
            );

            if (isClickable) {
              return (
                <span
                  key={pid}
                  role="link"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${pid}`); }}
                  className={cn(chipClass, 'active:opacity-70 transition-opacity')}
                >
                  {name}
                </span>
              );
            }

            return (
              <span key={pid ?? `name-${i}`} className={chipClass}>
                {name}
              </span>
            );
          })}
          {overflowCount > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[12px] font-semibold text-muted-foreground">
              +{overflowCount}
            </span>
          )}
        </div>
      )}

      {/* Watch Party badge */}
      {item.watchPartyMessageCount > 0 && (
        <div className="mt-3">
          <WatchPartyFeedBadge roundId={item.roundId} messageCount={item.watchPartyMessageCount} />
        </div>
      )}

      {/* Footer: creator + time, reactions + comments */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 rounded-full flex-shrink-0">
            <AvatarImage src={item.creatorAvatar ?? undefined} />
            <AvatarFallback className="rounded-full bg-muted text-[10px] font-bold text-primary">
              {item.creatorName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-[13px] text-muted-foreground truncate">
            <span className="font-semibold text-foreground">{item.creatorName.split(' ')[0]}</span>
            {' · '}{timeAgo(item.completedAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {item.reactions.length > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              <span className="text-[12px]">
                {item.reactions.slice(0, 3).map(r => REACTION_EMOJI[r.type] || '👍').join('')}
              </span>
              {item.totalReactions > 0 && (
                <span className="text-[12px] font-semibold text-muted-foreground">{item.totalReactions}</span>
              )}
            </div>
          )}
          <div className={cn(
            'flex items-center gap-1 rounded-full px-2.5 py-1',
            item.commentCount > 0 ? 'bg-muted text-muted-foreground' : 'text-muted-foreground/50'
          )}>
            <MessageCircle className="h-3.5 w-3.5" />
            {item.commentCount > 0 && <span className="text-[12px] font-semibold">{item.commentCount}</span>}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
