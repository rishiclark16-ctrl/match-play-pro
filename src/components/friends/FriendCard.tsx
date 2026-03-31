import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserMinus, MapPin, Swords } from 'lucide-react';
import type { Friend } from '@/hooks/useFriends';
import { useHeadToHead } from '@/hooks/useHeadToHead';

interface FriendCardProps {
  friend: Friend;
  onRemove: (friendshipId: string) => void;
  isRemoving?: boolean;
}

export function FriendCard({ friend, onRemove, isRemoving }: FriendCardProps) {
  const { record } = useHeadToHead(friend.id);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11 rounded-xl border-0 overflow-hidden">
          <AvatarImage src={friend.avatarUrl || undefined} alt={friend.fullName || 'Friend'} />
          <AvatarFallback className="bg-muted text-foreground text-sm font-bold rounded-xl">
            {getInitials(friend.fullName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-foreground">{friend.fullName || 'Unknown'}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {friend.handicap !== null && (
              <span className="font-mono font-bold bg-muted px-1.5 py-0.5 rounded-lg text-[11px]">
                {friend.handicap > 0 ? '+' : ''}{friend.handicap}
              </span>
            )}
            {friend.homeCourse && (
              <span className="flex items-center gap-1 truncate max-w-[140px]">
                <MapPin className="w-3 h-3 shrink-0" />
                {friend.homeCourse}
              </span>
            )}
          </div>
          {record && record.roundCount > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
              <Swords className="w-3 h-3 shrink-0" />
              <span>{record.wins}W · {record.losses}L</span>
              <span className="mx-0.5">·</span>
              <span className={record.netAmount >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                {record.netAmount >= 0 ? `+$${record.netAmount}` : `-$${Math.abs(record.netAmount)}`}
              </span>
            </div>
          )}
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => onRemove(friend.friendshipId)}
        disabled={isRemoving}
        className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground disabled:opacity-40"
      >
        <UserMinus className="h-4 w-4" />
      </motion.button>
    </div>
  );
}
