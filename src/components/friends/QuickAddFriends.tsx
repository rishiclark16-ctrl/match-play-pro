import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Users } from 'lucide-react';
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
      <div className="py-4">
        <p className="label-sm mb-3">Quick Add Friends</p>
        <button
          type="button"
          onClick={onOpenFriends}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary-light transition-all w-full"
        >
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Plus className="h-4 w-4" />
          </div>
          <span className="font-medium">Add your first friend</span>
        </button>
      </div>
    );
  }

  return (
    <div className="py-4">
      <p className="label-sm mb-3">Quick Add Friends</p>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {availableFriends.slice(0, 6).map((friend) => (
          <button
            key={friend.id}
            type="button"
            onClick={() => canAddMore && onAddFriend(friend)}
            disabled={!canAddMore}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card min-w-[80px] transition-all",
              canAddMore 
                ? "hover:border-primary hover:bg-primary-light active:scale-95" 
                : "opacity-50 cursor-not-allowed"
            )}
          >
            <Avatar className="h-10 w-10 border-2 border-background">
              <AvatarImage src={friend.avatarUrl || undefined} alt={friend.fullName || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {getInitials(friend.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <span className="text-xs font-semibold text-foreground truncate block max-w-[60px]">
                {friend.fullName?.split(' ')[0] || 'Friend'}
              </span>
              {friend.handicap !== null && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  HCP {friend.handicap}
                </span>
              )}
            </div>
          </button>
        ))}
        <button
          type="button"
          onClick={onOpenFriends}
          className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border min-w-[80px] hover:border-primary hover:bg-primary-light transition-all"
        >
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">More</span>
        </button>
      </div>
    </div>
  );
}
