import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, MapPin } from 'lucide-react';
import type { FriendRequest } from '@/hooks/useFriends';

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: (friendshipId: string) => void;
  onDecline: (friendshipId: string) => void;
  isProcessing?: boolean;
}

export function FriendRequestCard({ request, onAccept, onDecline, isProcessing }: FriendRequestCardProps) {
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  const hcp = request.senderHandicap === null
    ? null
    : request.senderHandicap < 0 ? `+${Math.abs(request.senderHandicap)}` : `${request.senderHandicap}`;

  return (
    <div className="rounded-[20px] border border-primary/25 bg-card pl-3.5 pr-2 py-2.5 flex items-center gap-3">
      <Avatar className="h-11 w-11 rounded-[14px] border-0 overflow-hidden shrink-0">
        <AvatarImage src={request.senderAvatar || undefined} alt={request.senderName || 'User'} />
        <AvatarFallback className="bg-gold text-gold-foreground text-[14px] font-bold rounded-[14px]">
          {getInitials(request.senderName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold text-foreground truncate">{request.senderName || 'Unknown'}</p>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground min-w-0">
          {hcp !== null ? (
            <span className="rounded-full bg-muted px-2 py-[2px] font-semibold text-foreground/80 tabular-nums shrink-0">
              {hcp} hcp
            </span>
          ) : (
            <span>Wants to be friends</span>
          )}
          {request.senderHomeCourse && (
            <span className="flex items-center gap-1 truncate min-w-0">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{request.senderHomeCourse}</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => onDecline(request.id)}
          disabled={isProcessing}
          aria-label="Decline request"
          className="h-11 w-11 rounded-[14px] bg-muted flex items-center justify-center text-muted-foreground disabled:opacity-40"
        >
          <X className="h-[18px] w-[18px]" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => onAccept(request.id)}
          disabled={isProcessing}
          aria-label="Accept request"
          className="h-11 w-11 rounded-[14px] bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40"
        >
          <Check className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
}
