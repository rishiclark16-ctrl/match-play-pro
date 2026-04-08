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
    <div className="px-4 pt-safe-content pb-3 border-b-2 border-foreground">
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </motion.button>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">MATCH Golf</p>
          <h1 className="text-[22px] font-black tracking-[-0.04em] text-foreground leading-none">Profile</h1>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AppLayout header={headerContent}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout header={headerContent}>
        <div className="px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Flag className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-[15px] font-black mb-1">Profile Not Found</h2>
          <p className="text-[12px] text-muted-foreground">This player doesn't have a MATCH Golf account.</p>
        </div>
      </AppLayout>
    );
  }

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <AppLayout header={headerContent}>
      <div className="px-6 pt-6 pb-6 space-y-4">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 flex flex-col items-center"
        >
          <Avatar className="w-20 h-20 rounded-2xl mb-3">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="rounded-2xl text-2xl font-black bg-muted">
              {(profile.full_name ?? '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <h2 className="text-[20px] font-black tracking-[-0.03em] text-foreground mb-0.5">
            {profile.full_name ?? 'Unknown'}
          </h2>

          {memberSince && (
            <p className="text-[11px] text-muted-foreground mb-4">Member since {memberSince}</p>
          )}

          {/* Friend action button */}
          {friendStatus === 'none' && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAddFriend}
              disabled={sending}
              className="w-full bg-foreground text-background rounded-2xl h-[48px] font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add Friend
                </>
              )}
            </motion.button>
          )}

          {friendStatus === 'friends' && (
            <div className="w-full bg-emerald-50 text-emerald-700 rounded-2xl h-[48px] font-bold text-[14px] flex items-center justify-center gap-2">
              <UserCheck className="w-4 h-4" />
              Friends
            </div>
          )}

          {friendStatus === 'pending_sent' && (
            <div className="w-full bg-muted text-muted-foreground rounded-2xl h-[48px] font-bold text-[14px] flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              Request Sent
            </div>
          )}

          {friendStatus === 'pending_received' && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/social?tab=friends')}
              className="w-full bg-[#F0EE3A] text-foreground rounded-2xl h-[48px] font-bold text-[14px] flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Accept Request
            </motion.button>
          )}

          {friendStatus === 'self' && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/profile')}
              className="w-full bg-muted text-foreground rounded-2xl h-[48px] font-bold text-[14px] flex items-center justify-center gap-2"
            >
              Edit Profile
            </motion.button>
          )}
        </motion.div>

        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-border/30">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Golf Info</p>
          </div>

          {/* Handicap */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Flag className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-[14px] font-medium">Handicap</span>
            </div>
            <span className="text-[14px] font-bold">
              {profile.handicap != null ? profile.handicap : '—'}
            </span>
          </div>

          {/* Home Course */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Home className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-[14px] font-medium">Home Course</span>
            </div>
            <span className={cn('text-[13px] font-medium max-w-[160px] text-right truncate', profile.home_course_name ? '' : 'text-muted-foreground')}>
              {profile.home_course_name ?? '—'}
            </span>
          </div>

          {/* Tee Preference */}
          {profile.tee_preference && (
            <div className="px-5 py-4 flex items-center justify-between border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Flag className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-[14px] font-medium">Plays From</span>
              </div>
              <span className="text-[14px] font-bold">{TEE_LABELS[profile.tee_preference] ?? profile.tee_preference}</span>
            </div>
          )}

          {/* Rounds Played */}
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Flag className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-[14px] font-medium">Rounds Played</span>
            </div>
            <span className="text-[14px] font-bold">{roundCount}</span>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
