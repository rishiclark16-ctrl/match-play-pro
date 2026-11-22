import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserCheck, Clock, Flag, Home, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/integrations/supabase/client';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PublicProfileData {
  id: string;
  full_name: string | null;
  handicap: number | null;
  home_course_name: string | null;
  avatar_url: string | null;
  tee_preference: string | null;
  created_at: string | null;
}

type FriendStatus = 'none' | 'friends' | 'pending_sent' | 'pending_received' | 'self';

const TEE_LABELS: Record<string, string> = {
  back: 'Black', blue: 'Blue', white: 'White', gold: 'Gold', red: 'Red',
};

export default function PublicProfile() {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { friends, pendingRequests, sentRequests, sendFriendRequestByProfileId } = useFriends();

  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [roundCount, setRoundCount] = useState(0);

  // Determine friendship status
  const friendStatus: FriendStatus = (() => {
    if (!profileId || !user) return 'none';
    if (profileId === user.id) return 'self';
    if (friends.some(f => f.id === profileId)) return 'friends';
    if (sentRequests.includes(profileId)) return 'pending_sent';
    if (pendingRequests.some(r => r.senderId === profileId)) return 'pending_received';
    return 'none';
  })();

  useEffect(() => {
    if (!profileId) return;

    async function fetchProfile() {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, handicap, home_course_name, avatar_url, tee_preference, created_at')
        .eq('id', profileId)
        .single();

      if (error || !data) {
        setProfile(null);
      } else {
        setProfile(data);
      }

      // Get round count for this player
      const { count } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId);

      setRoundCount(count ?? 0);
      setLoading(false);
    }

    fetchProfile();
  }, [profileId]);

  const handleAddFriend = async () => {
    if (!profileId || sending) return;
    setSending(true);
    hapticLight();

    const result = await sendFriendRequestByProfileId(profileId);

    if (result.success) {
      hapticSuccess();
      toast.success('Friend request sent');
    } else {
      hapticError();
      toast.error(result.error ?? 'Failed to send request');
    }
    setSending(false);
  };

  const headerContent = (
    <div className="px-5 pt-safe-content pb-3">
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="h-11 w-11 rounded-[14px] bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </motion.button>
        <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-foreground leading-none">Golfer</h1>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AppLayout header={headerContent}>
        <div className="px-5 pt-1">
          <div className="h-[260px] rounded-[28px] bg-primary/90 animate-pulse" aria-hidden="true" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout header={headerContent}>
        <div className="px-5 pt-1">
          <div className="rounded-[20px] border border-dashed border-border-strong px-6 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[16px] bg-muted text-primary">
              <Flag className="h-6 w-6" />
            </div>
            <h2 className="text-[16px] font-semibold text-foreground">Profile not found</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">This player doesn't have a MATCH account.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;
  // Plus handicaps are stored negative; golfers write them "+2.1".
  const hcp = profile.handicap == null ? '–' : profile.handicap < 0 ? `+${Math.abs(profile.handicap)}` : `${profile.handicap}`;
  const actionBase = 'w-full h-[56px] rounded-[18px] font-bold text-[16px] flex items-center justify-center gap-2';

  return (
    <AppLayout header={headerContent}>
      <div className="px-5 pt-1 pb-6 space-y-[14px]">
        {/* Forest hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] bg-primary p-5 text-primary-foreground"
        >
          <div className="flex items-center gap-4">
            <Avatar className="h-[72px] w-[72px] rounded-[22px] ring-2 ring-white/15">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="rounded-[22px] bg-white/15 text-[26px] font-extrabold text-white">
                {(profile.full_name ?? '?').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-white truncate">
                {profile.full_name ?? 'Unknown'}
              </h2>
              {memberSince && <p className="mt-0.5 text-[13px] text-[#CFE3D6]">On MATCH since {memberSince}</p>}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-[18px] bg-gold px-4 py-3 text-gold-foreground">
              <p className="text-[12px] font-semibold leading-none text-gold-foreground/80">Handicap</p>
              <p className="mt-2 text-[32px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{hcp}</p>
            </div>
            <div className="rounded-[18px] bg-white/10 px-4 py-3">
              <p className="text-[12px] font-semibold leading-none text-[#CFE3D6]">Rounds played</p>
              <p className="mt-2 text-[32px] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-white">{roundCount}</p>
            </div>
          </div>

          <div className="mt-4">
            {friendStatus === 'none' && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAddFriend}
                disabled={sending}
                className={cn(actionBase, 'bg-white text-primary disabled:opacity-50')}
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><UserPlus className="h-5 w-5" />Add friend</>}
              </motion.button>
            )}
            {friendStatus === 'friends' && (
              <div className={cn(actionBase, 'bg-white/10 text-white')}>
                <UserCheck className="h-5 w-5 text-gold" />
                Friends
              </div>
            )}
            {friendStatus === 'pending_sent' && (
              <div className={cn(actionBase, 'bg-white/10 text-[#CFE3D6]')}>
                <Clock className="h-5 w-5" />
                Request sent
              </div>
            )}
            {friendStatus === 'pending_received' && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/social?tab=friends')}
                className={cn(actionBase, 'bg-gold text-gold-foreground')}
              >
                <UserPlus className="h-5 w-5" />
                Accept request
              </motion.button>
            )}
            {friendStatus === 'self' && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/profile')}
                className={cn(actionBase, 'bg-white text-primary')}
              >
                Edit profile
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Golf info */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="mb-2 px-1 text-[13px] font-semibold text-muted-foreground">Golf info</p>
          <div className="overflow-hidden rounded-[20px] border border-border bg-card">
            <div className="flex min-h-[60px] items-center justify-between gap-3 border-b border-border px-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-muted text-primary"><Home className="h-4 w-4" /></span>
                <span className="text-[15px] font-medium text-foreground">Home course</span>
              </div>
              <span className={cn('max-w-[170px] truncate text-right text-[15px] font-semibold', profile.home_course_name ? 'text-foreground' : 'text-muted-foreground')}>
                {profile.home_course_name ?? '–'}
              </span>
            </div>
            <div className="flex min-h-[60px] items-center justify-between gap-3 px-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-muted text-primary"><Flag className="h-4 w-4" /></span>
                <span className="text-[15px] font-medium text-foreground">Plays from</span>
              </div>
              <span className={cn('text-[15px] font-semibold', profile.tee_preference ? 'text-foreground' : 'text-muted-foreground')}>
                {profile.tee_preference ? (TEE_LABELS[profile.tee_preference] ?? profile.tee_preference) : '–'}
              </span>
            </div>
          </div>
        </motion.section>
      </div>
    </AppLayout>
  );
}
