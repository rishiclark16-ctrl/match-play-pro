import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper, { Area } from 'react-easy-crop';
import { Camera, ChevronRight, Check, X, ZoomIn, Phone, User, ArrowLeft } from 'lucide-react';
import { useProfile, ProfileUpdate } from '@/hooks/useProfile';
import { HomeCourseSelector } from '@/components/profile/HomeCourseSelector';
import { OnboardingStep, OnboardingIntro, OnboardingField, OnboardingProgress, onboardingInputClass } from '@/components/onboarding/OnboardingParts';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { validatePlayerName, normalizePhone } from '@/lib/validation';

async function getCroppedFile(imageSrc: string, cropArea: Area, fileName: string): Promise<File> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, cropArea.x, cropArea.y, cropArea.width, cropArea.height, 0, 0, 512, 512);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Canvas toBlob failed'));
        resolve(new File([blob], fileName, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9,
    );
  });
}

const TEE_OPTIONS = [
  { label: 'Black', color: 'bg-[#1a1a1a]' },
  { label: 'Blue', color: 'bg-blue-600' },
  { label: 'White', color: 'bg-white ring-1 ring-inset ring-border-strong' },
  { label: 'Gold', color: 'bg-yellow-500' },
  { label: 'Red', color: 'bg-red-500' },
];

