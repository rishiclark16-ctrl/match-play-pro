import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper, { Area } from 'react-easy-crop';
import { Camera, ChevronRight, Check, X, ZoomIn } from 'lucide-react';
import { useProfile, ProfileUpdate } from '@/hooks/useProfile';
import { HomeCourseSelector } from '@/components/profile/HomeCourseSelector';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { cn } from '@/lib/utils';

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

  // Crop state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const step: OnboardingStep = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

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
      await uploadAvatar(croppedFile);
      hapticSuccess();
      URL.revokeObjectURL(blobUrl);
    } finally {
      setUploading(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    const updates: ProfileUpdate = { has_onboarded: true };
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
            {isLastStep ? 'Finish' : 'Skip'}
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
                  inputMode="decimal"
                  aria-label="Handicap index"
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

      {/* Crop Modal */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm pt-safe-content">
            <button
              onClick={handleCropCancel}
              className="flex items-center gap-1.5 text-white/80 active:text-white/50 text-sm font-medium py-2 px-1"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
            <p className="text-white font-bold text-sm">Move and Scale</p>
            <button
              onClick={handleCropSave}
              className="flex items-center gap-1.5 text-[#F0EE3A] active:text-[#F0EE3A]/50 text-sm font-bold py-2 px-1"
            >
              <Check className="w-5 h-5" />
              Choose
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
                cropAreaStyle: { borderRadius: '20px', border: '2px solid rgba(255,255,255,0.6)' },
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
              className="flex-1 h-1 appearance-none bg-white/20 rounded-full outline-none
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>
        </div>
      )}
    </div>
  );
}
