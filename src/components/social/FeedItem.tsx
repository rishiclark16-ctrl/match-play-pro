import { motion } from 'framer-motion';
import { MessageCircle, MapPin, Clock } from 'lucide-react';
import { AvatarStack } from './AvatarStack';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { FeedRoundItem } from '@/hooks/useSocialFeed';

interface FeedItemProps {
  item: FeedRoundItem;
  onPress: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function FeedItem({ item, onPress }: FeedItemProps) {
  // Build participant list — deduplicate creator from participants
  const otherNames = item.participantNames.filter(
    (_, i) => item.participantIds[i] !== item.creatorId
  );
  const otherAvatars = item.participantIds
    .map((id, i) => (id !== item.creatorId ? (null as string | null) : undefined))
    .filter((v): v is string | null => v !== undefined);

  const playerCount = item.participantIds.filter(Boolean).length || 1;

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      className="w-full text-left bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:shadow-none transition-shadow"
    >
      {/* Header row: creator avatar + name + time */}
      <div className="flex items-start gap-3">
        <Avatar className="w-9 h-9 rounded-full flex-shrink-0">
          <AvatarImage src={item.creatorAvatar ?? undefined} />
          <AvatarFallback className="rounded-full text-[11px] font-bold bg-muted">
            {item.creatorName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-foreground leading-snug truncate">
            {item.creatorName}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">{timeAgo(item.completedAt)}</span>
          </div>
        </div>
        {item.commentCount > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">{item.commentCount}</span>
          </div>
        )}
      </div>

      {/* Course */}
      <div className="mt-3 flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <p className="text-[13px] font-semibold text-foreground truncate">{item.courseName}</p>
      </div>

      {/* Players row */}
      {playerCount > 1 && (
        <div className="mt-2.5 flex items-center gap-2">
          <AvatarStack
            names={item.participantNames}
            avatarUrls={item.participantIds.map(() => null)}
            max={4}
            size="sm"
          />
          <p className="text-[11px] text-muted-foreground">
            {playerCount} players
          </p>
        </div>
      )}

      {/* Footer divider */}
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#F0EE3A] bg-foreground px-2 py-0.5 rounded-md">
          View Round
        </span>
        {item.commentCount === 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="text-[11px]">Add comment</span>
          </div>
        )}
      </div>
    </motion.button>
  );
}
