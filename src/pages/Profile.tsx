import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, LogOut, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { HomeCourseSelector } from '@/components/profile/HomeCourseSelector';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, ProfileUpdate } from '@/hooks/useProfile';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TEE_OPTIONS = [
  { value: 'back', label: 'Back', color: 'bg-slate-900 text-white' },
  { value: 'blue', label: 'Blue', color: 'bg-blue-600 text-white' },
  { value: 'white', label: 'White', color: 'bg-white text-gray-900 border border-gray-300' },
  { value: 'gold', label: 'Gold', color: 'bg-yellow-500 text-gray-900' },
  { value: 'red', label: 'Red', color: 'bg-red-600 text-white' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, loading, updateProfile, uploadAvatar } = useProfile();

  const [fullName, setFullName] = useState('');
  const [handicap, setHandicap] = useState('');
  const [teePreference, setTeePreference] = useState<string | null>(null);
  const [homeCourseId, setHomeCourseId] = useState<string | null>(null);
  const [homeCourseName, setHomeCourseName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setHandicap(profile.handicap?.toString() || '');
      setTeePreference(profile.tee_preference);
      setHomeCourseId(profile.home_course_id);
      setHomeCourseName(profile.home_course_name);
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (!profile) return;
    
    const changed =
      fullName !== (profile.full_name || '') ||
      handicap !== (profile.handicap?.toString() || '') ||
      teePreference !== profile.tee_preference ||
      homeCourseId !== profile.home_course_id;
    
    setHasChanges(changed);
  }, [fullName, handicap, teePreference, homeCourseId, profile]);

  const handleSave = async () => {
    setIsSaving(true);
    hapticLight();

    const updates: ProfileUpdate = {
      full_name: fullName.trim() || null,
      handicap: handicap ? parseFloat(handicap) : null,
      tee_preference: teePreference,
      home_course_id: homeCourseId,
      home_course_name: homeCourseName,
    };

    const success = await updateProfile(updates);

    if (success) {
      hapticSuccess();
      toast.success('Profile saved');
      setHasChanges(false);
    } else {
      hapticError();
      toast.error('Failed to save profile');
    }

    setIsSaving(false);
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 safe-top flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-card flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold flex-1">Profile</h1>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 pb-32 overflow-auto">
        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-8"
        >
          <AvatarUpload
            avatarUrl={profile?.avatar_url || null}
            fullName={profile?.full_name || null}
            onUpload={handleAvatarUpload}
            size="lg"
          />
          <p className="mt-3 text-lg font-semibold">{profile?.full_name || 'Add your name'}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </motion.div>

        {/* Golf Info Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 mb-8"
        >
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Golf Info
          </h2>

          {/* Handicap */}
          <div className="space-y-2">
            <Label htmlFor="handicap">Handicap Index</Label>
            <Input
              id="handicap"
              type="number"
              step="0.1"
              placeholder="e.g. 12.4"
              value={handicap}
              onChange={(e) => setHandicap(e.target.value)}
              className="py-6 text-lg"
            />
          </div>

          {/* Home Course */}
          <div className="space-y-2">
            <Label>Home Course</Label>
            <HomeCourseSelector
              courseId={homeCourseId}
              courseName={homeCourseName}
              onSelect={handleHomeCourseSelect}
              onClear={handleHomeCourseClear}
            />
          </div>

          {/* Tee Preference */}
          <div className="space-y-2">
            <Label>Preferred Tees</Label>
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
                    'px-4 py-2 rounded-lg font-medium text-sm transition-all',
                    tee.color,
                    teePreference === tee.value
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                      : 'opacity-60 hover:opacity-100'
                  )}
                >
                  {tee.label}
                </button>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Account Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 mb-8"
        >
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Account
          </h2>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="py-6 text-lg"
            />
          </div>

          {/* Email (readonly) */}
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="py-4 px-4 rounded-xl bg-muted text-muted-foreground">
              {user?.email}
            </div>
          </div>
        </motion.section>
      </main>

      {/* Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent safe-bottom">
        <div className="space-y-3">
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="w-full py-6 text-lg font-semibold rounded-xl"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              Save Changes
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full py-6 text-lg font-semibold rounded-xl border-destructive text-destructive hover:bg-destructive/10"
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
    </div>
  );
}
