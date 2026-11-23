import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
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
import { restorePurchases, openManagementUrl } from '@/services/purchases';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { validatePlayerName, validateHandicap, sanitizeString, normalizePhone } from '@/lib/validation';
import { RowLabel, Row, RowText, SectionLabel, Card } from '@/components/profile/ProfileRowPrimitives';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfilePlanCard } from '@/components/profile/ProfilePlanCard';
import { TeePreferencePicker } from '@/components/profile/TeePreferencePicker';
import { DeleteAccountDialog } from '@/components/profile/DeleteAccountDialog';
import { NotificationSettings } from '@/components/profile/NotificationSettings';

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

    // Canonicalize inputs to match exactly what updateProfile will persist.
    // Without this, normalization (trim, lowercase, handicap rounding) would cause
    // `hasChanges` to stay true after save → infinite save loop → toast flicker on iPad.
    const canonicalName = sanitizeString(fullName) || null;
    const parsedHandicap = handicap ? parseFloat(handicap) : NaN;
    const canonicalHandicap = isNaN(parsedHandicap) ? null : Math.round(parsedHandicap * 10) / 10;
    const canonicalEmail = discoveryEmail.trim().toLowerCase() || null;
    // Phone is stored digits-only (matches the normalize_profile_fields trigger),
    // so canonicalize the same way or hasChanges never settles → infinite save loop.
    const canonicalPhone = normalizePhone(discoveryPhone) || null;

    const hasChanges =
      canonicalName !== (profile.full_name ?? null) ||
      canonicalHandicap !== (profile.handicap ?? null) ||
      teePreference !== profile.tee_preference ||
      homeCourseId !== profile.home_course_id ||
      canonicalEmail !== (profile.email ?? null) ||
      canonicalPhone !== (profile.phone ?? null);
    if (!hasChanges) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (fullName.trim()) {
        const r = validatePlayerName(fullName.trim());
        if (!r.success) { toast.error('Invalid name', { description: r.error ?? 'Validation failed' }); return; }
      }
      if (handicap) {
        const r = validateHandicap(handicap);
        if (!r.success) { toast.error('Invalid handicap', { description: r.error ?? 'Validation failed' }); return; }
      }
      autoSave({
        full_name: canonicalName,
        handicap: canonicalHandicap,
        tee_preference: teePreference,
        home_course_id: homeCourseId,
        home_course_name: homeCourseName,
        email: canonicalEmail,
        phone: canonicalPhone,
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const isPromo = subscription?.product_id === 'promo_lifetime';
  const isAnnual = subscription?.product_id?.includes('annual');
  const expiresAt = subscription?.expires_at && !isPromo
    ? new Date(subscription.expires_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };
  const section = (delay: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { ...spring, delay } });
  const fieldInput = 'bg-transparent border-0 text-right text-foreground focus:ring-0 p-0 outline-none placeholder:text-muted-foreground/50';

  return (
    <AppLayout header={null} mainClassName="bg-background pb-10">
      <ProfileHeader
        fullName={profile?.full_name || null}
        email={user?.email}
        avatarUrl={profile?.avatar_url || null}
        onAvatarUpload={handleAvatarUpload}
        handicap={profile?.handicap}
        friendsCount={friends.length}
        homeCourseName={homeCourseName}
        isPro={isPro}
        friendCode={profile?.friend_code}
        copied={copied}
        isSigningOut={isSigningOut}
        onBack={() => navigate(-1)}
        onSignOut={handleSignOut}
        onCopyFriendCode={handleCopyFriendCode}
        onOpenFriends={() => { hapticLight(); navigate('/social?tab=friends'); }}
      />

      <div className="px-5 mt-3.5 space-y-3.5">
        {/* ── SUBSCRIPTION ─────────────────────────────────────────── */}
        <motion.div {...section(0.04)}>
          <ProfilePlanCard
            isPro={isPro}
            planName={`Pro ${isPromo ? 'Lifetime' : isAnnual ? 'Annual' : 'Monthly'}`}
            renewsOn={expiresAt}
            isRestoring={isRestoring}
            onUpgrade={() => { hapticLight(); setShowPaywall(true); }}
            onManage={handleManageSubscription}
            onRestore={handleRestorePurchases}
          />
        </motion.div>

        {/* ── GOLF INFO ─────────────────────────────────────────────── */}
        <motion.div {...section(0.08)}>
          <SectionLabel>Golf</SectionLabel>
          <Card>
            <Row>
              <RowLabel>Handicap index</RowLabel>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                aria-label="Handicap index"
                placeholder="e.g. 12.4"
                value={handicap}
                onChange={(e) => setHandicap(e.target.value)}
                className={cn(fieldInput, 'text-[17px] font-extrabold w-24 tabular-nums')}
              />
            </Row>
            <Row>
              <RowLabel>Home course</RowLabel>
              <div className="flex-shrink-0 max-w-[190px]">
                <HomeCourseSelector
                  courseId={homeCourseId}
                  courseName={homeCourseName}
                  onSelect={handleHomeCourseSelect}
                  onClear={handleHomeCourseClear}
                />
              </div>
            </Row>
            <div className="px-4 pt-3 pb-4">
              <RowLabel>Preferred tees</RowLabel>
              <div className="mt-2.5">
                <TeePreferencePicker value={teePreference} onChange={setTeePreference} />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── MY GAME FORMATS ──────────────────────────────────────── */}
        <motion.div {...section(0.09)}>
          <SectionLabel>My game formats</SectionLabel>
          <Card>
            {myFormats.length === 0 ? (
              <Row last onClick={() => navigate('/my-formats/new')}>
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-[12px] bg-gold flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-gold-foreground" />
                  </span>
                  <RowLabel>Build your first AI game</RowLabel>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Row>
            ) : (
              <>
                {myFormats.slice(0, 3).map((fmt) => (
                  <Row key={fmt.id} onClick={() => navigate(`/my-formats/${fmt.id}/edit`)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-[12px] bg-muted flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </span>
                      <RowLabel className="truncate">{fmt.name}</RowLabel>
                      {fmt.isPublic && (
                        <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">Public</span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </Row>
                ))}
                <Row last onClick={() => navigate('/my-formats/new')}>
                  <RowLabel className="text-primary">
                    {myFormats.length > 3 ? `+${myFormats.length - 3} more formats` : 'Build new format'}
                  </RowLabel>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Row>
              </>
            )}
          </Card>
        </motion.div>

        {/* ── ACCOUNT ──────────────────────────────────────────────── */}
        <motion.div {...section(0.1)}>
          <SectionLabel>Account</SectionLabel>
          <Card>
            <Row>
              <RowLabel>Full name</RowLabel>
              <input
                type="text"
                aria-label="Full name"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={cn(fieldInput, 'text-[15px] font-semibold w-44')}
              />
            </Row>
            <Row last>
              <RowLabel>Login email</RowLabel>
              <span className="text-[14px] text-muted-foreground truncate max-w-[190px]">{user?.email}</span>
            </Row>
          </Card>
        </motion.div>

        {/* ── FIND FRIENDS ─────────────────────────────────────────── */}
        <motion.div {...section(0.12)}>
          <SectionLabel>Find friends</SectionLabel>
          <Card>
            <Row>
              <RowLabel>Email</RowLabel>
              <input
                type="email"
                aria-label="Discoverable email"
                placeholder="you@email.com"
                value={discoveryEmail}
                onChange={(e) => setDiscoveryEmail(e.target.value)}
                className={cn(fieldInput, 'text-[14px] font-medium w-44')}
              />
            </Row>
            <Row last>
              <RowLabel>Phone</RowLabel>
              <input
                type="tel"
                aria-label="Discoverable phone"
                placeholder="(555) 123-4567"
                value={discoveryPhone}
                onChange={(e) => setDiscoveryPhone(e.target.value)}
                className={cn(fieldInput, 'text-[14px] font-medium w-36 tabular-nums')}
              />
            </Row>
          </Card>
        </motion.div>

        {/* ── SCORING SETTINGS ────────────────────────────────────── */}
        <motion.div {...section(0.14)}>
          <SectionLabel>Scoring</SectionLabel>
          <Card>
            <Row last>
              <RowText
                title="Net scoring"
                caption={settings.useNetScoring
                  ? 'Winners decided by net scores (strokes minus handicap)'
                  : 'Winners decided by gross scores. Handicaps ignored.'}
              />
              <Switch
                checked={settings.useNetScoring}
                aria-label="Net scoring"
                onCheckedChange={(checked) => {
                  hapticLight();
                  updateSettings({ useNetScoring: checked });
                  toast.success(checked ? 'Net scoring enabled' : 'Gross scoring enabled');
                }}
              />
            </Row>
          </Card>
        </motion.div>

        {/* ── VOICE CONTROL ────────────────────────────────────────── */}
        <motion.div {...section(0.16)}>
          <SectionLabel>Voice</SectionLabel>
          <Card>
            <Row>
              <RowText title="Continuous listening" caption="Keep listening after saving scores" />
              <Switch
                checked={settings.continuousVoice}
                aria-label="Continuous listening"
                onCheckedChange={(checked) => {
                  hapticLight();
                  updateSettings({ continuousVoice: checked });
                  toast.success(checked ? 'Continuous mode on' : 'Continuous mode off');
                }}
              />
            </Row>
            <Row>
              <RowText title="Always confirm" caption="Review all scores before saving" />
              <Switch
                checked={settings.alwaysConfirmVoice}
                aria-label="Always confirm"
                onCheckedChange={(checked) => {
                  hapticLight();
                  updateSettings({ alwaysConfirmVoice: checked });
                  toast.success(checked ? 'Confirmation required' : 'High confidence saves auto');
                }}
              />
            </Row>
            <div className="px-4 py-3 bg-muted/50">
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Try <span className="font-semibold text-foreground">"Mike 5, John par"</span> · "next hole" · "go to hole 7" · "finish round"
              </p>
            </div>
          </Card>
        </motion.div>

        <NotificationSettings
          pushPermission={pushPermission}
          setPushPermission={setPushPermission}
          notifPrefs={notifPrefs}
          setNotifPrefs={setNotifPrefs}
          onUpdateProfile={updateProfile}
        />

        {/* ── LINKS ────────────────────────────────────────────────── */}
        <motion.div {...section(0.2)}>
          <SectionLabel>Help</SectionLabel>
          <Card>
            <Row onClick={() => { hapticLight(); navigate('/support'); }}>
              <RowLabel>Help &amp; support</RowLabel>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Row>
            <Row onClick={() => navigate('/privacy-policy')}>
              <RowLabel>Privacy policy</RowLabel>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Row>
            <Row last onClick={() => navigate('/terms-of-service')}>
              <RowLabel>Terms of service</RowLabel>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Row>
          </Card>
        </motion.div>

        {/* ── DANGER ZONE ──────────────────────────────────────────── */}
        <motion.div {...section(0.22)} className="pb-6">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { hapticLight(); setShowDeleteConfirm(true); setDeleteConfirmText(''); }}
            className="w-full h-14 bg-card border border-border text-loss rounded-[20px] font-semibold text-[15px] flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete account
          </motion.button>
        </motion.div>
      </div>

      {showDeleteConfirm && (
        <DeleteAccountDialog
          confirmText={deleteConfirmText}
          onConfirmTextChange={setDeleteConfirmText}
          isDeleting={isDeletingAccount}
          onCancel={() => setShowDeleteConfirm(false)}
          onDelete={handleDeleteAccount}
        />
      )}

      <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} feature="Pro" />
    </AppLayout>
  );
}
