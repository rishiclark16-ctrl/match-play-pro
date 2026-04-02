import { useState } from 'react';
import { X, Calendar, MapPin, Users, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useFriends } from '@/hooks/useFriends';
import { hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreateUpcomingSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateUpcomingSheet({ open, onClose, onCreated }: CreateUpcomingSheetProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { friends } = useFriends();

  const [courseName, setCourseName] = useState('');
  const [teeTime, setTeeTime] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreate = async () => {
    if (!user || !courseName.trim() || !teeTime) return;
    setSubmitting(true);

    try {
      // Create the round
      const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .insert({
          course_name: courseName.trim(),
          tee_time: new Date(teeTime).toISOString(),
          created_by: user.id,
          status: 'pending',
          holes: 18,
          invited_player_ids: selectedFriends,
          games: [],
        })
        .select('id')
        .single();

      if (roundError) throw roundError;

      // Add creator as a player
      await supabase.from('players').insert({
        round_id: roundData.id,
        profile_id: user.id,
        name: profile?.full_name ?? 'You',
        handicap: profile?.handicap ?? null,
      });

      hapticSuccess();
      toast.success('Round scheduled!');

      // Reset form
      setCourseName('');
      setTeeTime('');
      setSelectedFriends([]);
      onCreated();
      onClose();
    } catch (err: any) {
      console.error('CreateUpcomingSheet error:', err);
      hapticError();
      toast.error(err.message ?? 'Failed to create round');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate min datetime (now) for the picker
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const minDateTime = now.toISOString().slice(0, 16);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        className="[&>button]:hidden rounded-t-3xl p-0 max-h-[92vh] overflow-y-auto bg-[#F8F8F6]"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="w-9 h-1 bg-foreground/15 rounded-full" />
        </div>

        {/* Dark hero header */}
        <div className="bg-[#0A0A0A] mx-4 mt-3 rounded-2xl p-5 relative overflow-hidden">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-white/70" />
          </motion.button>

          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40 mb-1">New</p>
          <h2 className="text-[20px] font-black tracking-[-0.03em] text-white leading-tight pr-10">
            Schedule a Round
          </h2>
          <p className="text-[11px] text-white/40 font-medium mt-1">
            Set up a round and invite friends
          </p>
        </div>

        {/* Form */}
        <div className="px-4 pt-5 pb-4 space-y-4">
          {/* Course name */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2 block">
              Course
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
                placeholder="Enter course name..."
                className="w-full bg-white rounded-xl px-4 pl-9 py-3 text-[14px] outline-none border border-border/40 placeholder:text-muted-foreground/50 font-medium"
              />
            </div>
          </div>

          {/* Tee time */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2 block">
              Tee Time
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="datetime-local"
                value={teeTime}
                onChange={e => setTeeTime(e.target.value)}
                min={minDateTime}
                className="w-full bg-white rounded-xl px-4 pl-9 py-3 text-[14px] outline-none border border-border/40 text-foreground font-medium"
              />
            </div>
          </div>

          {/* Invite friends */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Invite Friends
              </label>
              {selectedFriends.length > 0 && (
                <span className="text-[11px] font-bold text-emerald-600">
                  {selectedFriends.length} selected
                </span>
              )}
            </div>

            {friends.length === 0 ? (
              <div className="bg-white rounded-xl border border-border/40 p-4 text-center">
                <Users className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-[12px] text-muted-foreground">
                  Add friends first to invite them
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-border/40 divide-y divide-border/30 max-h-[200px] overflow-y-auto">
                {friends.map(friend => {
                  const selected = selectedFriends.includes(friend.id);
                  return (
                    <button
                      key={friend.id}
                      onClick={() => toggleFriend(friend.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 transition-colors',
                        selected ? 'bg-emerald-500/5' : 'hover:bg-muted/30'
                      )}
                    >
                      <Avatar className="w-8 h-8 rounded-lg flex-shrink-0">
                        <AvatarImage src={friend.avatarUrl || undefined} />
                        <AvatarFallback className="rounded-lg text-[10px] font-bold bg-muted">
                          {(friend.fullName ?? '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[13px] font-semibold text-foreground flex-1 text-left truncate">
                        {friend.fullName || 'Unknown'}
                      </span>
                      <div className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0',
                        selected
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-border/60'
                      )}>
                        {selected && <Plus className="w-3 h-3 text-white rotate-45" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleCreate}
            disabled={!courseName.trim() || !teeTime || submitting}
            className="w-full bg-emerald-600 text-white rounded-xl py-3.5 font-bold text-[14px] disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            {submitting ? 'Scheduling...' : 'Schedule Round'}
          </motion.button>
        </div>

        <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }} />
      </SheetContent>
    </Sheet>
  );
}
