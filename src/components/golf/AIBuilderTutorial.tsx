import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Type, BookMarked } from 'lucide-react';

const STORAGE_KEY = 'ai_builder_tutorial_seen_v1';

const STEPS = [
  {
    icon: Type,
    iconColor: '#BEF264',
    title: 'Describe your game',
    subtitle: 'In plain English',
    body: 'Type (or say) exactly how you play — bets, rules, handicap adjustments, anything. No forms. No dropdowns.',
    animation: <TypingAnimation />,
  },
  {
    icon: Sparkles,
    iconColor: '#BEF264',
    title: 'AI reads the rules',
    subtitle: 'In seconds',
    body: 'The AI breaks your description into individual scoring rules — Nassau, skins, presses, birdies — and lets you toggle each one.',
    animation: <ParseAnimation />,
  },
  {
    icon: BookMarked,
    iconColor: '#BEF264',
    title: 'Save it, use anytime',
    subtitle: 'Your format, forever',
    body: 'Your saved format appears in the Format step every time you start a new round. One tap to load your whole game.',
    animation: <SaveAnimation />,
  },
];

function TypingAnimation() {
  const text = 'Nassau $5, auto press when 2 down, birdies pay everyone a unit...';
  const [displayed, setDisplayed] = useState('');
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (idx >= text.length) return;
    const t = setTimeout(() => {
      setDisplayed(text.slice(0, idx + 1));
      setIdx(i => i + 1);
    }, 38);
    return () => clearTimeout(t);
  }, [idx, text]);

  return (
    <div className="bg-card rounded-[20px] p-4 border border-border">
      <p className="text-[16px] text-foreground leading-relaxed min-h-[76px]">
        {displayed}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
          className="inline-block w-[2px] h-[18px] bg-primary ml-[1px] align-middle"
        />
      </p>
    </div>
  );
}

function ParseAnimation() {
  const rules = ['Nassau $5', 'Auto Press (2-down)', 'Birdie pays unit', 'Net scoring'];
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= rules.length) return;
    const t = setTimeout(() => setVisible(v => v + 1), 420);
    return () => clearTimeout(t);
  }, [visible, rules.length]);

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {rules.slice(0, visible).map((rule, i) => (
          <motion.div
            key={rule}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="flex items-center gap-3 bg-card rounded-[20px] border border-border px-4 min-h-[52px]"
          >
            <span className="w-7 h-7 rounded-[9px] bg-primary flex items-center justify-center flex-shrink-0 text-white text-[13px] font-bold">✓</span>
            <span className="text-[15px] font-semibold text-foreground">{rule}</span>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 500 }}
              className="ml-auto text-[12px] font-semibold text-primary bg-gold-muted px-2 py-0.5 rounded-full"
            >
              High
            </motion.span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function SaveAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.1 }}
      className="bg-primary rounded-[28px] p-5"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-[14px] bg-gold flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-white text-[18px] leading-tight">Saturday Nassau</p>
          <p className="text-[#CFE3D6] text-[13px] mt-0.5">Nassau · Auto Press · Birdies</p>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 500 }}
          className="w-6 h-6 rounded-full bg-[#BEF264] flex items-center justify-center flex-shrink-0"
        >
          <span className="text-[12px] font-black text-primary">✓</span>
        </motion.div>
      </div>
      <div className="mt-3 pt-3 border-t border-white/10">
        <p className="text-[#CFE3D6] text-[13px] font-medium">Appears in every new round</p>
      </div>
    </motion.div>
  );
}

interface Props {
  onDismiss: () => void;
}

export function AIBuilderTutorial({ onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem(STORAGE_KEY, '1');
      onDismiss();
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end"
      style={{ background: 'rgba(15,31,23,0.6)' }}
    >
      {/* Tap backdrop to skip */}
      <div className="absolute inset-0" onClick={() => { localStorage.setItem(STORAGE_KEY, '1'); onDismiss(); }} />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="relative w-full bg-background rounded-t-[28px] px-5 pt-5"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              animate={{ width: i === step ? 20 : 6, backgroundColor: i === step ? '#14532D' : '#E7E9E3' }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="h-1.5 rounded-full"
            />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="w-7 h-7 rounded-[9px] bg-gold flex items-center justify-center"><current.icon className="w-4 h-4 text-primary" /></span>
              <p className="text-[13px] font-semibold text-muted-foreground">{current.subtitle}</p>
            </div>
            <h2 className="text-[28px] font-extrabold tracking-[-0.02em] text-foreground leading-tight mt-2 mb-2">
              {current.title}
            </h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed mb-5">
              {current.body}
            </p>

            {/* Animation area */}
            <div className="mb-6">
              {current.animation}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          className="w-full bg-ink text-white rounded-[20px] h-[60px] font-bold text-[16px] flex items-center justify-center gap-2 mb-2"
        >
          {isLast ? (
            <>
              <Sparkles className="w-5 h-5 text-[#BEF264]" />
              <span>Let's build it</span>
            </>
          ) : (
            <span>Next</span>
          )}
        </motion.button>

        {/* Skip */}
        <button
          onClick={() => { localStorage.setItem(STORAGE_KEY, '1'); onDismiss(); }}
          className="w-full h-11 text-center text-[14px] font-semibold text-muted-foreground"
        >
          Skip tutorial
        </button>
      </motion.div>
    </motion.div>
  );
}

export function shouldShowAIBuilderTutorial(): boolean {
  return !localStorage.getItem(STORAGE_KEY);
}
