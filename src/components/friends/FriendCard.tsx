import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserMinus, MapPin, Swords, ChevronRight } from 'lucide-react';
import type { Friend } from '@/hooks/useFriends';
import { useHeadToHead } from '@/hooks/useHeadToHead';
import { cn } from '@/lib/utils';

interface FriendCardProps {
  friend: Friend;
  onRemove: (friendshipId: string) => void;
  isRemoving?: boolean;
}

export function FriendCard({ friend, onRemove, isRemoving }: FriendCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const { record } = useHeadToHead(friend.id);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Plus handicaps are stored negative; golfers write them "+2.1".
  const hcp = friend.handicap === null ? null : friend.handicap < 0 ? `+${Math.abs(friend.handicap)}` : `${friend.handicap}`;
  const net = record?.netAmount ?? 0;

  return (
    <div className="rounded-[20px] border border-border bg-card pl-3.5 pr-1.5 py-2.5 flex items-center gap-1">
      <button
        onClick={() => navigate(`/profile/${friend.id}`)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left min-h-[48px]"
      >
        <Avatar className="h-11 w-11 rounded-[14px] border-0 overflow-hidden shrink-0">
          <AvatarImage src={friend.avatarUrl || undefined} alt={friend.fullName || 'Friend'} />
          <AvatarFallback className="bg-muted text-primary text-[14px] font-bold rounded-[14px]">
            {getInitials(friend.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-[16px] font-semibold text-foreground truncate">{friend.fullName || 'Unknown'}</p>
            <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground min-w-0">
            {hcp !== null && (
              <span className="rounded-full bg-muted px-2 py-[2px] font-semibold text-foreground/80 tabular-nums shrink-0">
                {hcp} hcp
              </span>
            )}
            {friend.homeCourse && (
              <span className="flex items-center gap-1 truncate min-w-0">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{friend.homeCourse}</span>
              </span>
            )}
          </div>
          {record && record.roundCount > 0 && (
            <div className="flex items-center gap-1 text-[12px] text-muted-foreground mt-1">
              <Swords className="w-3.5 h-3.5 shrink-0" />
              <span>{record.wins}W · {record.losses}L</span>
              <span className="mx-0.5">·</span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  net > 0 ? 'text-primary' : net < 0 ? 'text-[#B42318]' : 'text-foreground'
                )}
              >
                {net > 0 ? `+$${net}` : net < 0 ? `-$${Math.abs(net)}` : 'even'}
              </span>
            </div>
          )}
        </div>
      </button>
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => setShowConfirm(true)}
        disabled={isRemoving}
        aria-label={`Remove ${friend.fullName || 'friend'}`}
        className="h-11 w-11 rounded-[14px] flex items-center justify-center text-muted-foreground active:bg-muted active:text-[#B42318] disabled:opacity-40 shrink-0"
      >
        <UserMinus className="h-[18px] w-[18px]" />
      </motion.button>


      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove friend?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you'd like to remove {friend.fullName || 'this person'} as a friend?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onRemove(friend.friendshipId)}
              className="bg-[#B42318] text-white hover:bg-[#B42318]/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
