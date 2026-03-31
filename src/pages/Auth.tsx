import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { z } from 'zod';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';

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

type PasswordStrength = {
  score: number;
  label: string;
  color: string;
};

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-danger' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-warning' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-warning' };
  if (score <= 4) return { score, label: 'Strong', color: 'bg-[#22C55E]' };
  return { score, label: 'Excellent', color: 'bg-[#22C55E]' };
}

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
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
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
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
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
            toast({
              title: 'Sign up failed',
              description: error.message,
              variant: 'destructive',
            });
          }
          hapticError();
        } else {
          hapticSuccess();
          toast({
            title: 'Account created!',
            description: 'Welcome to MATCH.',
          });
          navigate('/', { replace: true });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            setErrors({ password: 'Invalid email or password' });
          } else {
            toast({
              title: 'Sign in failed',
              description: error.message,
              variant: 'destructive',
            });
          }
          hapticError();
        } else {
          hapticSuccess();
          toast({
            title: 'Welcome back!',
            description: 'You are now signed in.',
          });
          navigate('/', { replace: true });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'signup' ? 'signin' : 'signup');
    setErrors({});
    hapticLight();
  };

  const handleAppleSignIn = async () => {
    hapticLight();
    setIsAppleSigningIn(true);

    try {
      const { error } = await signInWithApple();

      if (error) {
        if (error.message === 'Sign in cancelled') {
          // User cancelled - don't show error
        } else {
          toast({
            title: 'Sign in failed',
            description: error.message,
            variant: 'destructive',
          });
          hapticError();
        }
      } else {
        hapticSuccess();
        toast({
          title: 'Welcome!',
          description: 'You are now signed in.',
        });
        navigate('/', { replace: true });
      }
    } finally {
      setIsAppleSigningIn(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
            className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center"
          >
            <svg width="24" height="24" viewBox="0 0 80 80" fill="none">
              <path d="M16 58 L16 22 L40 46 L64 22 L64 58" stroke="white" strokeWidth="7.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
          <Loader2 className="h-6 w-6 animate-spin text-foreground" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6] flex flex-col items-center justify-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* M Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center mx-auto mb-4"
        >
          <svg width="24" height="24" viewBox="0 0 80 80" fill="none">
            <path d="M16 58 L16 22 L40 46 L64 22 L64 58" stroke="white" strokeWidth="7.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>

        {/* Title & Tagline */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-black tracking-[-0.04em] text-foreground text-center"
        >
          MATCH
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-sm text-muted-foreground text-center mb-5"
        >
          Premium Golf Scoring
        </motion.p>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl shadow-[0_4px_40px_rgba(0,0,0,0.08)] p-6 w-full">
          {/* Tab Toggle */}
          <div className="bg-muted rounded-xl p-1 flex gap-1 mb-5">
            <motion.button
              type="button"
              onClick={() => { setMode('signup'); setErrors({}); }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 text-center text-sm py-2 rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white shadow-sm text-foreground font-bold'
                  : 'text-muted-foreground font-medium'
              }`}
            >
              Sign Up
            </motion.button>
            <motion.button
              type="button"
              onClick={() => { setMode('signin'); setErrors({}); }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 text-center text-sm py-2 rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-white shadow-sm text-foreground font-bold'
                  : 'text-muted-foreground font-medium'
              }`}
            >
              Sign In
            </motion.button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Full Name (signup only) */}
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  key="fullName"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mb-4"
                >
                  <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1.5 block">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="John Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isSubmitting}
                    className={`w-full bg-muted/50 rounded-xl border px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground/30 ${
                      errors.fullName ? 'border-destructive' : 'border-border'
                    }`}
                  />
                  {errors.fullName && (
                    <p className="text-[12px] text-destructive font-medium mt-1">{errors.fullName}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="mb-4">
              <label htmlFor="email" className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1.5 block">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                autoComplete="email"
                className={`w-full bg-muted/50 rounded-xl border px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground/30 ${
                  errors.email ? 'border-destructive' : 'border-border'
                }`}
              />
              {errors.email && (
                <p className="text-[12px] text-destructive font-medium mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="mb-4">
              <label htmlFor="password" className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className={`w-full bg-muted/50 rounded-xl border px-4 py-3.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground/30 ${
                    errors.password ? 'border-destructive' : 'border-border'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[12px] text-destructive font-medium mt-1">{errors.password}</p>
              )}
            </div>

            {/* Password strength indicator */}
            <AnimatePresence>
              {mode === 'signup' && password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  {/* Strength segments */}
                  <div className="flex gap-1.5 mt-2 mb-1">
                    {[0, 1, 2, 3].map((i) => {
                      const filled = passwordStrength.score >= 5 && i < 4;
                      const partial = !filled && passwordStrength.score - 1 >= i;
                      return (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            filled
                              ? 'bg-[#22C55E]'
                              : partial
                              ? 'bg-[#F0EE3A]'
                              : passwordStrength.score > i
                              ? 'bg-[#22C55E]'
                              : 'bg-muted'
                          }`}
                        />
                      );
                    })}
                  </div>
                  {/* Requirement pills */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {passwordRequirements.map((req) => (
                      <span
                        key={req.label}
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
                          req.met
                            ? 'bg-[#F0FFF4] text-[#16A34A] border border-[#BBF7D0]'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {req.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {req.label}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting || isAppleSigningIn}
              className={`w-full bg-foreground text-background rounded-2xl h-[52px] font-bold text-[15px] mt-2 flex items-center justify-center transition-opacity ${
                isSubmitting ? 'opacity-80' : ''
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : mode === 'signup' ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          {/* Sign in with Apple - only show on native iOS */}
          {isNativeIOS && (
            <>
              {/* Or divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em]">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={handleAppleSignIn}
                disabled={isSubmitting || isAppleSigningIn}
                className="w-full bg-foreground text-background rounded-2xl h-[52px] font-bold text-[15px] flex items-center justify-center gap-2 mt-2"
              >
                {isAppleSigningIn ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Sign in with Apple
                  </>
                )}
              </motion.button>
            </>
          )}

          {/* Mode switch link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-foreground font-bold hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-foreground font-bold hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
          </p>

          {/* Legal links - required by App Store */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            By continuing, you agree to our{' '}
            <a href="/terms-of-service" className="text-foreground font-medium hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy-policy" className="text-foreground font-medium hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
