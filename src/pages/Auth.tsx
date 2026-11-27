import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, X, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { FieldInput, PasswordStrength } from '@/components/auth/AuthFields';
import { GolfCanvas } from '@/components/auth/GolfCanvas';

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
  if (score <= 1) return { score, label: 'Weak', color: '#B42318' };
  if (score <= 2) return { score, label: 'Fair', color: '#D97706' };
  if (score <= 3) return { score, label: 'Good', color: '#4D7C0F' };
  return { score, label: 'Strong', color: '#14532D' };
}

// ─── Cinematic video background ─────────────────────────────────────────────
// Three golf videos crossfade in sequence for a cinematic looping background.
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
      className="absolute inset-x-0 bottom-0 z-30 flex flex-col bg-background rounded-t-[28px] shadow-[0_-24px_80px_rgba(15,31,23,0.45)]"
      style={{ maxHeight: '88vh' }}
    >
      {/* Drag handle + close */}
      <div className="relative flex items-center justify-between px-3 pt-2 pb-1">
        <div className="w-10 h-1.5 rounded-full bg-border-strong absolute left-1/2 top-3 -translate-x-1/2" />
        <div className="flex-1" />
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onClose}
          className="w-11 h-11 rounded-full bg-muted flex items-center justify-center"
          aria-label="Close"
        >
          <X className="w-[18px] h-[18px] text-foreground" />
        </motion.button>
      </div>

      {/* Sheet title */}
      <div className="px-5 pb-5">
        <h2 className="text-[28px] font-extrabold text-foreground tracking-[-0.02em] leading-tight">
          {mode === 'signup' ? 'Create account' : 'Welcome back'}
        </h2>
        <p className="text-[14px] text-muted-foreground mt-1">
          {mode === 'signup' ? 'Join thousands of golfers on MATCH' : 'Sign in to your MATCH account'}
        </p>
      </div>

      {/* Apple sign-in — top of sheet */}
      {isNativeIOS && (
        <div className="px-5 pb-4">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleApple}
            disabled={isSubmitting || isAppleLoading}
            className="w-full h-14 rounded-[20px] bg-black text-white font-semibold text-[16px] flex items-center justify-center gap-2.5 disabled:opacity-40"
          >
            {isAppleLoading
              ? <div className="w-5 h-5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
              : <>
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span>Continue with Apple</span>
                </>
            }
          </motion.button>

          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[12px] font-semibold text-muted-foreground">or use email</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>
      )}

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-safe">
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
                <FieldInput id="fullName" type="text" label="Full name" placeholder="John Smith"
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
                  className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                <PasswordStrength score={passwordStrength.score} color={passwordStrength.color} requirements={passwordReqs} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={isSubmitting || isAppleLoading}
            className="w-full h-[60px] rounded-[20px] bg-ink text-ink-foreground font-bold text-[16px] flex items-center justify-center gap-2 mt-2 disabled:opacity-40"
          >
            <AnimatePresence mode="wait">
              {isSubmitting
                ? <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="w-5 h-5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                  </motion.div>
                : <motion.div key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <span>{mode === 'signup' ? 'Create account' : 'Sign in'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
              }
            </AnimatePresence>
          </motion.button>

          {/* Switch mode */}
          <p className="text-center text-[14px] text-muted-foreground mt-3">
            {mode === 'signup'
              ? <>Already have an account?{' '}<button type="button" onClick={() => onSwitchMode('signin')} className="font-bold text-primary h-11 px-1">Sign in</button></>
              : <>Don&apos;t have an account?{' '}<button type="button" onClick={() => onSwitchMode('signup')} className="font-bold text-primary h-11 px-1">Sign up</button></>
            }
          </p>

          <p className="text-center text-[12px] text-muted-foreground mt-1 pb-8 leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="/terms-of-service" className="inline-block min-w-11 py-[13px] -my-[13px] px-1 text-center underline underline-offset-2 text-foreground">Terms</a>
            {' '}and{' '}
            <a href="/privacy-policy" className="inline-block min-w-11 py-[13px] -my-[13px] px-1 text-center underline underline-offset-2 text-foreground">Privacy Policy</a>
          </p>
        </form>
      </div>
    </motion.div>
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
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={spring}
          className="flex flex-col items-center gap-5">
          <img src="/app-icon.png" alt="MATCH" className="w-20 h-20 rounded-[28px]" />
          <div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-gold animate-spin" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-ink overflow-hidden relative">

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
                className="text-[64px] font-extrabold tracking-[-0.05em] text-white leading-none"
                style={{ textShadow: '0 4px 40px rgba(15,31,23,0.45)' }}
              >
                M<span className="text-gold">A</span>TCH
              </motion.h1>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.2 }}
                className="text-[16px] font-semibold mt-3 text-white/80"
              >
                Play. Compete. Win.
              </motion.p>
            </div>

            {/* Bottom actions — SENA-style */}
            <div className="px-5 pb-safe flex flex-col items-center gap-2">

              {/* Create account — outlined */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.28 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { hapticLight(); setSheet('signup'); }}
                className="w-full h-[60px] rounded-[20px] font-bold text-[17px] bg-white text-ink flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.25)]"
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
                className="w-full h-14 rounded-[20px] font-semibold text-[16px] text-white bg-white/10 border border-white/20 backdrop-blur-md"
              >
                Sign in
              </motion.button>

              {/* Legal */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="text-center text-[12px] leading-relaxed pt-2 pb-4 text-white/60"
              >
                By continuing you agree to our{' '}
                <a href="/terms-of-service" className="inline-block min-w-11 py-[13px] -my-[13px] px-1 text-center underline underline-offset-2 text-white/85">Terms</a>
                {' '}and{' '}
                <a href="/privacy-policy" className="inline-block min-w-11 py-[13px] -my-[13px] px-1 text-center underline underline-offset-2 text-white/85">Privacy Policy</a>
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
            style={{ background: 'rgba(15,31,23,0.5)' }}
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
