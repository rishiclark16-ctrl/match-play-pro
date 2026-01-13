import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, X, MapPin } from 'lucide-react';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
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
    <TechCard variant="highlighted" accentBar="left">
      <TechCardContent className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 border-2 border-primary/30">
            <AvatarImage src={request.senderAvatar || undefined} alt={request.senderName || 'User'} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
              {getInitials(request.senderName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-foreground">{request.senderName || 'Unknown'}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {request.senderHandicap !== null && (
                <span className="font-mono font-semibold bg-muted px-1.5 py-0.5 rounded">
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
        <div className="flex items-center gap-1">
          <Button
            variant="default"
            size="icon"
            onClick={() => onAccept(request.id)}
            disabled={isProcessing}
            className="h-9 w-9"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDecline(request.id)}
            disabled={isProcessing}
            className="h-9 w-9 border-2 text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TechCardContent>
    </TechCard>
  );
}
