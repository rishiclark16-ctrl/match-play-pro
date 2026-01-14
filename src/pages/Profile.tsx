import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, LogOut, Users, Copy, Check, User, Flag, Home, AtSign, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { HomeCourseSelector } from '@/components/profile/HomeCourseSelector';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
import { GeometricBackground } from '@/components/ui/geometric-background';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, ProfileUpdate } from '@/hooks/useProfile';
import { useFriends } from '@/hooks/useFriends';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TEE_OPTIONS = [
  { value: 'back', label: 'Back', color: 'bg-foreground text-background' },
  { value: 'blue', label: 'Blue', color: 'bg-blue-600 text-white' },
  { value: 'white', label: 'White', color: 'bg-white text-foreground border-2 border-border' },
  { value: 'gold', label: 'Gold', color: 'bg-yellow-500 text-foreground' },
  { value: 'red', label: 'Red', color: 'bg-red-600 text-white' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, loading, updateProfile, uploadAvatar } = useProfile();
  const { friends } = useFriends();
  const [copied, setCopied] = useState(false);

  const [fullName, setFullName] = useState('');
  const [handicap, setHandicap] = useState('');
  const [teePreference, setTeePreference] = useState<string | null>(null);
  const [homeCourseId, setHomeCourseId] = useState<string | null>(null);
  const [homeCourseName, setHomeCourseName] = useState<string | null>(null);
  const [discoveryEmail, setDiscoveryEmail] = useState('');
  const [discoveryPhone, setDiscoveryPhone] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  // Track if initial load is complete to prevent auto-save on mount
  const isInitialized = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setHandicap(profile.handicap?.toString() || '');
      setTeePreference(profile.tee_preference);
      setHomeCourseId(profile.home_course_id);
      setHomeCourseName(profile.home_course_name);
      setDiscoveryEmail(profile.email || '');
      setDiscoveryPhone(profile.phone || '');
      // Mark as initialized after a short delay to prevent immediate auto-save
      setTimeout(() => {
        isInitialized.current = true;
      }, 100);
    }
  }, [profile]);

  // Auto-save function with debounce
  const autoSave = useCallback(async (updates: ProfileUpdate) => {
    const success = await updateProfile(updates);
    if (success) {
      hapticSuccess();
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
      const updates: ProfileUpdate = {
        full_name: fullName.trim() || null,
        handicap: handicap ? parseFloat(handicap) : null,
        tee_preference: teePreference,
        home_course_id: homeCourseId,
        home_course_name: homeCourseName,
        email: discoveryEmail.trim().toLowerCase() || null,
        phone: discoveryPhone.trim() || null,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <GeometricBackground />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const headerContent = (
    <div className="flex items-center gap-4 px-4 pb-2">
      <button
        onClick={() => navigate(-1)}
        className="w-11 h-11 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h1 className="heading-lg flex-1">Profile</h1>
    </div>
  );

  return (
    <AppLayout
      header={headerContent}
      background={<GeometricBackground />}
      hideBottomNav
      mainClassName="px-4 pb-32 space-y-6"
    >
        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center pt-2"
        >
          <TechCard variant="elevated" className="p-5 flex flex-col items-center w-full">
            <AvatarUpload
              avatarUrl={profile?.avatar_url || null}
              fullName={profile?.full_name || null}
              onUpload={handleAvatarUpload}
              size="lg"
            />
            <p className="mt-3 heading-md">{profile?.full_name || 'Add your name'}</p>
            <p className="text-sm text-muted-foreground font-mono">{user?.email}</p>
            
            {/* Friend Code & Friends Link */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleCopyFriendCode}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                <span className="font-mono tracking-widest text-xs">{profile?.friend_code || '------'}</span>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  hapticLight();
                  navigate('/friends');
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/80 transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="number-display">{friends.length}</span>
                <span>Friend{friends.length !== 1 ? 's' : ''}</span>
              </button>
            </div>
          </TechCard>
        </motion.div>

        {/* Golf Info Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-primary" />
            <span className="label-sm">Golf Info</span>
          </div>

          {/* Handicap */}
          <TechCard hover>
            <TechCardContent className="space-y-1.5">
              <Label htmlFor="handicap" className="label-sm">Handicap Index</Label>
              <Input
                id="handicap"
                type="number"
                step="0.1"
                placeholder="e.g. 12.4"
                value={handicap}
                onChange={(e) => setHandicap(e.target.value)}
                className="h-11 text-base font-mono bg-background border border-border focus:border-primary"
              />
            </TechCardContent>
          </TechCard>

          {/* Home Course */}
          <TechCard hover>
            <TechCardContent className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-muted-foreground" />
                <Label className="label-sm">Home Course</Label>
              </div>
              <HomeCourseSelector
                courseId={homeCourseId}
                courseName={homeCourseName}
                onSelect={handleHomeCourseSelect}
                onClear={handleHomeCourseClear}
              />
            </TechCardContent>
          </TechCard>

          {/* Tee Preference */}
          <TechCard hover>
            <TechCardContent className="space-y-2">
              <Label className="label-sm">Preferred Tees</Label>
              <div className="flex flex-wrap gap-2">
                {TEE_OPTIONS.map((tee) => (
                  <button
                    key={tee.value}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setTeePreference(teePreference === tee.value ? null : tee.value);
                    }}
                    className={cn(
                      'px-3 py-2 rounded-lg font-bold text-sm transition-all',
                      tee.color,
                      teePreference === tee.value
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
                        : 'opacity-70 hover:opacity-100'
                    )}
                  >
                    {tee.label}
                  </button>
                ))}
              </div>
            </TechCardContent>
          </TechCard>
        </motion.section>

        {/* Friend Discovery Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="label-sm">Friend Discovery</span>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Let friends find you by email or phone number
          </p>

          {/* Discoverable Email */}
          <TechCard hover>
            <TechCardContent className="space-y-1.5">
              <div className="flex items-center gap-2">
                <AtSign className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="discoveryEmail" className="label-sm">Discoverable Email</Label>
              </div>
              <Input
                id="discoveryEmail"
                type="email"
                placeholder="email@example.com"
                value={discoveryEmail}
                onChange={(e) => setDiscoveryEmail(e.target.value)}
                className="h-11 text-base bg-background border border-border focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground">
                Friends can send you requests using this email
              </p>
            </TechCardContent>
          </TechCard>

          {/* Discoverable Phone */}
          <TechCard hover>
            <TechCardContent className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="discoveryPhone" className="label-sm">Discoverable Phone</Label>
              </div>
              <Input
                id="discoveryPhone"
                type="tel"
                placeholder="(555) 123-4567"
                value={discoveryPhone}
                onChange={(e) => setDiscoveryPhone(e.target.value)}
                className="h-11 text-base bg-background border border-border focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground">
                Friends can send you requests using this number
              </p>
            </TechCardContent>
          </TechCard>
        </motion.section>

        {/* Account Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span className="label-sm">Account</span>
          </div>

          {/* Full Name */}
          <TechCard hover>
            <TechCardContent className="space-y-1.5">
              <Label htmlFor="fullName" className="label-sm">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11 text-base bg-background border border-border focus:border-primary"
              />
            </TechCardContent>
          </TechCard>

          {/* Email (readonly) */}
          <TechCard>
            <TechCardContent className="space-y-1.5">
              <Label className="label-sm">Login Email</Label>
              <div className="py-2.5 px-3 rounded-lg bg-muted text-muted-foreground font-mono text-sm">
                {user?.email}
              </div>
            </TechCardContent>
          </TechCard>
        </motion.section>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-4 bg-gradient-to-t from-background via-background to-transparent z-20">
        <div className="max-w-lg mx-auto">
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full py-6 text-lg font-bold rounded-xl border-2 border-destructive text-destructive hover:bg-destructive/10"
            >
              {isSigningOut ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <LogOut className="w-5 h-5 mr-2" />
              )}
              Sign Out
            </Button>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
