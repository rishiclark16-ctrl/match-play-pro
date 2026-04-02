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

// ─── Pre-computed star data (stable across renders) ──────────────────────────
const STARS = Array.from({ length: 58 }, (_, i) => ({
  x: ((i * 17.3 + Math.sin(i * 2.1) * 40 + 50) % 95) + 2,
  y: ((i * 11.7 + Math.cos(i * 1.9) * 20 + 10) % 60) + 2,
  size: i % 7 === 0 ? 2.5 : i % 3 === 0 ? 1.8 : 1.1,
  delay: (i * 0.38) % 5.5,
  dur: 1.4 + (i % 5) * 0.55,
  opacity: 0.3 + (i % 4) * 0.15,
}));

// Ball arc keyframe positions (parabolic path left→apex→right)
const BALL_LEFT:   string[] = ['3%',  '20%', '50%', '80%', '97%'];
const BALL_BOTTOM: string[] = ['30%', '48%', '62%', '50%', '32%'];
const BALL_TIMES = [0, 0.25, 0.5, 0.75, 1];

// ─── Animated golf course SVG background ─────────────────────────────────────
function GolfBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#040805] via-[#07100a] to-[#0d1a0c]" />

      {/* Accent lines overlay */}
      <style>{`
        @keyframes drawH { from { transform: scaleX(0); opacity:0; } to { transform: scaleX(1); opacity:1; } }
        @keyframes drawV { from { transform: scaleY(0); opacity:0; } to { transform: scaleY(1); opacity:1; } }
      `}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Horizontal accent lines */}
        <div style={{ position:'absolute', left:0, right:0, top:'22%', height:'1px', background:'rgba(240,238,58,0.06)', transformOrigin:'50% 50%', transform:'scaleX(0)', animation:'drawH 1.4s cubic-bezier(.22,.61,.36,1) 0.3s forwards' }} />
        <div style={{ position:'absolute', left:0, right:0, top:'52%', height:'1px', background:'rgba(255,255,255,0.04)', transformOrigin:'50% 50%', transform:'scaleX(0)', animation:'drawH 1.4s cubic-bezier(.22,.61,.36,1) 0.6s forwards' }} />
        {/* Vertical accent lines */}
        <div style={{ position:'absolute', top:0, bottom:0, left:'25%', width:'1px', background:'rgba(240,238,58,0.04)', transformOrigin:'50% 0%', transform:'scaleY(0)', animation:'drawV 1.6s cubic-bezier(.22,.61,.36,1) 0.4s forwards' }} />
        <div style={{ position:'absolute', top:0, bottom:0, left:'75%', width:'1px', background:'rgba(240,238,58,0.04)', transformOrigin:'50% 0%', transform:'scaleY(0)', animation:'drawV 1.6s cubic-bezier(.22,.61,.36,1) 0.7s forwards' }} />
      </div>

      {/* ── Aurora blobs (Framer Motion HTML — reliable on all platforms) ── */}
      <motion.div
        className="absolute top-[2%] left-[10%] w-80 h-80 rounded-full bg-[#F0EE3A] blur-[110px] pointer-events-none"
        animate={{ scale: [1, 1.18, 1], opacity: [0.09, 0.18, 0.09], y: [0, -14, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[22%] right-[4%] w-60 h-60 rounded-full bg-[#22C55E] blur-[90px] pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.12, 0.06], y: [0, 12, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <motion.div
        className="absolute top-[8%] right-[28%] w-44 h-44 rounded-full bg-[#60A5FA] blur-[80px] pointer-events-none"
        animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.10, 0.05], y: [0, -8, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />

      {/* ── Stars (Framer Motion HTML) ── */}
      {STARS.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          animate={{ opacity: [s.opacity * 0.15, s.opacity, s.opacity * 0.15], scale: [1, 1.5, 1] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* ── Shooting stars (Framer Motion HTML) ── */}
      <motion.div
        className="absolute top-[11%] left-0 w-28 h-px bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none"
        style={{ rotate: 15 }}
        animate={{ x: ['-10%', '120%'], opacity: [0, 1, 0] }}
        transition={{ duration: 1.0, delay: 5, repeat: Infinity, repeatDelay: 13, ease: 'easeIn' }}
      />
      <motion.div
        className="absolute top-[20%] left-0 w-20 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none"
        style={{ rotate: 12 }}
        animate={{ x: ['-10%', '120%'], opacity: [0, 0.7, 0] }}
        transition={{ duration: 0.8, delay: 11, repeat: Infinity, repeatDelay: 19, ease: 'easeIn' }}
      />

      {/* ── Crescent moon ── */}
      <div className="absolute top-[7%] right-[13%] pointer-events-none">
        <div className="relative w-9 h-9">
          <div className="absolute inset-0 rounded-full bg-[#fffde8] shadow-[0_0_20px_rgba(255,253,210,0.6),0_0_50px_rgba(255,253,210,0.2)]" />
          {/* Cut-out to create crescent */}
          <div className="absolute top-0 right-1 w-7 h-9 rounded-full bg-[#040805]" />
        </div>
      </div>

      {/* ── Flying golf ball with comet trail (Framer Motion HTML) ── */}
      {/* Trail dots — progressively more offset behind ball */}
      {([
        { size: 10, opacity: [0, 0.65, 0],  color: '#F0EE3A', dDelay: 0.18 },
        { size: 7,  opacity: [0, 0.45, 0],  color: '#F0EE3A', dDelay: 0.32 },
        { size: 5,  opacity: [0, 0.28, 0],  color: '#F0EE3A', dDelay: 0.46 },
      ] as const).map((trail, ti) => (
        <motion.div
          key={`trail-${ti}`}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: trail.size,
            height: trail.size,
            backgroundColor: trail.color,
            filter: 'blur(1px)',
            marginLeft: -trail.size / 2,
            marginBottom: -trail.size / 2,
          }}
          animate={{
            left: BALL_LEFT,
            bottom: BALL_BOTTOM,
            opacity: trail.opacity,
          }}
          transition={{
            duration: 4.2,
            repeat: Infinity,
            repeatDelay: 1.8,
            ease: 'easeInOut',
            times: BALL_TIMES,
            delay: trail.dDelay,
          }}
        />
      ))}
      {/* Main ball */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: '0 0 12px rgba(255,255,255,1), 0 0 30px rgba(240,238,58,0.8), 0 0 60px rgba(240,238,58,0.4)',
          marginLeft: -8,
          marginBottom: -8,
        }}
        animate={{
          left: BALL_LEFT,
          bottom: BALL_BOTTOM,
          opacity: [0, 1, 1, 1, 0],
        }}
        transition={{
          duration: 4.2,
          repeat: Infinity,
          repeatDelay: 1.8,
          ease: 'easeInOut',
          times: BALL_TIMES,
        }}
      />
      {/* Ghost ball — offset for continuous feel */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.3)',
          marginLeft: -5,
          marginBottom: -5,
        }}
        animate={{
          left: BALL_LEFT,
          bottom: BALL_BOTTOM,
          opacity: [0, 0.3, 0.3, 0.3, 0],
        }}
        transition={{
          duration: 4.2,
          repeat: Infinity,
          repeatDelay: 1.8,
          ease: 'easeInOut',
          times: BALL_TIMES,
          delay: 2.1,
        }}
      />

      {/* ── SVG course scene — only static + SVG SMIL animations ── */}
      <svg
        className="absolute bottom-0 left-0 w-full pointer-events-none"
        viewBox="0 0 390 330"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="hg1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F0EE3A" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F0EE3A" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a3a1a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0d1e0d" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Terrain layers */}
        <path d="M0 240 Q35 200 75 212 Q115 224 155 193 Q200 160 240 178 Q278 196 310 173 Q345 150 390 168 L390 330 L0 330 Z" fill="#080f08" opacity="0.70" />
        <path d="M0 258 Q52 226 98 241 Q148 257 198 220 Q252 183 308 208 Q352 226 390 216 L390 330 L0 330 Z" fill="#0b180b" opacity="0.88" />
        <path d="M0 274 Q68 253 128 263 Q188 274 242 246 Q298 218 362 236 L390 230 L390 330 L0 330 Z" fill="url(#hillGrad)" />
        <path d="M0 291 Q82 277 150 284 Q218 293 270 270 Q322 253 390 267 L390 330 L0 330 Z" fill="#122512" />
        <rect x="0" y="307" width="390" height="23" fill="#0d1e0d" />

        {/* ── Flag pin 1 (left) ── */}
        <circle cx="128" cy="276" r="22" fill="#F0EE3A" opacity="0.06">
          <animate attributeName="r" values="16;24;16" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.06;0.18;0.06" dur="3s" repeatCount="indefinite" />
        </circle>
        <ellipse cx="128" cy="279" rx="5" ry="2" fill="#060d06" stroke="#2a4a2a" strokeWidth="1" />
        <line x1="128" y1="244" x2="128" y2="279" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" />
        {/* Flag — SVG SMIL animateTransform (works in all browsers) */}
        <path d="M128 244 L148 251 L128 258 Z" fill="#F0EE3A">
          <animateTransform
            attributeName="transform" type="rotate"
            values="0 128 244; 6 128 244; -3 128 244; 8 128 244; 0 128 244"
            dur="2.4s" repeatCount="indefinite"
          />
        </path>

        {/* ── Flag pin 2 (right) ── */}
        <circle cx="293" cy="256" r="20" fill="#F0EE3A" opacity="0.06">
          <animate attributeName="r" values="14;22;14" dur="4s" repeatCount="indefinite" begin="-2s" />
          <animate attributeName="opacity" values="0.06;0.18;0.06" dur="4s" repeatCount="indefinite" begin="-2s" />
        </circle>
        <ellipse cx="293" cy="260" rx="5" ry="2" fill="#060d06" stroke="#2a4a2a" strokeWidth="1" />
        <line x1="293" y1="225" x2="293" y2="260" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" />
        <path d="M293 225 L313 232 L293 239 Z" fill="#F0EE3A">
          <animateTransform
            attributeName="transform" type="rotate"
            values="0 293 225; -7 293 225; 4 293 225; -5 293 225; 0 293 225"
            dur="3s" repeatCount="indefinite"
          />
        </path>

        {/* ── Grass blades — SVG SMIL animateTransform ── */}
        {[8,28,50,72,94,116,138,162,184,206,228,250,272,296,318,340,362,382].map((x, i) => {
          const h = 6 + (i % 4) * 3;
          const angle = 5 + (i % 4) * 2;
          const neg = 3 + (i % 3) * 2;
          const dur = `${2.0 + (i % 5) * 0.4}s`;
          const begin = `${(i * 0.22) % 2}s`;
          return (
            <g key={x}>
              <line x1={x} y1={308} x2={x - 2} y2={308 - h} stroke="#1d3d1d" strokeWidth="1.8" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate"
                  values={`0 ${x} 308; ${angle} ${x} 308; 0 ${x} 308; ${-neg} ${x} 308; 0 ${x} 308`}
                  dur={dur} repeatCount="indefinite" begin={begin} />
              </line>
              <line x1={x+8} y1={311} x2={x+11} y2={311 - h + 2} stroke="#193619" strokeWidth="1.2" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate"
                  values={`0 ${x+8} 311; ${-angle} ${x+8} 311; 0 ${x+8} 311; ${neg} ${x+8} 311; 0 ${x+8} 311`}
                  dur={`${1.8 + (i%4)*0.38}s`} repeatCount="indefinite" begin={`${(i * 0.3) % 2.5}s`} />
              </line>
            </g>
          );
        })}

        {/* Faint horizon glow */}
        <line x1="0" y1="291" x2="390" y2="274" stroke="#F0EE3A" strokeWidth="0.6" opacity="0.08" />
      </svg>

      {/* Subtle grid overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="gp" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gp)" />
      </svg>

      {/* Chartreuse glow behind logo */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#F0EE3A]/[0.07] blur-[80px] pointer-events-none" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signUp, signIn, signInWithApple } = useAuth();
  const isNativeIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // ── Canvas rising particles ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;

    type Particle = { x: number; y: number; vy: number; opacity: number; size: number };

    const initParticles = (): Particle[] =>
      Array.from({ length: 80 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vy: -(0.3 + Math.random() * 0.5),
        opacity: Math.random() * 0.4 + 0.1,
        size: Math.random() * 1.2 + 0.4,
      }));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    let particles = initParticles();

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.y += p.vy;
        if (p.y < -5) {
          p.y = canvas.height + 5;
          p.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240,238,58,${p.opacity})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    const onResize = () => {
      resize();
      particles = initParticles();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

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

      {/* ── Canvas rising particles ───────────────────────────────────────── */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[2]" />

      {/* ── Hero content (top portion) ────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-6 pt-safe-content">
        {/* M Logo */}
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="w-[80px] h-[80px] rounded-[26px] bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_0_50px_rgba(240,238,58,0.35),0_20px_60px_rgba(0,0,0,0.5)] flex items-center justify-center"
        >
          <svg width="40" height="40" viewBox="0 0 80 80" fill="none">
            <path d="M16 58 L16 22 L40 46 L64 22 L64 58" stroke="#0A0A0A" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>

        {/* Thin chartreuse accent line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...spring, delay: 0.08 }}
          className="w-8 h-0.5 bg-[#F0EE3A] rounded-full my-4"
        />

        {/* Wordmark */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="text-[56px] font-black tracking-[-0.07em] text-white leading-none"
        >
          MATCH
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
          className="text-[11px] font-bold text-white/35 tracking-[0.22em] uppercase mt-2.5"
        >
          PREMIUM GOLF SCORING
        </motion.p>

        {/* Accent pills */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.2 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
        >
          {['Live Scoring', 'Betting Games', 'Handicaps'].map((pill) => (
            <span
              key={pill}
              className="bg-[#F0EE3A]/[0.08] border border-[#F0EE3A]/20 text-[#F0EE3A]/70 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.06em]"
            >
              {pill}
            </span>
          ))}
        </motion.div>

        {/* Score stat badges */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.28 }}
          className="mt-5 flex items-center gap-5"
        >
          <div className="flex flex-col items-center">
            <span className="text-[18px] font-black text-white leading-none">10K+</span>
            <span className="text-[9px] text-white/35 uppercase tracking-[0.1em] mt-0.5">Rounds</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-[18px] font-black text-white leading-none">6+</span>
            <span className="text-[9px] text-white/35 uppercase tracking-[0.1em] mt-0.5">Games</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-[18px] font-black text-white leading-none">4.9</span>
            <span className="text-[9px] text-white/35 uppercase tracking-[0.1em] mt-0.5">Rating</span>
          </div>
        </motion.div>
      </div>

      {/* ── Form sheet (bottom portion) ───────────────────────────────────── */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring, delay: 0.18 }}
        className="relative z-10 bg-[#0d0d0d]/95 backdrop-blur-2xl rounded-t-[40px] border-t border-white/[0.07] flex flex-col overflow-hidden"
        style={{ maxHeight: '64vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#F0EE3A]/25" />
        </div>

        {/* Mode toggle */}
        <div className="px-6 pt-3 pb-4">
          <div className="relative bg-white/[0.05] border border-white/[0.06] rounded-2xl p-1 flex">
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
        className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/35 block mb-1.5"
      >
        {label}
      </label>
      <div
        className={`relative flex items-center bg-white/[0.05] rounded-2xl border transition-colors ${
          error
            ? 'border-[#EF4444]/60'
            : focused
            ? 'border-[#F0EE3A]/50'
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
          className="flex-1 bg-transparent px-4 py-4 text-[15px] font-medium text-white placeholder:text-white/20 focus:outline-none disabled:opacity-40"
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