const STEPS = ['name', 'photo', 'phone', 'handicap', 'tees', 'course'] as const;
type OnboardingStep = typeof STEPS[number];

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, updateProfile, uploadAvatar } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [handicap, setHandicap] = useState('');
  const [teePreference, setTeePreference] = useState('');
  const [homeCourseId, setHomeCourseId] = useState<string | null>(null);
  const [homeCourseName, setHomeCourseName] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Crop state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const step: OnboardingStep = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  // Pre-fill the name from the existing profile (Apple/email signups already
  // have one). Users whose name never came through can set it here.
  const namePrefilled = useRef(false);
  useEffect(() => {
    if (!namePrefilled.current && profile?.full_name) {
      setName(profile.full_name);
      namePrefilled.current = true;
    }
  }, [profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    hapticLight();
    const reader = new FileReader();
    reader.onload = ev => {
      setCropImageSrc(ev.target?.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const handleCropCancel = () => {
    setCropImageSrc(null);
    setCroppedArea(null);
  };

  const handleCropSave = async () => {
    if (!cropImageSrc || !croppedArea) return;
    setUploading(true);
    try {
      const croppedFile = await getCroppedFile(cropImageSrc, croppedArea, `avatar-${Date.now()}.jpg`);
      const blobUrl = URL.createObjectURL(croppedFile);
      setAvatarPreview(blobUrl);
      setCropImageSrc(null);

      // Upload in background — don't block the user from continuing
      uploadAvatar(croppedFile).then((url) => {
        if (url) {
          // Revoke blob URL once the real URL is saved
          URL.revokeObjectURL(blobUrl);
          hapticSuccess();
        }
      }).catch(() => {
        // Upload failed but user already has a local preview — they can continue.
        // The avatar just won't be saved server-side. They can re-upload from profile later.
        toast.error('Photo upload failed — you can re-upload from your profile later');
        hapticError();
      });
    } catch {
      toast.error('Failed to crop photo. Please try again.');
      hapticError();
    } finally {
      setUploading(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      const updates: ProfileUpdate = { has_onboarded: true };
      const trimmedName = name.trim();
      if (trimmedName) updates.full_name = trimmedName;
      if (handicap !== '') updates.handicap = Number(handicap);
      if (teePreference) updates.tee_preference = teePreference;
      if (homeCourseId) updates.home_course_id = homeCourseId;
      if (homeCourseName) updates.home_course_name = homeCourseName;
      const phoneDigits = normalizePhone(phone);
      if (phoneDigits) updates.phone = phoneDigits;
      const success = await updateProfile(updates);
      if (!success) {
        toast.error('Failed to save profile. Please try again.');
        hapticError();
        setSaving(false);
        return;
      }
      hapticSuccess();
      sessionStorage.setItem('onboarded', '1');
      navigate('/', { replace: true, state: { showTutorial: true, fromOnboarding: true } });
    } catch {
      toast.error('Something went wrong. Please try again.');
      hapticError();
      setSaving(false);
    }
  };

  const handleContinue = () => {
    hapticLight();
    if (step === 'name') {
      const result = validatePlayerName(name.trim());
      if (!result.success) {
        toast.error(result.error || 'Please enter a valid name');
        hapticError();
        return;
      }
    }
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

  const total = STEPS.length;
  const stepNo = currentStep + 1;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Progress bar + skip */}
      <header className="flex-shrink-0 px-5 pt-safe-content pb-3">
        <div className="flex items-center justify-between gap-4 h-11">
          <OnboardingProgress total={total} current={currentStep} />
          {step !== 'name' && (
            <button
              onClick={handleSkip}
              className="h-11 px-3 -mr-3 text-[14px] font-semibold text-muted-foreground"
            >
              {isLastStep ? 'Finish' : 'Skip'}
            </button>
          )}
        </div>
      </header>

      {/* Step content */}
      <main className="flex-1 overflow-y-auto px-5">
        <AnimatePresence mode="wait">

          {/* ── Step 1: Name ── */}
          {step === 'name' && (
            <OnboardingStep key="name" stepKey="name">
              <OnboardingIntro step={stepNo} total={total} title="What's your name?" body="This is how friends find and recognize you. A first name is fine." />
              <OnboardingField label="Name" hint="Friends search for you by name" icon={<User className="w-5 h-5 text-primary flex-shrink-0" />}>
                <input
                  type="text"
                  aria-label="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  autoFocus
                  autoComplete="name"
                  maxLength={50}
                  className={cn(onboardingInputClass, 'text-[24px]')}
                />
              </OnboardingField>
            </OnboardingStep>
          )}

          {/* ── Step 2: Photo ── */}
          {step === 'photo' && (
            <OnboardingStep key="photo" stepKey="photo">
              <OnboardingIntro step={stepNo} total={total} title="Add a profile photo" body="Your group sees this during rounds. You can always add one later." />
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={avatarPreview ? 'Change profile photo' : 'Add profile photo'}
                  className="relative"
                >
                  <div className={cn(
                    'w-40 h-40 rounded-[28px] overflow-hidden flex items-center justify-center transition-colors',
                    avatarPreview ? 'bg-card' : 'bg-card border-2 border-dashed border-border-strong'
                  )}>
                    {avatarPreview ? (
                      <img src={avatarPreview} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                      <div className="flex flex-col items-center gap-2.5">
                        <div className="w-14 h-14 rounded-[18px] bg-primary/10 flex items-center justify-center">
                          <Camera className="w-7 h-7 text-primary" />
                        </div>
                        <span className="text-[13px] font-semibold text-muted-foreground">Tap to add</span>
                      </div>
                    )}
                  </div>
                  {avatarPreview && (
                    <div className="absolute -bottom-1 -right-1 w-11 h-11 rounded-full bg-ink flex items-center justify-center ring-4 ring-background">
                      <Camera className="w-[18px] h-[18px] text-white" />
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
            </OnboardingStep>
          )}

          {/* ── Step 3: Phone ── */}
          {step === 'phone' && (
            <OnboardingStep key="phone" stepKey="phone">
              <OnboardingIntro step={stepNo} total={total} title="What's your number?" body="Friends can find you by phone number. This won't be shared publicly." />
              <OnboardingField label="Phone number" hint="Helps your group find you" icon={<Phone className="w-5 h-5 text-primary flex-shrink-0" />}>
                <input
                  type="tel"
                  inputMode="tel"
                  aria-label="Phone number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  autoFocus
                  className={cn(onboardingInputClass, 'text-[24px] tabular-nums')}
                />
              </OnboardingField>
            </OnboardingStep>
          )}

          {/* ── Step 4: Handicap ── */}
          {step === 'handicap' && (
            <OnboardingStep key="handicap" stepKey="handicap">
              <OnboardingIntro step={stepNo} total={total} title="What's your handicap?" body="Used to calculate strokes per hole during rounds. You can update it anytime." />
              <OnboardingField label="Handicap index" hint="Range: -5 to 54">
                <input
                  type="number"
                  inputMode="decimal"
                  aria-label="Handicap index"
                  value={handicap}
                  onChange={e => setHandicap(e.target.value)}
                  placeholder="0.0"
                  min="-5"
                  max="54"
                  step="0.1"
                  autoFocus
                  className={cn(onboardingInputClass, 'text-[52px] leading-none tracking-[-0.04em] tabular-nums')}
                />
              </OnboardingField>
            </OnboardingStep>
          )}

          {/* ── Step 5: Tee Preference ── */}
          {step === 'tees' && (
            <OnboardingStep key="tees" stepKey="tees">
              <OnboardingIntro step={stepNo} total={total} title="Which tees do you play?" body="Your default tee box. This is just a preference — you can change it per round." />
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Tee preference">
                {TEE_OPTIONS.map(({ label, color }) => {
                  const selected = teePreference === label;
                  return (
                    <motion.button
                      key={label}
                      role="radio"
                      aria-checked={selected}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { hapticLight(); setTeePreference(label); }}
                      className={cn(
                        'w-full h-14 flex items-center justify-between px-4 rounded-[20px] border transition-colors',
                        selected ? 'bg-primary border-primary' : 'bg-card border-border'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('w-5 h-5 rounded-full flex-shrink-0', color, selected && 'ring-2 ring-white/70')} />
                        <span className={cn('text-[16px] font-semibold', selected ? 'text-white' : 'text-foreground')}>
                          {label}
                        </span>
                      </div>
                      {selected
                        ? <span className="w-6 h-6 rounded-full bg-gold flex items-center justify-center"><Check className="w-4 h-4 text-gold-foreground" strokeWidth={3} /></span>
                        : <span className="w-6 h-6 rounded-full border-2 border-border-strong" />}
                    </motion.button>
                  );
                })}
              </div>
            </OnboardingStep>
          )}

          {/* ── Step 6: Home Course ── */}
          {step === 'course' && (
            <OnboardingStep key="course" stepKey="course">
              <OnboardingIntro step={stepNo} total={total} title="Where do you play?" body="Your home course. Shown on your profile and pre-filled when starting a round." />
              <div className="bg-card border border-border rounded-[20px] px-4 py-2 flex items-center justify-between gap-3">
                <span className="text-[15px] font-semibold text-foreground">Home course</span>
                <HomeCourseSelector
                  courseId={homeCourseId}
                  courseName={homeCourseName}
                  onSelect={(id, name) => { setHomeCourseId(id); setHomeCourseName(name); hapticLight(); }}
                  onClear={() => { setHomeCourseId(null); setHomeCourseName(null); }}
                />
              </div>
            </OnboardingStep>
          )}

        </AnimatePresence>
      </main>

      {/* Bottom CTA */}
      <div className="flex-shrink-0 px-5 pb-safe pt-3 bg-background">
        <div className="flex gap-2 pb-3">
          {currentStep > 0 && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { hapticLight(); setCurrentStep(s => s - 1); }}
              aria-label="Back"
              className="w-[60px] h-[60px] rounded-[20px] bg-muted flex items-center justify-center text-foreground flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            disabled={saving || (step === 'name' && !name.trim())}
            className="flex-1 bg-ink text-ink-foreground rounded-[20px] h-[60px] font-bold text-[16px] flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {saving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-5 h-5 rounded-full border-2 border-white border-t-transparent"
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

      {/* Crop Modal */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm pt-safe-content">
            <button
              onClick={handleCropCancel}
              className="flex items-center gap-1.5 text-white/80 active:text-white/50 text-[15px] font-medium h-11 px-1"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
            <p className="text-white font-semibold text-[15px]">Move and scale</p>
            <button
              onClick={handleCropSave}
              disabled={uploading}
              className="flex items-center gap-1.5 bg-gold text-gold-foreground text-[15px] font-bold h-10 px-4 rounded-full disabled:opacity-50"
            >
              {uploading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-4 h-4 rounded-full border-2 border-gold-foreground border-t-transparent"
                />
              ) : (
                <Check className="w-4 h-4" strokeWidth={3} />
              )}
              {uploading ? 'Saving…' : 'Choose'}
            </button>
          </div>
          <div className="relative flex-1">
            <Cropper
              image={cropImageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { background: '#000' },
                cropAreaStyle: { borderRadius: '28px', border: '2px solid rgba(255,255,255,0.6)' },
              }}
            />
          </div>
          <div className="flex items-center gap-3 px-8 py-5 pb-10 bg-black/80 backdrop-blur-sm">
            <ZoomIn className="w-4 h-4 text-white/50 shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="flex-1 h-1 appearance-none bg-white/20 rounded-full outline-none
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>
        </div>
      )}
    </div>
  );
}
