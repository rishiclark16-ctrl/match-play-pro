import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ChevronRight, Check } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { HomeCourseSelector } from '@/components/profile/HomeCourseSelector';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const TEE_OPTIONS = [
  { label: 'Black', color: 'bg-[#1a1a1a]' },
  { label: 'Blue', color: 'bg-blue-600' },
  { label: 'White', color: 'bg-white border border-gray-300' },
  { label: 'Gold', color: 'bg-yellow-500' },
  { label: 'Red', color: 'bg-red-500' },
];

const STEPS = ['photo', 'handicap', 'tees', 'course'] as const;
type OnboardingStep = typeof STEPS[number];

export default function Onboarding() {
  const navigate = useNavigate();
  const { updateProfile, uploadAvatar } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [handicap, setHandicap] = useState('');
  const [teePreference, setTeePreference] = useState('');
  const [homeCourseId, setHomeCourseId] = useState<string | null>(null);
  const [homeCourseName, setHomeCourseName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const step: OnboardingStep = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    hapticLight();
    // Preview immediately
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    await uploadAvatar(file);
    hapticSuccess();
    setUploading(false);
  };

  const finish = async () => {
    setSaving(true);
    const updates: Record<string, any> = { has_onboarded: true };
    if (handicap !== '') updates.handicap = Number(handicap);
    if (teePreference) updates.tee_preference = teePreference;
    if (homeCourseId) updates.home_course_id = homeCourseId;
    if (homeCourseName) updates.home_course_name = homeCourseName;
    await updateProfile(updates);
    setSaving(false);
    navigate('/', { replace: true, state: { showTutorial: true, fromOnboarding: true } });
  };

  const handleContinue = () => {
    hapticLight();
    if (isLastStep) {
      finish();
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    hapticLight();
    if (isLastStep) {
      finish();
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

  return (
    <div className="h-screen flex flex-col bg-[#F8F8F6]">
      {/* Progress bar + skip all */}
      <header className="flex-shrink-0 px-6 pt-safe-content pb-4">
        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i <= currentStep ? 'bg-foreground w-6' : 'bg-muted w-3'
                )}
              />
            ))}
          </div>
          <button
            onClick={handleSkip}
            className="text-[13px] font-bold text-muted-foreground py-1 px-2"
          >
            {isLastStep ? 'Skip' : 'Skip'}
          </button>
        </div>
      </header>

      {/* Step content */}
      <main className="flex-1 overflow-y-auto px-6">
        <AnimatePresence mode="wait">

          {/* ── Step 1: Photo ── */}
          {step === 'photo' && (
            <motion.div
              key="photo"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={spring}
              className="flex flex-col pt-4"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                Step 1 of 4
              </p>
              <h1 className="text-[30px] font-black tracking-[-0.03em] text-foreground leading-tight mb-3">
                Add a profile photo
              </h1>
              <p className="text-[15px] text-muted-foreground leading-relaxed mb-10">
                Your group sees this during rounds. You can change it anytime.
              </p>

              <div className="flex justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="relative"
                >
                  <div className={cn(
                    'w-36 h-36 rounded-full overflow-hidden flex items-center justify-center transition-colors',
                    avatarPreview
                      ? 'border-2 border-foreground'
                      : 'border-2 border-dashed border-border bg-white'
                  )}>
                    {avatarPreview ? (
                      <img src={avatarPreview} className="w-full h-full object-cover" alt="Profile" />
                    ) : uploading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Camera className="w-8 h-8 text-muted-foreground" />
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tap to add</span>
                      </div>
                    )}
                  </div>
                  {/* Edit badge when photo is set */}
                  {avatarPreview && (
                    <div className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-foreground flex items-center justify-center border-2 border-[#F8F8F6]">
                      <Camera className="w-4 h-4 text-background" />
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Handicap ── */}
          {step === 'handicap' && (
            <motion.div
              key="handicap"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={spring}
              className="flex flex-col pt-4"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                Step 2 of 4
              </p>
              <h1 className="text-[30px] font-black tracking-[-0.03em] text-foreground leading-tight mb-3">
                What's your handicap?
              </h1>
              <p className="text-[15px] text-muted-foreground leading-relaxed mb-10">
                Used to calculate strokes per hole during rounds. You can update it anytime.
              </p>

              <div className="bg-white rounded-2xl border-2 border-foreground/10 focus-within:border-foreground px-5 py-4 transition-colors">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Handicap Index
                </p>
                <input
                  type="number"
                  value={handicap}
                  onChange={e => setHandicap(e.target.value)}
                  placeholder="0.0"
                  min="-5"
                  max="54"
                  step="0.1"
                  autoFocus
                  className="w-full text-[36px] font-black text-foreground bg-transparent outline-none placeholder:text-muted-foreground/30 tabular-nums"
                />
              </div>
              <p className="text-[12px] text-muted-foreground mt-2 ml-1">Range: -5 to 54</p>
            </motion.div>
          )}

          {/* ── Step 3: Tee Preference ── */}
          {step === 'tees' && (
            <motion.div
              key="tees"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={spring}
              className="flex flex-col pt-4"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                Step 3 of 4
              </p>
              <h1 className="text-[30px] font-black tracking-[-0.03em] text-foreground leading-tight mb-3">
                Which tees do you play?
              </h1>
              <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">
                Your default tee box. This is just a preference — you can change it per round.
              </p>

              <div className="flex flex-col gap-3">
                {TEE_OPTIONS.map(({ label, color }) => {
                  const selected = teePreference === label;
                  return (
                    <motion.button
                      key={label}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { hapticLight(); setTeePreference(label); }}
                      className={cn(
                        'w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-colors',
                        selected ? 'bg-foreground border-foreground' : 'bg-white border-border/40'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('w-4 h-4 rounded-full flex-shrink-0', color)} />
                        <span className={cn('text-[16px] font-bold', selected ? 'text-background' : 'text-foreground')}>
                          {label}
                        </span>
                      </div>
                      {selected && <Check className="w-5 h-5 text-background" />}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Home Course ── */}
          {step === 'course' && (
            <motion.div
              key="course"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={spring}
              className="flex flex-col pt-4"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                Step 4 of 4
              </p>
              <h1 className="text-[30px] font-black tracking-[-0.03em] text-foreground leading-tight mb-3">
                Where do you play?
              </h1>
              <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">
                Your home course. Shown on your profile and pre-filled when starting a round.
              </p>

              <HomeCourseSelector
                courseId={homeCourseId}
                courseName={homeCourseName}
                onSelect={(id, name) => { setHomeCourseId(id); setHomeCourseName(name); hapticLight(); }}
                onClear={() => { setHomeCourseId(null); setHomeCourseName(null); }}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Bottom CTA */}
      <div className="flex-shrink-0 px-6 pb-safe pt-4 border-t border-border/20 bg-[#F8F8F6]">
        <div className="flex gap-3 pb-2">
          {/* Back button */}
          {currentStep > 0 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { hapticLight(); setCurrentStep(s => s - 1); }}
              className="w-14 h-[54px] rounded-2xl bg-muted flex items-center justify-center text-foreground font-bold text-[18px]"
            >
              ←
            </motion.button>
          )}

          {/* Continue / Finish */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleContinue}
            disabled={saving || uploading}
            className="flex-1 bg-foreground text-background rounded-2xl h-[54px] font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {saving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-5 h-5 rounded-full border-2 border-background border-t-transparent"
              />
            ) : isLastStep ? (
              <>
                <Check className="w-5 h-5" />
                <span>Start Playing!</span>
              </>
            ) : (
              <>
                <span>Next</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </div>

      </div>
    </div>
  );
}
