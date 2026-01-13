import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserMinus, MapPin } from 'lucide-react';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
import type { Friend } from '@/hooks/useFriends';

interface FriendCardProps {
  friend: Friend;
  onRemove: (friendshipId: string) => void;
  isRemoving?: boolean;
}

export function FriendCard({ friend, onRemove, isRemoving }: FriendCardProps) {
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <TechCard hover className="group">
      <TechCardContent className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 border-2 border-border">
            <AvatarImage src={friend.avatarUrl || undefined} alt={friend.fullName || 'Friend'} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
              {getInitials(friend.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-foreground">{friend.fullName || 'Unknown'}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {friend.handicap !== null && (
                <span className="font-mono font-semibold bg-muted px-1.5 py-0.5 rounded">
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
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(friend.friendshipId)}
          disabled={isRemoving}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <UserMinus className="h-4 w-4" />
        </Button>
      </TechCardContent>
    </TechCard>
  );
}
