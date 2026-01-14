import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, UserPlus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGroups, GolfGroup } from '@/hooks/useGroups';
import { useFriends, Friend } from '@/hooks/useFriends';
import { useProfile } from '@/hooks/useProfile';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MemberEntry {
  id: string;
  type: 'profile' | 'guest';
  profileId?: string;
  name: string;
  handicap: number | null;
  avatarUrl?: string | null;
}

interface CreateGroupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGroup?: GolfGroup | null;
}

export function CreateGroupSheet({ open, onOpenChange, editingGroup }: CreateGroupSheetProps) {
  const navigate = useNavigate();
  const { createGroup, updateGroup, updateMembers } = useGroups();
  const { friends } = useFriends();
  const { profile } = useProfile();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestHandicap, setGuestHandicap] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddGuest, setShowAddGuest] = useState(false);

  // Reset form when opening/closing or editing different group
  useEffect(() => {
    if (open) {
      if (editingGroup) {
        setName(editingGroup.name);
        setDescription(editingGroup.description || '');
        setMembers(editingGroup.members.map(m => ({
          id: m.id,
          type: m.profileId ? 'profile' : 'guest',
          profileId: m.profileId || undefined,
          name: m.name,
          handicap: m.handicap,
          avatarUrl: m.avatarUrl,
        })));
      } else {
        setName('');
        setDescription('');
        // Auto-add self as first member
        if (profile) {
          setMembers([{
            id: 'self',
            type: 'profile',
            profileId: profile.id,
            name: profile.full_name || 'You',
            handicap: profile.handicap,
            avatarUrl: profile.avatar_url,
          }]);
        } else {
          setMembers([]);
        }
      }
      setGuestName('');
      setGuestHandicap('');
      setShowAddGuest(false);
    }
  }, [open, editingGroup, profile]);

  const handleAddFriend = (friend: Friend) => {
    if (members.some(m => m.profileId === friend.id)) {
      toast.error('Already added');
      return;
    }
    
    hapticLight();
    setMembers(prev => [...prev, {
      id: `friend-${friend.id}`,
      type: 'profile',
      profileId: friend.id,
      name: friend.fullName || 'Friend',
      handicap: friend.handicap,
      avatarUrl: friend.avatarUrl,
    }]);
  };

  const handleAddGuest = () => {
    if (!guestName.trim()) return;
    
    hapticLight();
    setMembers(prev => [...prev, {
      id: `guest-${Date.now()}`,
      type: 'guest',
      name: guestName.trim(),
      handicap: guestHandicap ? parseFloat(guestHandicap) : null,
    }]);
    setGuestName('');
    setGuestHandicap('');
    setShowAddGuest(false);
  };

  const handleRemoveMember = (id: string) => {
    hapticLight();
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    
    if (members.length < 2) {
      toast.error('Add at least 2 members');
      return;
    }

    setIsSaving(true);
    hapticLight();

    const memberData = members.map(m => ({
      profileId: m.type === 'profile' ? m.profileId : undefined,
      guestName: m.type === 'guest' ? m.name : undefined,
      guestHandicap: m.type === 'guest' ? m.handicap ?? undefined : undefined,
    }));

    let success = false;

    if (editingGroup) {
      // Update existing group
      const nameUpdated = await updateGroup(editingGroup.id, {
        name: name.trim(),
        description: description.trim() || null,
      });
      const membersUpdated = await updateMembers(editingGroup.id, memberData);
      success = nameUpdated && membersUpdated;
    } else {
      // Create new group
      const group = await createGroup(name.trim(), description.trim() || null, memberData);
      success = !!group;
    }

    setIsSaving(false);

    if (success) {
      hapticSuccess();
      toast.success(editingGroup ? 'Group updated' : 'Group created');
      onOpenChange(false);
    } else {
      hapticError();
      toast.error('Failed to save group');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Friends not yet added
  const availableFriends = friends.filter(f => !members.some(m => m.profileId === f.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>{editingGroup ? 'Edit Group' : 'Create Group'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto pb-24">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              placeholder="e.g. Saturday Foursome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="py-6"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="e.g. Weekly game at Pine Valley"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Current Members */}
          <div className="space-y-3">
            <Label>Members ({members.length})</Label>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.name}</p>
                    {member.handicap !== null && (
                      <p className="text-xs text-muted-foreground">HCP: {member.handicap}</p>
                    )}
                  </div>
                  {member.id !== 'self' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add from Friends */}
          {availableFriends.length > 0 && (
            <div className="space-y-3">
              <Label>Add from Friends</Label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {availableFriends.slice(0, 8).map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => handleAddFriend(friend)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border min-w-[70px] hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={friend.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(friend.fullName || '')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate max-w-[60px]">
                      {friend.fullName?.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add Guest */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Add Guest (non-app user)</Label>
              {!showAddGuest && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddGuest(true)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
            
            {showAddGuest && (
              <div className="flex gap-2">
                <Input
                  placeholder="Name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="HCP"
                  type="number"
                  value={guestHandicap}
                  onChange={(e) => setGuestHandicap(e.target.value)}
                  className="w-20"
                />
                <Button onClick={handleAddGuest} disabled={!guestName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => setShowAddGuest(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* No friends? */}
          {friends.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">
                No friends yet? Add some to quickly build groups.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  navigate('/friends');
                }}
              >
                Add Friends
              </Button>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-4 bg-background border-t border-border">
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || members.length < 2}
            className="w-full py-6"
          >
            {isSaving ? 'Saving...' : editingGroup ? 'Save Changes' : 'Create Group'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
