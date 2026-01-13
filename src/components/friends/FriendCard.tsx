import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserMinus } from 'lucide-react';
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
    <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={friend.avatarUrl || undefined} alt={friend.fullName || 'Friend'} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {getInitials(friend.fullName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{friend.fullName || 'Unknown'}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {friend.handicap !== null && (
              <span>HCP: {friend.handicap}</span>
            )}
            {friend.homeCourse && (
              <>
                <span>•</span>
                <span className="truncate max-w-[120px]">{friend.homeCourse}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(friend.friendshipId)}
        disabled={isRemoving}
        className="text-muted-foreground hover:text-destructive"
      >
        <UserMinus className="h-4 w-4" />
      </Button>
    </div>
  );
}
