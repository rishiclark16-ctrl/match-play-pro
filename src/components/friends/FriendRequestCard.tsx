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

  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] px-4 py-3 flex items-center justify-between border-l-4 border-[#22C55E]">
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11 rounded-xl border-0 overflow-hidden">
          <AvatarImage src={request.senderAvatar || undefined} alt={request.senderName || 'User'} />
          <AvatarFallback className="bg-muted text-foreground text-sm font-bold rounded-xl">
            {getInitials(request.senderName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-foreground">{request.senderName || 'Unknown'}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {request.senderHandicap !== null && (
              <span className="font-mono font-bold bg-muted px-1.5 py-0.5 rounded-lg text-[11px]">
                {request.senderHandicap > 0 ? '+' : ''}{request.senderHandicap}
              </span>
            )}
            {request.senderHomeCourse && (
              <span className="flex items-center gap-1 truncate max-w-[100px]">
                <MapPin className="w-3 h-3 shrink-0" />
                {request.senderHomeCourse}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => onAccept(request.id)}
          disabled={isProcessing}
          className="w-9 h-9 rounded-xl bg-[#22C55E] flex items-center justify-center text-white disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => onDecline(request.id)}
          disabled={isProcessing}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
}
