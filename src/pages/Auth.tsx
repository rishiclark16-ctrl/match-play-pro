import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Eye, EyeOff, Loader2, Check, X, ArrowRight } from 'lucide-react';
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
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').optional().or(z.literal('')),
});

const signInSchema = z.object({
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Password strength ────────────────────────────────────────────────────────
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

// ─── Animated golf course SVG background ─────────────────────────────────────
function GolfBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Deep gradient sky */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0f1a0d] to-[#0A0A0A]" />

      {/* Subtle grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Rolling hills silhouette */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 390 280"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Far hills */}
        <path
          d="M0 220 Q60 160 120 180 Q180 200 240 155 Q300 110 360 145 L390 140 L390 280 L0 280 Z"
          fill="#0d1f0b"
          opacity="0.7"
        />
        {/* Mid fairway */}
        <path
          d="M0 245 Q50 210 110 225 Q170 240 230 200 Q290 160 360 185 L390 180 L390 280 L0 280 Z"
          fill="#0f2410"
          opacity="0.85"
        />
        {/* Foreground rough */}
        <path
          d="M0 265 Q80 250 150 258 Q220 266 280 245 Q330 230 390 248 L390 280 L0 280 Z"
          fill="#122813"
        />
        {/* Flag pin */}
        <motion.g
          animate={{ rotate: [-2, 2, -2] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '260px 190px' }}
        >
          <line x1="260" y1="185" x2="260" y2="215" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />
          <path d="M260 185 L272 190 L260 195 Z" fill="#F0EE3A" opacity="0.9" />
        </motion.g>
        {/* Golf ball */}
        <circle cx="200" cy="248" r="3" fill="white" opacity="0.5" />
      </svg>

      {/* Animated dot particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 h-0.5 rounded-full bg-white/20"
          style={{
            left: `${12 + i * 11}%`,
            top: `${15 + (i % 3) * 12}%`,
          }}
          animate={{
            y: [0, -8, 0],
            opacity: [0.15, 0.4, 0.15],
          }}
          transition={{
            duration: 3 + i * 0.4,
            repeat: Infinity,
            delay: i * 0.3,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Glow behind logo */}
      <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-[#F0EE3A]/5 blur-3xl pointer-events-none" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signUp, signIn, signInWithApple } = useAuth();
  const isNativeIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAppleSigningIn, setIsAppleSigningIn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && user) navigate('/', { replace: true });
  }, [user, authLoading, navigate]);

  const passwordStrength = getPasswordStrength(password);
  const passwordRequirements = [
    { met: password.length >= 8, label: '8+ chars' },
    { met: /[A-Z]/.test(password), label: 'Uppercase' },
    { met: /[0-9]/.test(password), label: 'Number' },
  ];

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
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      hapticError();
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName || undefined);
        if (error) {
          if (error.message.includes('already registered')) {
            setErrors({ email: 'This email is already registered. Try signing in.' });
          } else {
            toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
          }
          hapticError();
        } else {
          hapticSuccess();
          toast({ title: 'Account created!', description: 'Welcome to MATCH.' });
          navigate('/', { replace: true });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            setErrors({ password: 'Invalid email or password' });
          } else {
            toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
          }
          hapticError();
        } else {
          hapticSuccess();
          toast({ title: 'Welcome back!', description: 'You are now signed in.' });
          navigate('/', { replace: true });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (next: 'signup' | 'signin') => {
    if (next === mode) return;
    setMode(next);
    setErrors({});
    setEmail('');
    setPassword('');
    setFullName('');
    hapticLight();
  };

  const handleAppleSignIn = async () => {
    hapticLight();
    setIsAppleSigningIn(true);
    try {
      const { error } = await signInWithApple();
      if (error) {
        if (error.message !== 'Sign in cancelled') {
          toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
          hapticError();
        }
      } else {
        hapticSuccess();
        navigate('/', { replace: true });
      }
    } finally {
      setIsAppleSigningIn(false);
    }
  };

  const spring = { type: 'spring' as const, stiffness: 380, damping: 32 };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 80 80" fill="none">
              <path d="M16 58 L16 22 L40 46 L64 22 L64 58" stroke="#0A0A0A" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0A] overflow-hidden relative">
      {/* ── Hero background ──────────────────────────────────────────────── */}
      <GolfBackground />

      {/* ── Hero content (top ~48%) ──────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-4 pt-safe-content">
        {/* M Logo */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="w-[72px] h-[72px] rounded-[22px] bg-white shadow-[0_0_40px_rgba(240,238,58,0.25)] flex items-center justify-center mb-5"
        >
          <svg width="36" height="36" viewBox="0 0 80 80" fill="none">
            <path d="M16 58 L16 22 L40 46 L64 22 L64 58" stroke="#0A0A0A" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>

        {/* Wordmark */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="text-[48px] font-black tracking-[-0.06em] text-white leading-none"
        >
          MATCH
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
          className="text-[13px] font-semibold text-white/40 tracking-[0.16em] uppercase mt-2"
        >
          Premium Golf Scoring
        </motion.p>

        {/* Accent pills */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.2 }}
          className="flex items-center gap-2 mt-5"
        >
          {['Live Scoring', 'Betting Games', 'Handicaps'].map((pill, i) => (
            <span
              key={pill}
              className="text-[10px] font-bold text-white/50 bg-white/8 border border-white/10 px-2.5 py-1 rounded-full tracking-[0.04em]"
            >
              {pill}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ── Form sheet (bottom ~52%) ──────────────────────────────────────── */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring, delay: 0.18 }}
        className="relative z-10 bg-[#141414] rounded-t-[32px] border-t border-white/8 flex flex-col overflow-hidden"
        style={{ maxHeight: '62vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/15" />
        </div>

        {/* Mode toggle */}
        <div className="px-6 pt-3 pb-4">
          <div className="relative bg-white/6 rounded-2xl p-1 flex">
            {/* Sliding indicator */}
            <motion.div
              layout
              layoutId="auth-mode-bg"
              transition={spring}
              className={`absolute top-1 bottom-1 rounded-xl bg-[#F0EE3A] ${
                mode === 'signup' ? 'left-1 right-[calc(50%+2px)]' : 'left-[calc(50%+2px)] right-1'
              }`}
            />
            {(['signup', 'signin'] as const).map((m) => (
              <motion.button
                key={m}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => switchMode(m)}
                className={`relative z-10 flex-1 text-[14px] font-bold py-2.5 rounded-xl transition-colors ${
                  mode === m ? 'text-[#0A0A0A]' : 'text-white/40'
                }`}
              >
                {m === 'signup' ? 'Sign Up' : 'Sign In'}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-safe">
          <form onSubmit={handleSubmit} className="flex flex-col gap-0">

            {/* Full Name — signup only */}
            <AnimatePresence initial={false}>
              {mode === 'signup' && (
                <motion.div
                  key="fullName"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                >
                  <DarkInput
                    id="fullName"
                    type="text"
                    label="Full Name"
                    placeholder="John Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isSubmitting}
                    error={errors.fullName}
                    autoComplete="name"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="mb-3">
              <DarkInput
                id="email"
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                error={errors.email}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="mb-3">
              <DarkInput
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                error={errors.password}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                suffix={
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-white/30 hover:text-white/60 transition-colors p-1"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </motion.button>
                }
              />
            </div>

            {/* Password strength — signup only */}
            <AnimatePresence>
              {mode === 'signup' && password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mb-3 overflow-hidden"
                >
                  {/* Strength bar */}
                  <div className="flex gap-1 mb-2">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="h-1 flex-1 rounded-full"
                        animate={{
                          backgroundColor: passwordStrength.score > i ? passwordStrength.color : 'rgba(255,255,255,0.1)',
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    ))}
                  </div>
                  {/* Requirement pills */}
                  <div className="flex gap-1.5 flex-wrap">
                    {passwordRequirements.map((req) => (
                      <motion.span
                        key={req.label}
                        animate={{
                          backgroundColor: req.met ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                          borderColor: req.met ? 'rgba(34,197,94,0.4)' : 'transparent',
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                      >
                        {req.met
                          ? <Check className="w-2.5 h-2.5 text-[#22C55E]" />
                          : <X className="w-2.5 h-2.5 text-white/20" />
                        }
                        <span className={req.met ? 'text-[#22C55E]' : 'text-white/30'}>{req.label}</span>
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Primary CTA */}
            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              disabled={isSubmitting || isAppleSigningIn}
              className="w-full h-[54px] rounded-2xl bg-[#F0EE3A] text-[#0A0A0A] font-black text-[15px] flex items-center justify-center gap-2 mt-1 disabled:opacity-40 transition-opacity"
            >
              <AnimatePresence mode="wait">
                {isSubmitting ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="w-5 h-5 rounded-full border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A] animate-spin" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Apple Sign In — native iOS only */}
            {isNativeIOS && (
              <>
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] font-bold text-white/25 uppercase tracking-[0.12em]">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAppleSignIn}
                  disabled={isSubmitting || isAppleSigningIn}
                  className="w-full h-[54px] rounded-2xl bg-white text-[#0A0A0A] font-bold text-[15px] flex items-center justify-center gap-2.5 disabled:opacity-40"
                >
                  {isAppleSigningIn ? (
                    <div className="w-5 h-5 rounded-full border-2 border-[#0A0A0A]/20 border-t-[#0A0A0A] animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                      <span>Continue with Apple</span>
                    </>
                  )}
                </motion.button>
              </>
            )}

            {/* Mode switch */}
            <p className="text-center text-[12px] text-white/35 mt-5 pb-1">
              {mode === 'signup' ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-white/70 font-bold"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="text-white/70 font-bold"
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>

            {/* Legal */}
            <p className="text-center text-[10px] text-white/20 mt-2 pb-6 leading-relaxed">
              By continuing, you agree to our{' '}
              <a href="/terms-of-service" className="text-white/40 underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy-policy" className="text-white/40 underline">Privacy Policy</a>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Dark input component ─────────────────────────────────────────────────────
function DarkInput({
  id,
  type,
  label,
  placeholder,
  value,
  onChange,
  disabled,
  error,
  autoComplete,
  suffix,
}: {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error?: string;
  autoComplete?: string;
  suffix?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40 block mb-1.5"
      >
        {label}
      </label>
      <div
        className={`relative flex items-center bg-white/6 rounded-xl border transition-colors ${
          error
            ? 'border-[#EF4444]/60'
            : focused
            ? 'border-white/25'
            : 'border-white/8'
        }`}
      >
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent px-4 py-3.5 text-[14px] font-medium text-white placeholder:text-white/20 focus:outline-none disabled:opacity-40"
        />
        {suffix && <div className="pr-3">{suffix}</div>}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] text-[#EF4444] font-medium mt-1 flex items-center gap-1"
        >
          <X className="w-3 h-3 flex-shrink-0" />
          {error}
        </motion.p>
      )}
    </div>
  );
}
