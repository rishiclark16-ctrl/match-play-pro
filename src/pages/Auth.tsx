import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { z } from 'zod';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
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
  if (score <= 4) return { score, label: 'Strong', color: 'bg-success' };
  return { score, label: 'Excellent', color: 'bg-success' };
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-3xl font-black text-primary-foreground">M</span>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background px-6 py-8 safe-top safe-bottom relative">
      {/* Technical Grid Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        
        {/* Top gradient */}
        <div 
          className="absolute top-0 left-0 right-0 h-96"
          style={{ background: 'linear-gradient(180deg, hsl(var(--primary) / 0.03) 0%, transparent 100%)' }}
        />
        
        {/* Corner accents */}
        <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-primary/20" />
        <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-primary/10" />
        <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-primary/10" />
        <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-primary/5" />
      </div>
      
      {/* Scrollable Content */}
      <div 
        className="flex-1 overflow-y-auto overscroll-y-contain flex flex-col items-center justify-center relative z-10"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
        {/* Branding */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-10"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.2 }}
            className="relative inline-block mb-5"
          >
            <div className="w-20 h-20 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-4xl font-black text-primary-foreground tracking-tighter">M</span>
            </div>
            {/* Corner accent on logo */}
            <div className="absolute -top-2 -left-2 w-5 h-5 border-l-2 border-t-2 border-primary" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-black tracking-tight text-foreground"
          >
            MATCH
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm font-medium text-muted-foreground mt-1"
          >
            Premium Golf Scoring
          </motion.p>
        </motion.div>

        {/* Auth Card */}
        <TechCard variant="elevated" className="overflow-hidden">
          <div className="p-6 pb-4">
            {/* Tab Switcher */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6">
              <motion.button
                type="button"
                onClick={() => { setMode('signup'); setErrors({}); }}
                className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-md transition-all ${
                  mode === 'signup'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                Sign Up
              </motion.button>
              <motion.button
                type="button"
                onClick={() => { setMode('signin'); setErrors({}); }}
                className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-md transition-all ${
                  mode === 'signin'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                Sign In
              </motion.button>
            </div>
            
            <p className="text-center text-sm text-muted-foreground mb-5">
              {mode === 'signup' 
                ? 'Create an account to track your rounds' 
                : 'Welcome back! Sign in to continue'}
            </p>
          </div>

          <TechCardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {mode === 'signup' && (
                  <motion.div
                    key="fullName"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wide">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Smith"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={`py-5 rounded-lg bg-muted border-border ${errors.fullName ? 'border-danger' : ''}`}
                        disabled={isSubmitting}
                      />
                      {errors.fullName && (
                        <p className="text-xs font-medium text-danger">{errors.fullName}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`py-5 rounded-lg bg-muted border-border ${errors.email ? 'border-danger' : ''}`}
                  disabled={isSubmitting}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-xs font-medium text-danger">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`py-5 pr-12 rounded-lg bg-muted border-border ${errors.password ? 'border-danger' : ''}`}
                    disabled={isSubmitting}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
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
                  <p className="text-xs font-medium text-danger">{errors.password}</p>
                )}
              </div>

              {/* Password strength indicator */}
              <AnimatePresence>
                {mode === 'signup' && password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Strength</span>
                        <span className={`font-bold ${passwordStrength.score >= 4 ? 'text-success' : 'text-muted-foreground'}`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          className={`h-full ${passwordStrength.color} transition-colors rounded-full`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {passwordRequirements.map((req) => (
                        <span
                          key={req.label}
                          className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wide ${
                            req.met
                              ? 'bg-success text-success-foreground'
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

              <motion.div whileTap={{ scale: 0.98 }} className="pt-3">
                <Button
                  type="submit"
                  className="w-full h-14 text-base font-bold rounded-xl bg-primary shadow-md"
                  disabled={isSubmitting || isAppleSigningIn}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : mode === 'signup' ? (
                    'Create Account'
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Sign in with Apple - only show on native iOS */}
            {isNativeIOS && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground font-medium">or</span>
                  </div>
                </div>

                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    type="button"
                    onClick={handleAppleSignIn}
                    disabled={isSubmitting || isAppleSigningIn}
                    className="w-full h-14 text-base font-bold rounded-xl bg-black text-white hover:bg-black/90 shadow-md flex items-center justify-center gap-3"
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
                  </Button>
                </motion.div>
              </>
            )}

            <p className="text-center text-sm text-muted-foreground mt-6">
              {mode === 'signup' ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="text-primary font-bold hover:underline"
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
                    className="text-primary font-bold hover:underline"
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>

            {/* Legal links - required by App Store */}
            <p className="text-center text-xs text-muted-foreground mt-4">
              By continuing, you agree to our{' '}
              <a href="/terms-of-service" className="text-primary hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy-policy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </TechCardContent>
        </TechCard>
      </motion.div>
      </div>
    </div>
  );
}
