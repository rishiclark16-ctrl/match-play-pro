import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
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
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-primary/20">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={request.senderAvatar || undefined} alt={request.senderName || 'User'} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {getInitials(request.senderName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{request.senderName || 'Unknown'}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {request.senderHandicap !== null && (
              <span>HCP: {request.senderHandicap}</span>
            )}
            {request.senderHomeCourse && (
              <>
                <span>•</span>
                <span className="truncate max-w-[100px]">{request.senderHomeCourse}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onAccept(request.id)}
          disabled={isProcessing}
          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDecline(request.id)}
          disabled={isProcessing}
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
