import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, LogOut, Users, Copy, Check, User, Flag, Home, AtSign, Phone, Mic, Crown, ExternalLink, Trash2, AlertTriangle, Bell, ChevronRight, Settings, Sparkles, Globe, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { HomeCourseSelector } from '@/components/profile/HomeCourseSelector';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, ProfileUpdate, NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '@/hooks/useProfile';
import { shouldPromptForPush, requestPushPermission, checkPushPermission } from '@/lib/pushUtils';
import { useFriends } from '@/hooks/useFriends';
import { useSettings } from '@/hooks/useSettings';
import { useSubscription } from '@/hooks/useSubscription';
import { usePersonalGameFormats } from '@/hooks/usePersonalGameFormats';
import { PaywallModal } from '@/components/subscription/PaywallModal';
import { PromoCodeSheet } from '@/components/subscription/PromoCodeSheet';
import { restorePurchases, openManagementUrl } from '@/services/purchases';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { validatePlayerName, validateHandicap, sanitizeString } from '@/lib/validation';

const TEE_OPTIONS = [
  { value: 'back',  label: 'Black', color: 'bg-gray-900 text-white' },
  { value: 'blue',  label: 'Blue',  color: 'bg-blue-600 text-white' },
  { value: 'white', label: 'White', color: 'bg-white text-foreground border border-gray-200' },
  { value: 'gold',  label: 'Gold',  color: 'bg-yellow-500 text-foreground' },
  { value: 'red',   label: 'Red',   color: 'bg-red-600 text-white' },
];

// ─── Row primitives ───────────────────────────────────────────────────────────

function RowLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('text-[14px] font-medium text-foreground', className)}>{children}</span>;
}

