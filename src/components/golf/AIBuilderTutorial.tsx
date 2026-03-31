import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Type, BookMarked } from 'lucide-react';

const STORAGE_KEY = 'ai_builder_tutorial_seen_v1';

const STEPS = [
  {
    icon: Type,
    iconColor: '#F0EE3A',
    title: 'Describe your game',
    subtitle: 'In plain English',
    body: 'Type (or say) exactly how you play — bets, rules, handicap adjustments, anything. No forms. No dropdowns.',
    animation: <TypingAnimation />,
  },
  {
    icon: Sparkles,
    iconColor: '#F0EE3A',
    title: 'AI reads the rules',
    subtitle: 'In seconds',
    body: 'The AI breaks your description into individual scoring rules — Nassau, skins, presses, birdies — and lets you toggle each one.',
    animation: <ParseAnimation />,
  },
  {
    icon: BookMarked,
    iconColor: '#F0EE3A',
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
    <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <p className="text-[13px] text-foreground leading-relaxed min-h-[60px]">
        {displayed}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
          className="inline-block w-[2px] h-[14px] bg-foreground ml-[1px] align-middle"
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
            className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
          >
            <span className="w-2 h-2 rounded-full bg-[#F0EE3A] flex-shrink-0" />
            <span className="text-[13px] font-medium text-foreground">{rule}</span>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 500 }}
              className="ml-auto text-[11px] font-bold text-[#22C55E]"
            >
              ✓
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
      className="bg-[#0A0A0A] rounded-2xl p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F0EE3A]/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-[#F0EE3A]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-[15px] leading-tight">Saturday Nassau</p>
          <p className="text-white/50 text-[12px] mt-0.5">Nassau · Auto Press · Birdies</p>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 500 }}
          className="w-6 h-6 rounded-full bg-[#F0EE3A] flex items-center justify-center flex-shrink-0"
        >
          <span className="text-[10px] font-black text-[#0A0A0A]">✓</span>
        </motion.div>
      </div>
      <div className="mt-3 pt-3 border-t border-white/10">
        <p className="text-white/30 text-[11px] font-medium tracking-wide uppercase">Appears in every new round</p>
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
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.75)' }}
    >
      {/* Tap backdrop to skip */}
      <div className="absolute inset-0" onClick={() => { localStorage.setItem(STORAGE_KEY, '1'); onDismiss(); }} />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="relative w-full bg-[#F8F8F6] rounded-t-3xl px-6 pt-6 pb-safe"
        onClick={e => e.stopPropagation()}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              animate={{ width: i === step ? 20 : 6, backgroundColor: i === step ? '#0A0A0A' : '#D1D5DB' }}
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
              <current.icon className="w-5 h-5" style={{ color: current.iconColor }} />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{current.subtitle}</p>
            </div>
            <h2 className="text-[26px] font-black tracking-[-0.04em] text-foreground leading-tight mb-2">
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
          className="w-full bg-foreground text-background rounded-2xl h-[54px] font-bold text-[15px] flex items-center justify-center gap-2 mb-4"
        >
          {isLast ? (
            <>
              <Sparkles className="w-5 h-5 text-[#F0EE3A]" />
              <span>Let's Build It</span>
            </>
          ) : (
            <span>Next</span>
          )}
        </motion.button>

        {/* Skip */}
        <button
          onClick={() => { localStorage.setItem(STORAGE_KEY, '1'); onDismiss(); }}
          className="w-full text-center text-[13px] text-muted-foreground pb-2"
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
