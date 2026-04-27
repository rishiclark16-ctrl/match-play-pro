import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Check, X, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const signUpSchema = z.object({
  email: z.string().trim().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').optional().or(z.literal('')),
});

const signInSchema = z.object({
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#EF4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#F59E0B' };
  if (score <= 3) return { score, label: 'Good', color: '#F0EE3A' };
  return { score, label: 'Strong', color: '#22C55E' };
}

// ─── Cinematic video background ─────────────────────────────────────────────
// Three golf videos crossfade in sequence for a cinematic looping background.
const GOLF_VIDEOS = [
  '/videos/golf-bg-1.mp4',
  '/videos/golf-bg-2.mp4',
  '/videos/golf-bg-3.mp4',
];

const VIDEO_CROSSFADE = 1.8; // seconds for crossfade transition
const CROSSFADE_LEAD = 2.0; // start crossfade this many seconds before video ends

function GolfCanvas() {
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRefs = [
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
  ];
  const transitionScheduled = useRef(false);

  useEffect(() => {
    // Start playing the first video and preload all others
    videoRefs.forEach((ref, i) => {
      const el = ref.current;
      if (!el) return;
      if (i === 0) {
        el.play().catch(() => {});
      } else {
        // Preload by loading enough data
        el.load();
      }
    });

    // Poll timeupdate to start crossfade before current video ends
    const handleTimeUpdate = (index: number) => () => {
      const el = videoRefs[index].current;
      if (!el || transitionScheduled.current) return;
      const remaining = el.duration - el.currentTime;
      if (remaining <= CROSSFADE_LEAD && remaining > 0) {
        transitionScheduled.current = true;
        const nextIdx = (index + 1) % GOLF_VIDEOS.length;
        // Start next video playing underneath before fading
        const nextVideo = videoRefs[nextIdx].current;
        if (nextVideo) {
          nextVideo.currentTime = 0;
          nextVideo.play().catch(() => {});
        }
        setActiveIndex(nextIdx);
      }
    };

    // When video ends, pause it (next is already playing)
    const handleEnded = (index: number) => () => {
      const el = videoRefs[index].current;
      if (el) el.pause();
      transitionScheduled.current = false;
    };

    const cleanups: (() => void)[] = [];
    videoRefs.forEach((ref, i) => {
      const el = ref.current;
      if (el) {
        const tuHandler = handleTimeUpdate(i);
        const endHandler = handleEnded(i);
        el.addEventListener('timeupdate', tuHandler);
        el.addEventListener('ended', endHandler);
        cleanups.push(() => {
          el.removeEventListener('timeupdate', tuHandler);
          el.removeEventListener('ended', endHandler);
        });
      }
    });

    return () => cleanups.forEach((fn) => fn());
    // videoRefs is an array of stable useRefs; wrapping array changes identity each render
    // so we intentionally run this once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {GOLF_VIDEOS.map((src, i) => (
        <motion.video
          key={src}
          ref={videoRefs[i]}
          src={src}
          muted
          playsInline
          preload="auto"
          animate={{ opacity: activeIndex === i ? 1 : 0 }}
          transition={{ duration: VIDEO_CROSSFADE, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ))}

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.15) 65%, rgba(0,0,0,0.8) 100%)',
      }} />

      {/* Subtle vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)',
      }} />
    </div>
  );
}

// ─── Form sheet (sign-up or sign-in) ─────────────────────────────────────────
function FormSheet({
  mode,
  onClose,
  onSwitchMode,
}: {
  mode: 'signup' | 'signin';
  onClose: () => void;
  onSwitchMode: (m: 'signup' | 'signin') => void;
}) {
  const navigate = useNavigate();
  const { signUp, signIn, signInWithApple } = useAuth();
  const isNativeIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordStrength = getPasswordStrength(password);
  const passwordReqs = [
    { met: password.length >= 8, label: '8+ chars' },
    { met: /[A-Z]/.test(password), label: 'Uppercase' },
    { met: /[0-9]/.test(password), label: 'Number' },
  ];

  const spring = { type: 'spring' as const, stiffness: 380, damping: 32 };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    hapticLight();

    const schema = mode === 'signup' ? signUpSchema : signInSchema;
    const data = mode === 'signup'
      ? { email, password, fullName: fullName || undefined }
      : { email, password };

    const result = schema.safeParse(data);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach((e) => { if (e.path[0]) fe[e.path[0] as string] = e.message; });
      setErrors(fe);
      hapticError();
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName || undefined);
        if (error) {
          if (error.message.includes('already registered')) setErrors({ email: 'Email already registered. Try signing in.' });
          else toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
          hapticError();
        } else {
          hapticSuccess();
          toast({ title: 'Account created!', description: 'Welcome to MATCH.' });
          navigate('/', { replace: true });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) setErrors({ password: 'Invalid email or password' });
          else toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
          hapticError();
        } else {
          hapticSuccess();
          toast({ title: 'Welcome back!' });
          navigate('/', { replace: true });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApple = async () => {
    hapticLight();
    setIsAppleLoading(true);
    try {
      const { error } = await signInWithApple();
      if (error && error.message !== 'Sign in cancelled') {
        toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
        hapticError();
      } else if (!error) {
        hapticSuccess();
        navigate('/', { replace: true });
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 340, damping: 38 }}
      className="absolute inset-x-0 bottom-0 z-30 flex flex-col"
      style={{
        background: 'linear-gradient(180deg, rgba(6,12,6,0.97) 0%, rgba(3,7,3,0.99) 100%)',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderTop: '1px solid rgba(240,238,58,0.14)',
        boxShadow: '0 -24px 80px rgba(0,0,0,0.7)',
        maxHeight: '88vh',
      }}
    >
      {/* Drag handle + close */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="w-10 h-[3px] rounded-full bg-[#F0EE3A]/25 mx-auto absolute left-1/2 -translate-x-1/2" />
        <div className="flex-1" />
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.07)' }}
          aria-label="Close"
        >
          <X className="w-4 h-4 text-white/50" />
        </motion.button>
      </div>

      {/* Sheet title */}
      <div className="px-6 pb-4 pt-1">
        <h2 className="text-[22px] font-black text-white tracking-tight">
          {mode === 'signup' ? 'Create account' : 'Welcome back'}
        </h2>
        <p className="text-[13px] text-white/40 mt-0.5">
          {mode === 'signup' ? 'Join thousands of golfers on MATCH' : 'Sign in to your MATCH account'}
        </p>
      </div>

      {/* Apple sign-in — top of sheet */}
      {isNativeIOS && (
        <div className="px-6 pb-4">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleApple}
            disabled={isSubmitting || isAppleLoading}
            className="w-full h-[52px] rounded-[16px] font-semibold text-[15px] flex items-center justify-center gap-2.5 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.93)', color: '#030703' }}
          >
            {isAppleLoading
              ? <div className="w-5 h-5 rounded-full border-2 border-[#030703]/20 border-t-[#030703] animate-spin" />
              : <>
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span>Continue with Apple</span>
                </>
            }
          </motion.button>

          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>
        </div>
      )}

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-safe">
        <form onSubmit={handleSubmit} className="flex flex-col gap-0">

          {/* Full Name — signup only */}
          <AnimatePresence initial={false}>
            {mode === 'signup' && (
              <motion.div
                key="name"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <FieldInput id="fullName" type="text" label="Full Name" placeholder="John Smith"
                  value={fullName} onChange={(e) => setFullName(e.target.value)}
                  disabled={isSubmitting} error={errors.fullName} autoComplete="name" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mb-3">
            <FieldInput id="email" type="email" label="Email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting} error={errors.email} autoComplete="email" />
          </div>

          <div className="mb-3">
            <FieldInput
              id="password" type={showPassword ? 'text' : 'password'} label="Password"
              placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting} error={errors.password}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              suffix={
                <motion.button type="button" whileTap={{ scale: 0.82 }} tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-white/25 hover:text-white/55 transition-colors p-1.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </motion.button>
              }
            />
          </div>

          {/* Password strength */}
          <AnimatePresence>
            {mode === 'signup' && password.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-3"
              >
                <div className="flex gap-1 mb-2">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div key={i} className="h-[3px] flex-1 rounded-full"
                      animate={{ backgroundColor: passwordStrength.score > i ? passwordStrength.color : 'rgba(255,255,255,0.08)' }}
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {passwordReqs.map((r) => (
                    <motion.span key={r.label}
                      animate={{
                        backgroundColor: r.met ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                        borderColor: r.met ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.06)',
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    >
                      {r.met ? <Check className="w-2.5 h-2.5 text-[#22C55E]" /> : <X className="w-2.5 h-2.5 text-white/20" />}
                      <span className={r.met ? 'text-[#22C55E]' : 'text-white/30'}>{r.label}</span>
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={isSubmitting || isAppleLoading}
            className="relative w-full h-[54px] rounded-[18px] font-black text-[15px] flex items-center justify-center gap-2 mt-1 overflow-hidden disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #F0EE3A 0%, #d4d120 100%)',
              color: '#030703',
              boxShadow: '0 4px 32px rgba(240,238,58,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            {/* Shimmer */}
            <motion.div className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.28) 50%, transparent 62%)' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 3.2, ease: 'easeInOut' }}
            />
            <AnimatePresence mode="wait">
              {isSubmitting
                ? <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="w-5 h-5 rounded-full border-2 border-[#030703]/25 border-t-[#030703] animate-spin" />
                  </motion.div>
                : <motion.div key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
              }
            </AnimatePresence>
          </motion.button>

          {/* Switch mode */}
          <p className="text-center text-[12.5px] mt-4 pb-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
            {mode === 'signup'
              ? <>Already have an account?{' '}<button type="button" onClick={() => onSwitchMode('signin')} className="font-bold" style={{ color: 'rgba(255,255,255,0.65)' }}>Sign in</button></>
              : <>Don&apos;t have an account?{' '}<button type="button" onClick={() => onSwitchMode('signup')} className="font-bold" style={{ color: 'rgba(255,255,255,0.65)' }}>Sign up</button></>
            }
          </p>

          <p className="text-center text-[10px] mt-2 pb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.18)' }}>
            By continuing, you agree to our{' '}
            <a href="/terms-of-service" className="underline" style={{ color: 'rgba(255,255,255,0.35)' }}>Terms</a>
            {' '}and{' '}
            <a href="/privacy-policy" className="underline" style={{ color: 'rgba(255,255,255,0.35)' }}>Privacy Policy</a>
          </p>
        </form>
      </div>
    </motion.div>
  );
}

// ─── Field Input ──────────────────────────────────────────────────────────────
function FieldInput({ id, type, label, placeholder, value, onChange, disabled, error, autoComplete, suffix }: {
  id: string; type: string; label: string; placeholder: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean; error?: string; autoComplete?: string; suffix?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5 transition-colors"
        style={{ color: focused ? 'rgba(240,238,58,0.65)' : 'rgba(255,255,255,0.28)' }}>
        {label}
      </label>
      <div className="relative flex items-center rounded-[14px] transition-all duration-200" style={{
        background: focused ? 'rgba(240,238,58,0.04)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${error ? 'rgba(239,68,68,0.55)' : focused ? 'rgba(240,238,58,0.4)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: focused ? '0 0 0 3px rgba(240,238,58,0.07)' : 'none',
      }}>
        <input id={id} type={type} placeholder={placeholder} value={value} onChange={onChange}
          disabled={disabled} autoComplete={autoComplete}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent px-4 py-[14px] text-[15px] font-medium text-white placeholder:text-white/18 focus:outline-none disabled:opacity-40"
        />
        {suffix && <div className="pr-2">{suffix}</div>}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="text-[11px] text-[#EF4444] font-medium mt-1 flex items-center gap-1">
            <X className="w-3 h-3 flex-shrink-0" />{error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [sheet, setSheet] = useState<null | 'signup' | 'signin'>(null);

  useEffect(() => {
    if (!authLoading && user) navigate('/', { replace: true });
  }, [user, authLoading, navigate]);

  const spring = { type: 'spring' as const, stiffness: 380, damping: 34 };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020704] flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={spring}
          className="flex flex-col items-center gap-5">
          <img src="/app-icon.png" alt="MATCH" className="w-20 h-20 rounded-[28px]" />
          <div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-[#F0EE3A] animate-spin" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#020704] overflow-hidden relative">

      {/* Full-screen animated golf scene */}
      <GolfCanvas />

      {/* Landing content */}
      <AnimatePresence>
        {!sheet && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-10 flex flex-col"
          >
            {/* Brand — vertically centered in top ~60% */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 pb-12">

              {/* Wordmark */}
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.15 }}
                className="text-[64px] font-black tracking-[-0.06em] text-white leading-none"
                style={{ textShadow: '0 4px 60px rgba(240,238,58,0.15)' }}
              >
                MATCH
              </motion.h1>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.2 }}
                className="text-[12px] font-medium tracking-[0.28em] uppercase mt-3"
                style={{ color: 'rgba(255,255,255,0.38)' }}
              >
                Play. Compete. Win.
              </motion.p>
            </div>

            {/* Bottom actions — SENA-style */}
            <div className="px-6 pb-safe flex flex-col items-center gap-3">

              {/* Create account — outlined */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.28 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { hapticLight(); setSheet('signup'); }}
                className="w-full h-[56px] rounded-[18px] font-semibold text-[16px] text-white flex items-center justify-center"
                style={{ border: '1.5px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}
              >
                Create account
              </motion.button>

              {/* Sign in — text */}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.34 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => { hapticLight(); setSheet('signin'); }}
                className="h-[48px] px-8 font-medium text-[16px]"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                Sign in
              </motion.button>

              {/* Legal */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="text-center text-[10px] leading-relaxed pb-4"
                style={{ color: 'rgba(255,255,255,0.18)' }}
              >
                By continuing you agree to our{' '}
                <a href="/terms-of-service" className="underline" style={{ color: 'rgba(255,255,255,0.35)' }}>Terms</a>
                {' '}and{' '}
                <a href="/privacy-policy" className="underline" style={{ color: 'rgba(255,255,255,0.35)' }}>Privacy Policy</a>
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop dim when sheet open */}
      <AnimatePresence>
        {sheet && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={() => setSheet(null)}
          />
        )}
      </AnimatePresence>

      {/* Form sheet */}
      <AnimatePresence>
        {sheet && (
          <FormSheet
            key={sheet}
            mode={sheet}
            onClose={() => setSheet(null)}
            onSwitchMode={(m) => setSheet(m)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