function Row({ children, last, onClick }: { children: React.ReactNode; last?: boolean; onClick?: () => void }) {
  if (onClick) {
    return (
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={cn('w-full px-5 py-4 flex items-center justify-between gap-4 text-left', !last && 'border-b border-border/30')}
      >
        {children}
      </motion.button>
    );
  }
  return (
    <div className={cn('px-5 py-4 flex items-center justify-between gap-4', !last && 'border-b border-border/30')}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground px-1 mb-2 mt-5 first:mt-0">
      {children}
    </p>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]', className)}>
      {children}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut, deleteAccount } = useAuth();
  const { profile, loading, updateProfile, uploadAvatar } = useProfile();
  const { friends } = useFriends();
  const { settings, updateSettings } = useSettings();
  const { isPro, subscription, refreshSubscription } = useSubscription();
  const { formats: myFormats } = usePersonalGameFormats();
  const publicFormats = myFormats.filter(f => f.isPublic);
  const [copied, setCopied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPromoSheet, setShowPromoSheet] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const [fullName, setFullName] = useState('');
  const [handicap, setHandicap] = useState('');
  const [teePreference, setTeePreference] = useState<string | null>(null);
  const [homeCourseId, setHomeCourseId] = useState<string | null>(null);
  const [homeCourseName, setHomeCourseName] = useState<string | null>(null);
  const [discoveryEmail, setDiscoveryEmail] = useState('');
  const [discoveryPhone, setDiscoveryPhone] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [pushPermission, setPushPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

  const isInitialized = useRef(false);
  const hasLoadedOnce = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (profile && !hasLoadedOnce.current) {
      hasLoadedOnce.current = true;
      setFullName(profile.full_name || '');
      setHandicap(profile.handicap?.toString() || '');
      setTeePreference(profile.tee_preference);
      setHomeCourseId(profile.home_course_id);
      setHomeCourseName(profile.home_course_name);
      setDiscoveryEmail(profile.email || '');
      setDiscoveryPhone(profile.phone || '');
      if (profile.notification_preferences) {
        setNotifPrefs({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...profile.notification_preferences });
      }
      setTimeout(() => { isInitialized.current = true; }, 100);
    }
  }, [profile]);

  useEffect(() => { checkPushPermission().then(setPushPermission); }, []);

  const autoSave = useCallback(async (updates: ProfileUpdate) => {
    const success = await updateProfile(updates);
    if (success) {
      hapticSuccess();
      toast.success('Saved', { duration: 1000 });
    } else {
      hapticError();
      toast.error('Failed to save');
    }
  }, [updateProfile]);

  useEffect(() => {
    if (!isInitialized.current || !profile) return;
    const hasChanges =
      fullName !== (profile.full_name || '') ||
      handicap !== (profile.handicap?.toString() || '') ||
      teePreference !== profile.tee_preference ||
      homeCourseId !== profile.home_course_id ||
      discoveryEmail !== (profile.email || '') ||
      discoveryPhone !== (profile.phone || '');
    if (!hasChanges) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const trimmedName = fullName.trim();
      let validatedName: string | null = null;
      if (trimmedName) {
        const r = validatePlayerName(trimmedName);
        if (!r.success) { toast.error('Invalid name', { description: r.error ?? 'Validation failed' }); return; }
        validatedName = r.data;
      }
      let validatedHandicap: number | null = null;
      if (handicap) {
        const r = validateHandicap(handicap);
        if (!r.success) { toast.error('Invalid handicap', { description: r.error ?? 'Validation failed' }); return; }
        validatedHandicap = r.data ?? null;
      }
      autoSave({
        full_name: validatedName,
        handicap: validatedHandicap,
        tee_preference: teePreference,
        home_course_id: homeCourseId,
        home_course_name: homeCourseName,
        email: discoveryEmail.trim().toLowerCase() || null,
        phone: sanitizeString(discoveryPhone) || null,
      });
    }, 800);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [fullName, handicap, teePreference, homeCourseId, homeCourseName, discoveryEmail, discoveryPhone, profile, autoSave]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    hapticLight();
    const { error } = await signOut();
    if (error) { toast.error('Failed to sign out'); hapticError(); setIsSigningOut(false); }
    else { hapticSuccess(); toast.success('Signed out'); }
  };

  const handleAvatarUpload = async (file: File) => {
    const url = await uploadAvatar(file);
    if (url) { hapticSuccess(); toast.success('Photo updated'); }
    else { hapticError(); toast.error('Failed to upload photo'); }
    return url;
  };

  const handleHomeCourseSelect = (courseId: string, courseName: string) => {
    setHomeCourseId(courseId);
    setHomeCourseName(courseName);
  };

  const handleHomeCourseClear = () => { setHomeCourseId(null); setHomeCourseName(null); };

  const handleRestorePurchases = async () => {
    if (!Capacitor.isNativePlatform()) { toast.error('Purchases only available on iOS'); return; }
    setIsRestoring(true);
    hapticLight();
    try {
      const result = await restorePurchases();
      if (result.success && result.customerInfo?.isPro) { hapticSuccess(); toast.success('Subscription restored!'); refreshSubscription(); }
      else if (result.success) { toast.info('No active subscription found'); }
      else { hapticError(); toast.error(result.error || 'Failed to restore'); }
    } catch { hapticError(); toast.error('Failed to restore purchases'); }
    finally { setIsRestoring(false); }
  };

  const handleManageSubscription = async () => {
    hapticLight();
    const opened = await openManagementUrl();
    if (!opened) toast.error('Could not open subscription management');
  };

  const handleCopyFriendCode = async () => {
    if (!profile?.friend_code) return;
    try {
      await navigator.clipboard.writeText(profile.friend_code);
      setCopied(true);
      hapticLight();
      toast.success('Friend code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Failed to copy'); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeletingAccount(true);
    hapticLight();
    try {
      const { error } = await deleteAccount();
      if (error) { hapticError(); toast.error('Failed to delete account', { description: 'Please try again or contact support.' }); setIsDeletingAccount(false); }
      else { hapticSuccess(); toast.success('Account deleted'); }
    } catch { hapticError(); toast.error('Failed to delete account'); setIsDeletingAccount(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-foreground" />
      </div>
    );
  }

  const isPromo = subscription?.product_id === 'promo_lifetime';
  const isAnnual = subscription?.product_id?.includes('annual');
  const expiresAt = subscription?.expires_at && !isPromo
    ? new Date(subscription.expires_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

  return (
    <AppLayout
      header={null}
      mainClassName="bg-[#F8F8F6] pb-10"
    >
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div className="bg-[#0A0A0A] rounded-b-[32px] px-6 pb-7 pt-safe-content">
        {/* Nav row */}
        <div className="flex items-center justify-between mb-6">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </motion.button>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/30">Profile</p>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center"
          >
            {isSigningOut ? <Loader2 className="w-4 h-4 animate-spin text-white/60" /> : <LogOut className="w-4 h-4 text-white/60" />}
          </motion.button>
        </div>

        {/* Avatar + identity */}
        <div className="flex items-center gap-4 mb-5">
          <AvatarUpload
            avatarUrl={profile?.avatar_url || null}
            fullName={profile?.full_name || null}
            onUpload={handleAvatarUpload}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-[26px] font-black tracking-[-0.04em] text-white leading-tight truncate">
              {profile?.full_name || 'Add your name'}
            </h1>
            <p className="text-[12px] text-white/40 truncate mt-0.5">{user?.email}</p>
          </div>
        </div>

        {/* Stat chips */}
        <div className="flex gap-2 flex-wrap mb-5">
          {profile?.handicap != null && (
            <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5">
              <Flag className="w-3 h-3 text-[#F0EE3A]" />
              <span className="text-[12px] font-bold text-white">HCP {profile.handicap}</span>
            </div>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { hapticLight(); navigate('/social?tab=friends'); }}
            className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5"
          >
            <Users className="w-3 h-3 text-[#F0EE3A]" />
            <span className="text-[12px] font-bold text-white">{friends.length} Friend{friends.length !== 1 ? 's' : ''}</span>
          </motion.button>
          {homeCourseName && (
            <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5 max-w-[180px]">
              <Home className="w-3 h-3 text-[#F0EE3A] flex-shrink-0" />
              <span className="text-[12px] font-bold text-white truncate">{homeCourseName}</span>
            </div>
          )}
          {isPro && (
            <div className="flex items-center gap-1.5 bg-[#F0EE3A] rounded-xl px-3 py-1.5">
              <Crown className="w-3 h-3 text-[#0A0A0A]" />
              <span className="text-[12px] font-black text-[#0A0A0A]">Pro</span>
            </div>
          )}
        </div>

        {/* Friend Code */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/[0.07] rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-[11px] font-medium text-white/30 uppercase tracking-[0.1em]">Friend Code</span>
            <span className="font-mono font-black text-white tracking-[0.18em] text-[15px]">
              {profile?.friend_code || '------'}
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleCopyFriendCode}
            className="w-12 h-12 bg-white/[0.07] rounded-2xl flex items-center justify-center flex-shrink-0"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Check className="w-4 h-4 text-[#F0EE3A]" />
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Copy className="w-4 h-4 text-white/50" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────── */}
      <div className="px-6 mt-6">

        {/* ── SUBSCRIPTION ─────────────────────────────────────────── */}
        {isPro ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.04 }}
            className="bg-[#0A0A0A] rounded-2xl p-5 mb-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30 mb-1">Current Plan</p>
                <p className="text-[22px] font-black tracking-[-0.04em] text-[#F0EE3A] leading-none">
                  Pro {isPromo ? 'Lifetime' : isAnnual ? 'Annual' : 'Monthly'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#F0EE3A] flex items-center justify-center">
                <Crown className="w-6 h-6 text-[#0A0A0A]" />
              </div>
            </div>
            <div className="border-t border-white/10 pt-3 flex items-center justify-between">
              {expiresAt && <span className="text-[12px] text-white/30">Renews {expiresAt}</span>}
              <div className="flex gap-3 ml-auto">
                <button onClick={handleManageSubscription} className="text-[12px] font-bold text-white/50">
                  Manage
                </button>
                <button
                  onClick={handleRestorePurchases}
                  disabled={isRestoring}
                  className="text-[12px] font-bold text-white/50 flex items-center gap-1"
                >
                  {isRestoring && <Loader2 className="w-3 h-3 animate-spin" />}
                  Restore
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.04 }}
            className="bg-[#0A0A0A] rounded-2xl p-5 mb-5"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30 mb-1">Current Plan</p>
                <p className="text-[22px] font-black tracking-[-0.04em] text-white leading-none">Free</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => { hapticLight(); setShowPaywall(true); }}
                className="bg-[#F0EE3A] text-[#0A0A0A] font-black rounded-xl px-4 py-2.5 text-[13px] flex-shrink-0"
              >
                Upgrade to Pro
              </motion.button>
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
              {['Nassau & Wolf games', 'Full stats & records', 'Unlimited friends', 'Settlement tracking', 'House Game AI builder', 'All prop bets'].map(f => (
                <div key={f} className="flex items-center gap-1.5">
                  <span className="text-[#F0EE3A] text-[11px] font-black">✓</span>
                  <span className="text-[11px] text-white/40">{f}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-3 mt-4">
              <button
                onClick={handleRestorePurchases}
                disabled={isRestoring}
                className="text-[12px] font-bold text-white/30 flex items-center gap-1"
              >
                {isRestoring && <Loader2 className="w-3 h-3 animate-spin" />}
                Restore Purchases
              </button>
            </div>
          </motion.div>
        )}

        {/* ── PROMO CODE CARD ─────────────────────────────────────── */}
        {!isPro && (
          <motion.button
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.06 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { hapticLight(); setShowPromoSheet(true); }}
            className="w-full bg-white rounded-2xl p-4 mb-5 flex items-center gap-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] text-left"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#F0EE3A]/15 flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-[#C4C200]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-black tracking-[-0.02em] text-foreground">Have a promo code?</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Redeem a code to unlock Pro for free</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
          </motion.button>
        )}

        {/* ── GOLF INFO ─────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.08 }}>
          <SectionLabel>Golf</SectionLabel>
          <Card className="mb-5">
            <Row>
              <RowLabel>Handicap Index</RowLabel>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 12.4"
                value={handicap}
                onChange={(e) => setHandicap(e.target.value)}
                className="bg-transparent border-0 text-[14px] text-right text-foreground font-bold focus:ring-0 p-0 w-20 outline-none placeholder:text-muted-foreground/40"
              />
            </Row>
            <Row>
              <RowLabel>Home Course</RowLabel>
              <div className="flex-shrink-0 max-w-[180px]">
                <HomeCourseSelector
                  courseId={homeCourseId}
                  courseName={homeCourseName}
                  onSelect={handleHomeCourseSelect}
                  onClear={handleHomeCourseClear}
                />
              </div>
            </Row>
            <Row last>
              <RowLabel>Preferred Tees</RowLabel>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {TEE_OPTIONS.map((tee) => (
                  <button
                    key={tee.value}
                    type="button"
                    onClick={() => { hapticLight(); setTeePreference(teePreference === tee.value ? null : tee.value); }}
                    className={cn(
                      'h-7 px-2.5 rounded-full text-[11px] font-black transition-all',
                      tee.color,
                      teePreference === tee.value ? 'ring-2 ring-foreground ring-offset-1 opacity-100' : 'opacity-40'
                    )}
                  >
                    {tee.label}
                  </button>
                ))}
              </div>
            </Row>
          </Card>
        </motion.div>

        {/* ── MY GAME FORMATS ──────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.09 }}>
          <SectionLabel>My Game Formats</SectionLabel>
          <Card className="mb-5">
            {myFormats.length === 0 ? (
              <Row last onClick={() => navigate('/my-formats/new')}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <RowLabel>Build your first AI game</RowLabel>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Row>
            ) : (
              <>
                {myFormats.slice(0, 3).map((fmt, i) => (
                  <Row
                    key={fmt.id}
                    last={i === Math.min(myFormats.length, 3) - 1}
                    onClick={() => navigate(`/my-formats/${fmt.id}/edit`)}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <RowLabel>{fmt.name}</RowLabel>
                      {fmt.isPublic && (
                        <span className="text-[10px] font-bold text-[#22C55E] bg-[#22C55E]/10 px-1.5 py-0.5 rounded-md">PUBLIC</span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </Row>
                ))}
                {myFormats.length > 3 && (
                  <Row last onClick={() => navigate('/my-formats/new')}>
                    <RowLabel className="text-muted-foreground">+{myFormats.length - 3} more formats</RowLabel>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Row>
                )}
                {myFormats.length <= 3 && (
                  <Row last onClick={() => navigate('/my-formats/new')}>
                    <RowLabel className="text-muted-foreground">Build new format</RowLabel>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Row>
                )}
              </>
            )}
          </Card>
        </motion.div>

        {/* ── ACCOUNT ──────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.1 }}>
          <SectionLabel>Account</SectionLabel>
          <Card className="mb-5">
            <Row>
              <RowLabel>Full Name</RowLabel>
              <input
                type="text"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-transparent border-0 text-[14px] text-right text-foreground font-bold focus:ring-0 p-0 w-40 outline-none placeholder:text-muted-foreground/40"
              />
            </Row>
            <Row last>
              <RowLabel>Login Email</RowLabel>
              <span className="text-[13px] font-mono text-muted-foreground truncate max-w-[180px]">{user?.email}</span>
            </Row>
          </Card>
        </motion.div>

        {/* ── FIND FRIENDS ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.12 }}>
          <SectionLabel>Find Friends</SectionLabel>
          <Card className="mb-5">
            <Row>
              <RowLabel>Discoverable Email</RowLabel>
              <input
                type="email"
                placeholder="you@email.com"
                value={discoveryEmail}
                onChange={(e) => setDiscoveryEmail(e.target.value)}
                className="bg-transparent border-0 text-[13px] text-right text-foreground font-medium focus:ring-0 p-0 w-44 outline-none placeholder:text-muted-foreground/40"
              />
            </Row>
            <Row last>
              <RowLabel>Discoverable Phone</RowLabel>
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={discoveryPhone}
                onChange={(e) => setDiscoveryPhone(e.target.value)}
                className="bg-transparent border-0 text-[13px] text-right text-foreground font-medium focus:ring-0 p-0 w-36 outline-none placeholder:text-muted-foreground/40"
              />
            </Row>
          </Card>
        </motion.div>

        {/* ── SCORING SETTINGS ────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.14 }}>
          <SectionLabel>Scoring</SectionLabel>
          <Card className="mb-5">
            <Row>
              <div className="flex-1">
                <p className="text-[14px] font-medium text-foreground">Net Scoring</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Handicap-adjusted winners</p>
              </div>
              <Switch
                checked={settings.useNetScoring}
                onCheckedChange={(checked) => {
                  hapticLight();
                  updateSettings({ useNetScoring: checked });
                  toast.success(checked ? 'Net scoring enabled' : 'Gross scoring enabled');
                }}
                className="data-[state=checked]:bg-foreground"
              />
            </Row>
            <Row last>
              <p className="text-[11px] text-muted-foreground leading-relaxed flex-1">
                {settings.useNetScoring
                  ? 'Winners determined by net scores (strokes minus handicap).'
                  : 'Winners determined by gross scores. Handicaps ignored for calculations.'}
              </p>
            </Row>
          </Card>
        </motion.div>

        {/* ── VOICE CONTROL ────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.16 }}>
          <SectionLabel>Voice</SectionLabel>
          <Card className="mb-5">
            <Row>
              <div className="flex-1">
                <p className="text-[14px] font-medium text-foreground">Continuous Listening</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Keep listening after saving scores</p>
              </div>
              <Switch
                checked={settings.continuousVoice}
                onCheckedChange={(checked) => {
                  hapticLight();
                  updateSettings({ continuousVoice: checked });
                  toast.success(checked ? 'Continuous mode on' : 'Continuous mode off');
                }}
                className="data-[state=checked]:bg-foreground"
              />
            </Row>
            <Row>
              <div className="flex-1">
                <p className="text-[14px] font-medium text-foreground">Always Confirm</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Review all scores before saving</p>
              </div>
              <Switch
                checked={settings.alwaysConfirmVoice}
                onCheckedChange={(checked) => {
                  hapticLight();
                  updateSettings({ alwaysConfirmVoice: checked });
                  toast.success(checked ? 'Confirmation required' : 'High confidence saves auto');
                }}
                className="data-[state=checked]:bg-foreground"
              />
            </Row>
            <Row last>
              <p className="text-[11px] text-muted-foreground leading-relaxed flex-1">
                Say "Mike 5, John par" · "next hole" · "go to hole 7" · "finish round"
              </p>
            </Row>
          </Card>
        </motion.div>

        {/* ── NOTIFICATIONS ────────────────────────────────────────── */}
        {Capacitor.isNativePlatform() && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.18 }}>
            <SectionLabel>Notifications</SectionLabel>
            <Card className="mb-5">
              <Row className={pushPermission === 'granted' ? '' : undefined}>
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-foreground">Push Notifications</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {pushPermission === 'granted' ? 'Enabled' : pushPermission === 'denied' ? 'Blocked in Settings' : 'Not enabled'}
                  </p>
                </div>
                {pushPermission === 'granted' ? (
                  <span className="text-[11px] font-black text-[#22C55E] bg-[#F0FFF4] px-2.5 py-1 rounded-full">On</span>
                ) : pushPermission === 'denied' ? (
                  <button
                    onClick={() => {
                      hapticLight();
                      import('@capacitor/core').then(({ Capacitor: Cap }) => {
                        if (Cap.isNativePlatform()) import('@capacitor/app').then(({ App }) => { App.openUrl({ url: 'app-settings:' }); });
                      });
                    }}
                    className="text-[12px] font-bold text-primary flex items-center gap-1"
                  >
                    Open Settings <ExternalLink className="w-3 h-3" />
                  </button>
                ) : shouldPromptForPush() ? (
                  <button
                    onClick={async () => {
                      hapticLight();
                      const granted = await requestPushPermission();
                      setPushPermission(granted ? 'granted' : 'denied');
                      if (granted) hapticSuccess();
                    }}
                    className="text-[12px] font-black text-foreground bg-[#F0EE3A] px-3 py-1.5 rounded-xl"
                  >
                    Enable
                  </button>
                ) : null}
              </Row>
              {pushPermission === 'granted' && (
                <>
                  {([
                    { key: 'roundInvites', label: 'Round Invites', desc: "When someone adds you to a round" },
                    { key: 'friendRequests', label: 'Friend Requests', desc: 'When someone sends or accepts a request' },
                    { key: 'friendStartedRound', label: 'Friend Playing', desc: 'When a friend starts a round you can watch' },
                    { key: 'watch_party', label: 'Watch Party', desc: 'When friends tee off — join the chat' },
                    { key: 'pressTriggered', label: 'Press Triggered', desc: 'When an auto-press fires in your round' },
                    { key: 'tabSettled', label: 'Tab Settled', desc: 'When group debts are settled' },
                    { key: 'tabAddedTo', label: 'Tab Added', desc: 'When a round is added to your group tab' },
                  ] as { key: keyof NotificationPreferences; label: string; desc: string }[]).map(({ key, label, desc }, i, arr) => (
                    <Row key={key} last={i === arr.length - 1}>
                      <div className="flex-1">
                        <p className="text-[14px] font-medium text-foreground">{label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                      <Switch
                        checked={notifPrefs[key]}
                        onCheckedChange={(checked) => {
                          hapticLight();
                          const updated = { ...notifPrefs, [key]: checked };
                          setNotifPrefs(updated);
                          updateProfile({ notification_preferences: updated });
                        }}
                        className="data-[state=checked]:bg-foreground"
                      />
                    </Row>
                  ))}
                </>
              )}
            </Card>
          </motion.div>
        )}

        {/* ── LINKS ────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.2 }}>
          <Card className="mb-5">
            <Row>
              <RowLabel>Help &amp; Support</RowLabel>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { hapticLight(); navigate('/support'); }}
                className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            </Row>
            <Row last>
              <div className="flex gap-5">
                <a href="/privacy-policy" className="text-[13px] text-muted-foreground font-medium hover:text-foreground transition-colors">Privacy</a>
                <a href="/terms-of-service" className="text-[13px] text-muted-foreground font-medium hover:text-foreground transition-colors">Terms</a>
              </div>
            </Row>
          </Card>
        </motion.div>

        {/* ── DANGER ZONE ──────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.22 }}>
          <SectionLabel>Danger Zone</SectionLabel>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { hapticLight(); setShowDeleteConfirm(true); setDeleteConfirmText(''); }}
            className="w-full border border-[#EF4444]/30 bg-[#FEF2F2] text-[#EF4444] rounded-2xl py-4 font-bold text-[14px] flex items-center justify-center gap-2 mb-8"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </motion.button>
        </motion.div>

      </div>

      {/* ── DELETE CONFIRM DIALOG ─────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={spring}
            className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#FEF2F2] flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
              </div>
              <div>
                <h3 className="font-black text-[18px] tracking-[-0.03em]">Delete Account?</h3>
                <p className="text-[12px] text-muted-foreground">This cannot be undone</p>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Permanently deletes your account, rounds, scores, friends, and all data. Active subscriptions must be cancelled separately through the App Store.
            </p>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">
                Type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="rounded-xl font-mono text-center"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeletingAccount} className="flex-1 rounded-2xl h-12">
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || isDeletingAccount}
                className="flex-1 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-2xl h-12 font-bold"
              >
                {isDeletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Forever'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} feature="Pro" />
      <PromoCodeSheet open={showPromoSheet} onOpenChange={setShowPromoSheet} onSuccess={refreshSubscription} />
    </AppLayout>
  );
}
