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
import { motion } from 'framer-motion';

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

  const isDisabled = isSaving || !name.trim() || members.length < 2;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] bg-[#F8F8F6] rounded-t-3xl border-0 p-0 [&>button]:hidden">
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4 mt-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 mb-4">
          <h2 className="text-[20px] font-black tracking-[-0.04em] text-[#0A0A0A]">
            {editingGroup ? 'Edit Group' : 'Create Group'}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto pb-28" style={{ height: 'calc(100% - 80px)' }}>
          {/* Group Name */}
          <div className="mx-6 mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2">
              Group Name
            </p>
            <input
              id="groupName"
              placeholder="e.g. Saturday Foursome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-muted/50 rounded-xl border-0 py-3 px-4 w-full text-foreground placeholder:text-muted-foreground outline-none text-[15px]"
            />
          </div>

          {/* Description */}
          <div className="mx-6 mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2">
              Description (optional)
            </p>
            <input
              id="description"
              placeholder="e.g. Weekly game at Pine Valley"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-muted/50 rounded-xl border-0 py-3 px-4 w-full text-foreground placeholder:text-muted-foreground outline-none text-[15px]"
            />
          </div>

          {/* Current Members */}
          <div className="mx-6 mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2">
              Members ({members.length})
            </p>
            {members.length > 0 && (
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="px-4 py-3 flex items-center gap-3 border-b border-border/40 last:border-b-0"
                  >
                    <div className="w-9 h-9 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[12px] font-bold text-foreground">{getInitials(member.name)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-[14px] truncate">{member.name}</p>
                      {member.handicap !== null && (
                        <p className="text-[12px] text-muted-foreground">HCP: {member.handicap}</p>
                      )}
                    </div>
                    {member.id !== 'self' && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground ml-auto"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add from Friends */}
          {availableFriends.length > 0 && (
            <div className="mx-6 mb-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2">
                Add from Friends
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {availableFriends.slice(0, 8).map((friend) => (
                  <motion.button
                    key={friend.id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    onClick={() => handleAddFriend(friend)}
                    className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] min-w-[68px]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
                      {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} alt={friend.fullName || ''} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[12px] font-bold text-foreground">{getInitials(friend.fullName || '')}</span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-foreground truncate max-w-[60px]">
                      {friend.fullName?.split(' ')[0]}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Add Guest */}
          <div className="mx-6 mb-4">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Add Guest (non-app user)
              </p>
              {!showAddGuest && (
                <button
                  onClick={() => setShowAddGuest(true)}
                  className="text-[12px] font-bold text-foreground flex items-center gap-1"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add
                </button>
              )}
            </div>

            {showAddGuest && (
              <div className="flex gap-2">
                <input
                  placeholder="Name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="bg-muted/50 rounded-xl border-0 py-3 px-4 flex-1 text-foreground placeholder:text-muted-foreground outline-none text-[15px]"
                />
                <input
                  placeholder="HCP"
                  type="number"
                  value={guestHandicap}
                  onChange={(e) => setGuestHandicap(e.target.value)}
                  className="bg-muted/50 rounded-xl border-0 py-3 px-4 w-20 text-foreground placeholder:text-muted-foreground outline-none text-[15px]"
                />
                <button
                  onClick={handleAddGuest}
                  disabled={!guestName.trim()}
                  className="w-11 h-11 rounded-xl bg-foreground flex items-center justify-center text-background disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowAddGuest(false)}
                  className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* No friends? */}
          {friends.length === 0 && (
            <div className="text-center py-4 mx-6">
              <p className="text-[13px] text-muted-foreground mb-3">
                No friends yet? Add some to quickly build groups.
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                onClick={() => {
                  onOpenChange(false);
                  navigate('/friends');
                }}
                className="bg-foreground text-background rounded-2xl px-5 py-2.5 text-[13px] font-bold"
              >
                Add Friends
              </motion.button>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-3 bg-[#F8F8F6]">
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={handleSave}
            disabled={isDisabled}
            className={cn(
              'bg-foreground text-background rounded-2xl h-[52px] font-bold w-full flex items-center justify-center',
              isDisabled && 'opacity-40'
            )}
          >
            {isSaving ? 'Saving...' : editingGroup ? 'Save Changes' : 'Create Group'}
          </motion.button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
