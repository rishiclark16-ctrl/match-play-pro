import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, LogOut, Users, Copy, Check, User, Flag, Home, AtSign, Phone, Settings, HelpCircle, Mic, Crown, ExternalLink, Trash2, AlertTriangle, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
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
import { PaywallModal } from '@/components/subscription/PaywallModal';
import { ProBadge } from '@/components/subscription/ProBadge';
import { restorePurchases, openManagementUrl } from '@/services/purchases';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { validatePlayerName, validateHandicap, sanitizeString } from '@/lib/validation';

const TEE_OPTIONS = [
  { value: 'back', label: 'B', color: 'bg-foreground text-background' },
  { value: 'blue', label: 'B', color: 'bg-blue-600 text-white' },
  { value: 'white', label: 'W', color: 'bg-white text-foreground' },
  { value: 'gold', label: 'G', color: 'bg-yellow-500 text-foreground' },
  { value: 'red', label: 'R', color: 'bg-red-600 text-white' },
];

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut, deleteAccount } = useAuth();
  const { profile, loading, updateProfile, uploadAvatar } = useProfile();
  const { friends } = useFriends();
  const { settings, updateSettings } = useSettings();
  const { isPro, subscription, refreshSubscription } = useSubscription();
  const [copied, setCopied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
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

  // Push notification state
  const [pushPermission, setPushPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

  // Track if initial load is complete to prevent auto-save on mount
  const isInitialized = useRef(false);
  const hasLoadedOnce = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize form with profile data - only on first load
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
      // Mark as initialized after a short delay to prevent immediate auto-save
      setTimeout(() => {
        isInitialized.current = true;
      }, 100);
    }
  }, [profile]);

  // Check push permission status on mount
  useEffect(() => {
    checkPushPermission().then(setPushPermission);
  }, []);

  // Auto-save function with debounce
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

  // Auto-save when values change (debounced)
  useEffect(() => {
    if (!isInitialized.current || !profile) return;

    // Check if anything actually changed
    const hasChanges =
      fullName !== (profile.full_name || '') ||
      handicap !== (profile.handicap?.toString() || '') ||
      teePreference !== profile.tee_preference ||
      homeCourseId !== profile.home_course_id ||
      discoveryEmail !== (profile.email || '') ||
      discoveryPhone !== (profile.phone || '');

    if (!hasChanges) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 800ms
    saveTimeoutRef.current = setTimeout(() => {
      // Validate name (allow empty/null)
      const trimmedName = fullName.trim();
      let validatedName: string | null = null;
      if (trimmedName) {
        const nameResult = validatePlayerName(trimmedName);
        if (!nameResult.success) {
          toast.error('Invalid name', { description: nameResult.error ?? 'Validation failed' });
          return;
        }
        validatedName = nameResult.data;
      }

      // Validate handicap (allow empty/null)
      let validatedHandicap: number | null = null;
      if (handicap) {
        const handicapResult = validateHandicap(handicap);
        if (!handicapResult.success) {
          toast.error('Invalid handicap', { description: handicapResult.error ?? 'Validation failed' });
          return;
        }
        validatedHandicap = handicapResult.data ?? null;
      }

      const updates: ProfileUpdate = {
        full_name: validatedName,
        handicap: validatedHandicap,
        tee_preference: teePreference,
        home_course_id: homeCourseId,
        home_course_name: homeCourseName,
        email: discoveryEmail.trim().toLowerCase() || null,
        phone: sanitizeString(discoveryPhone) || null,
      };
      autoSave(updates);
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [fullName, handicap, teePreference, homeCourseId, homeCourseName, discoveryEmail, discoveryPhone, profile, autoSave]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    hapticLight();
    const { error } = await signOut();
    if (error) {
      toast.error('Failed to sign out');
      hapticError();
      setIsSigningOut(false);
    } else {
      hapticSuccess();
      toast.success('Signed out');
    }
  };

  const handleAvatarUpload = async (file: File) => {
    const url = await uploadAvatar(file);
    if (url) {
      hapticSuccess();
      toast.success('Photo updated');
    } else {
      hapticError();
      toast.error('Failed to upload photo');
    }
    return url;
  };

  const handleHomeCourseSelect = (courseId: string, courseName: string) => {
    setHomeCourseId(courseId);
    setHomeCourseName(courseName);
  };

  const handleHomeCourseClear = () => {
    setHomeCourseId(null);
    setHomeCourseName(null);
  };

  const handleRestorePurchases = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.error('Purchases only available on iOS');
      return;
    }

    setIsRestoring(true);
    hapticLight();

    try {
      const result = await restorePurchases();
      if (result.success && result.customerInfo?.isPro) {
        hapticSuccess();
        toast.success('Subscription restored!');
        refreshSubscription();
      } else if (result.success) {
        toast.info('No active subscription found');
      } else {
        hapticError();
        toast.error(result.error || 'Failed to restore');
      }
    } catch {
      hapticError();
      toast.error('Failed to restore purchases');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleManageSubscription = async () => {
    hapticLight();
    const opened = await openManagementUrl();
    if (!opened) {
      toast.error('Could not open subscription management');
    }
  };

  const handleCopyFriendCode = async () => {
    if (!profile?.friend_code) return;

    try {
      await navigator.clipboard.writeText(profile.friend_code);
      setCopied(true);
      hapticLight();
      toast.success('Friend code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setIsDeletingAccount(true);
    hapticLight();

    try {
      const { error } = await deleteAccount();
      if (error) {
        hapticError();
        toast.error('Failed to delete account', { description: 'Please try again or contact support.' });
        setIsDeletingAccount(false);
      } else {
        hapticSuccess();
        toast.success('Account deleted');
      }
    } catch {
      hapticError();
      toast.error('Failed to delete account');
      setIsDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-foreground" />
      </div>
    );
  }

  const headerContent = (
    <div className="flex-shrink-0 px-6 pb-3 pt-safe-content border-b-2 border-foreground flex items-center justify-between">
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">MATCH Golf</p>
          <h1 className="text-[22px] font-black tracking-[-0.04em] leading-tight text-foreground">Profile</h1>
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
      >
        {isSigningOut ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LogOut className="w-4 h-4" />
        )}
      </motion.button>
    </div>
  );

  return (
    <AppLayout
      header={headerContent}
      mainClassName="bg-[#F8F8F6] pb-8"
    >
      {/* Avatar Section */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0 }}
        className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 mx-6 mb-3 mt-4 flex flex-col items-center"
      >
        <AvatarUpload
          avatarUrl={profile?.avatar_url || null}
          fullName={profile?.full_name || null}
          onUpload={handleAvatarUpload}
          size="lg"
          className="rounded-2xl"
        />
        <p className="mt-3 text-lg font-black tracking-[-0.03em]">{profile?.full_name || 'Add your name'}</p>
        <p className="text-sm font-mono text-muted-foreground">{user?.email}</p>

        {/* Friend Code Row */}
        <div className="flex items-center gap-2 mt-3">
          <div className="bg-muted rounded-xl px-4 py-2 font-mono font-black tracking-[0.2em] text-sm">
            {profile?.friend_code || '------'}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleCopyFriendCode}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            {copied ? (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <Check className="w-4 h-4 text-[#22C55E]" />
              </motion.span>
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              hapticLight();
              navigate('/friends');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted text-sm font-bold"
          >
            <Users className="w-3.5 h-3.5" />
            <span>{friends.length} Friend{friends.length !== 1 ? 's' : ''}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Golf Info Section */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.06 }}
        className="mx-6 mb-3"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2">Golf Info</p>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* Handicap */}
          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border/40">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Flag className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">Handicap Index</span>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 12.4"
              value={handicap}
              onChange={(e) => setHandicap(e.target.value)}
              className="bg-transparent border-0 text-sm text-right text-foreground font-medium focus:ring-0 p-0 w-20 outline-none"
            />
          </div>
          {/* Home Course */}
          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border/40">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Home className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">Home Course</span>
            <div className="flex-shrink-0 max-w-[160px]">
              <HomeCourseSelector
                courseId={homeCourseId}
                courseName={homeCourseName}
                onSelect={handleHomeCourseSelect}
                onClear={handleHomeCourseClear}
              />
            </div>
          </div>
          {/* Tee Preference */}
          <div className="px-4 py-3.5 flex items-center gap-3 last:border-0">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Flag className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">Preferred Tees</span>
            <div className="flex gap-2 flex-wrap justify-end">
              {TEE_OPTIONS.map((tee) => (
                <button
                  key={tee.value}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setTeePreference(teePreference === tee.value ? null : tee.value);
                  }}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all',
                    tee.color,
                    teePreference === tee.value
                      ? 'ring-2 ring-foreground ring-offset-1'
                      : 'opacity-60'
                  )}
                >
                  {tee.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Friend Discovery Section */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
        className="mx-6 mb-3"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2">Friend Discovery</p>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* Discoverable Email */}
          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border/40">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <AtSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">Email</span>
            <input
              type="email"
              placeholder="email@example.com"
              value={discoveryEmail}
              onChange={(e) => setDiscoveryEmail(e.target.value)}
              className="bg-transparent border-0 text-sm text-right text-foreground font-medium focus:ring-0 p-0 w-40 outline-none"
            />
          </div>
          {/* Discoverable Phone */}
          <div className="px-4 py-3.5 flex items-center gap-3 last:border-0">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">Phone</span>
            <input
              type="tel"
              placeholder="(555) 123-4567"
              value={discoveryPhone}
              onChange={(e) => setDiscoveryPhone(e.target.value)}
              className="bg-transparent border-0 text-sm text-right text-foreground font-medium focus:ring-0 p-0 w-36 outline-none"
            />
          </div>
        </div>
      </motion.div>

      {/* Account Section */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.14 }}
        className="mx-6 mb-3"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2">Account</p>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* Full Name */}
          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border/40">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">Full Name</span>
            <input
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-transparent border-0 text-sm text-right text-foreground font-medium focus:ring-0 p-0 w-36 outline-none"
            />
          </div>
          {/* Login Email (readonly) */}
          <div className="px-4 py-3.5 flex items-center gap-3 last:border-0">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <AtSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">Login Email</span>
            <span className="text-sm font-mono text-muted-foreground truncate max-w-[160px]">{user?.email}</span>
          </div>
        </div>
      </motion.div>

      {/* Subscription Section */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.18 }}
        className="mx-6 mb-3"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2">Subscription</p>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* Current Plan row */}
          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border/40">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Crown className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">Current Plan</span>
            <div className="flex items-center gap-2">
              <span className="bg-foreground text-background text-[10px] font-bold px-2 py-0.5 rounded-full">
                {isPro
                  ? subscription?.product_id?.includes('annual') ? 'Pro Annual' : 'Pro Monthly'
                  : 'Free'}
              </span>
              {isPro && <ProBadge size="sm" />}
            </div>
          </div>
          {/* Upgrade / Manage row */}
          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border/40">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">
              {isPro ? 'Manage Subscription' : 'Unlock Pro Features'}
            </span>
            {!isPro ? (
              <button
                onClick={() => {
                  hapticLight();
                  setShowPaywall(true);
                }}
                className="bg-[#F0EE3A] text-[#0A0A0A] font-bold rounded-xl text-sm px-4 py-2"
              >
                Upgrade
              </button>
            ) : (
              <button
                onClick={handleManageSubscription}
                className="text-sm font-medium text-muted-foreground"
              >
                Manage
              </button>
            )}
          </div>
          {/* Restore Purchases row */}
          <div className="px-4 py-3.5 flex items-center gap-3 last:border-0">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              {isRestoring ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Settings className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <button
              onClick={handleRestorePurchases}
              disabled={isRestoring}
              className="text-sm font-medium text-foreground flex-1 text-left"
            >
              Restore Purchases
            </button>
          </div>
        </div>
      </motion.div>

      {/* Scoring Settings Section */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.22 }}
        className="mx-6 mb-3"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2">Scoring Settings</p>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* Net Scoring Toggle */}
          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border/40">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Use Net Scoring</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Determine winners by handicap-adjusted scores</p>
            </div>
            <Switch
              checked={settings.useNetScoring}
              onCheckedChange={(checked) => {
                hapticLight();
                updateSettings({ useNetScoring: checked });
                toast.success(checked ? 'Net scoring enabled' : 'Gross scoring enabled');
              }}
              className="data-[state=checked]:bg-[#22C55E]"
            />
          </div>
          <div className="px-4 py-3 last:border-0">
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <HelpCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                {settings.useNetScoring
                  ? 'Winners are determined by net scores (strokes minus handicap). Match play uses differential strokes per hole.'
                  : 'Winners are determined by gross scores (raw strokes). Handicaps are ignored for winner calculation.'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Voice Control Settings Section */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.22 }}
        className="mx-6 mb-3"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2">Voice Control</p>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* Continuous Listening Toggle */}
          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border/40">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Mic className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Continuous Listening</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Keep listening after saving scores</p>
            </div>
            <Switch
              checked={settings.continuousVoice}
              onCheckedChange={(checked) => {
                hapticLight();
                updateSettings({ continuousVoice: checked });
                toast.success(checked ? 'Continuous mode on' : 'Continuous mode off');
              }}
              className="data-[state=checked]:bg-[#22C55E]"
            />
          </div>
          {/* Always Confirm Toggle */}
          <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border/40">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Mic className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Always Confirm</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Review all voice scores before saving</p>
            </div>
            <Switch
              checked={settings.alwaysConfirmVoice}
              onCheckedChange={(checked) => {
                hapticLight();
                updateSettings({ alwaysConfirmVoice: checked });
                toast.success(checked ? 'Confirmation required' : 'High confidence saves auto');
              }}
              className="data-[state=checked]:bg-[#22C55E]"
            />
          </div>
          <div className="px-4 py-3 last:border-0">
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <HelpCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Voice commands: "Mike 5, John par" • "next hole" • "go to hole 7" • "finish round" • Say "yes" or "no" to confirm
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Notifications Section */}
      {Capacitor.isNativePlatform() && (
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.24 }}
          className="mx-6 mb-3"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2">Notifications</p>
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Permission row */}
            <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border/40">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Push Notifications</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {pushPermission === 'granted' ? 'Enabled' : pushPermission === 'denied' ? 'Blocked — tap to open Settings' : 'Not yet enabled'}
                </p>
              </div>
              {pushPermission === 'granted' ? (
                <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">On</span>
              ) : pushPermission === 'denied' ? (
                <button
                  onClick={() => {
                    hapticLight();
                    // On iOS, open app settings
                    import('@capacitor/core').then(({ Capacitor: Cap }) => {
                      if (Cap.isNativePlatform()) {
                        import('@capacitor/app').then(({ App }) => {
                          App.openUrl({ url: 'app-settings:' });
                        });
                      }
                    });
                  }}
                  className="text-[12px] font-bold text-primary flex items-center gap-1"
                >
                  Settings <ExternalLink className="w-3 h-3" />
                </button>
              ) : shouldPromptForPush() ? (
                <button
                  onClick={async () => {
                    hapticLight();
                    const granted = await requestPushPermission();
                    setPushPermission(granted ? 'granted' : 'denied');
                    if (granted) hapticSuccess();
                  }}
                  className="text-[12px] font-bold text-primary"
                >
                  Enable
                </button>
              ) : null}
            </div>

            {/* Notification type toggles — only show when enabled */}
            {pushPermission === 'granted' && (
              <>
                {(
                  [
                    { key: 'roundInvites', label: 'Round Invites', desc: "When someone adds you to a round" },
                    { key: 'pressTriggered', label: 'Press Triggered', desc: 'When an auto-press fires in your round' },
                    { key: 'tabSettled', label: 'Tab Settled', desc: 'When group debts are settled' },
                    { key: 'tabAddedTo', label: 'Tab Added', desc: 'When a round is added to your group tab' },
                  ] as { key: keyof NotificationPreferences; label: string; desc: string }[]
                ).map(({ key, label, desc }, i, arr) => (
                  <div
                    key={key}
                    className={cn('px-4 py-3.5 flex items-center gap-3', i < arr.length - 1 && 'border-b border-border/40')}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{label}</p>
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
                      className="data-[state=checked]:bg-[#22C55E]"
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Danger Zone */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.26 }}
        className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-6 mb-3 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#EF4444]">Danger Zone</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={() => {
            hapticLight();
            setShowDeleteConfirm(true);
            setDeleteConfirmText('');
          }}
          className="w-full border border-[#EF4444]/40 bg-[#FEF2F2] text-[#EF4444] rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </motion.div>

      {/* Delete Account Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FEF2F2] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-[-0.03em]">Delete Account?</h3>
                <p className="text-xs text-muted-foreground">This cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              This will permanently delete your account, rounds, scores, friends, and all other data. Any active subscriptions will need to be cancelled separately through the App Store.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="bg-muted/50 rounded-xl border border-border font-mono text-center py-3"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletingAccount}
                className="flex-1 rounded-2xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || isDeletingAccount}
                className="flex-1 bg-destructive text-destructive-foreground rounded-2xl h-12 font-bold"
              >
                {isDeletingAccount ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Delete Forever'
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Support & Legal Links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
        className="flex flex-col items-center gap-3 pt-4 pb-8 mx-6"
      >
        <button
          onClick={() => {
            hapticLight();
            navigate('/support');
          }}
          className="text-sm text-foreground font-semibold hover:underline transition-colors"
        >
          Help & Support
        </button>
        <div className="flex justify-center gap-4">
          <a
            href="/privacy-policy"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Policy
          </a>
          <span className="text-muted-foreground/30">•</span>
          <a
            href="/terms-of-service"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms of Service
          </a>
        </div>
      </motion.div>

      {/* Paywall Modal */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
      />
    </AppLayout>
  );
}
