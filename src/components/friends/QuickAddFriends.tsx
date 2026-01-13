import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import type { Friend } from '@/hooks/useFriends';
import { cn } from '@/lib/utils';

interface QuickAddFriendsProps {
  friends: Friend[];
  addedFriendIds: string[];
  onAddFriend: (friend: Friend) => void;
  onOpenFriends: () => void;
  maxPlayers?: number;
  currentPlayerCount: number;
}

export function QuickAddFriends({ 
  friends, 
  addedFriendIds, 
  onAddFriend, 
  onOpenFriends,
  maxPlayers = 4,
  currentPlayerCount,
}: QuickAddFriendsProps) {
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const canAddMore = currentPlayerCount < maxPlayers;
  const availableFriends = friends.filter(f => !addedFriendIds.includes(f.id));

  if (friends.length === 0) {
    return (
      <div className="py-3">
        <p className="text-xs text-muted-foreground mb-2">QUICK ADD FROM FRIENDS</p>
        <button
          type="button"
          onClick={onOpenFriends}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add your first friend
        </button>
      </div>
    );
  }

  return (
    <div className="py-3">
      <p className="text-xs text-muted-foreground mb-2">QUICK ADD FROM FRIENDS</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {availableFriends.slice(0, 6).map((friend) => (
          <button
            key={friend.id}
            type="button"
            onClick={() => canAddMore && onAddFriend(friend)}
            disabled={!canAddMore}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg border border-border min-w-[70px] transition-colors",
              canAddMore 
                ? "hover:border-primary hover:bg-primary/5" 
                : "opacity-50 cursor-not-allowed"
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={friend.avatarUrl || undefined} alt={friend.fullName || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {getInitials(friend.fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-foreground truncate max-w-[60px]">
              {friend.fullName?.split(' ')[0] || 'Friend'}
            </span>
            {friend.handicap !== null && (
              <span className="text-[10px] text-muted-foreground">
                {friend.handicap}
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={onOpenFriends}
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-dashed border-border min-w-[70px] hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground">More</span>
        </button>
      </div>
    </div>
  );
}
