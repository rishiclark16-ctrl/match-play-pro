import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mic, MicOff, Sparkles, ChevronRight } from 'lucide-react';
import { useHouseGame } from '@/hooks/useHouseGame';
import { usePersonalGameFormats } from '@/hooks/usePersonalGameFormats';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useSubscription } from '@/hooks/useSubscription';
import { PaywallModal } from '@/components/subscription/PaywallModal';
import { AIBuilderTutorial, shouldShowAIBuilderTutorial } from '@/components/golf/AIBuilderTutorial';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PLACEHOLDER = `Describe your game however you want.\n\nE.g. "We play Nassau with 2-down auto presses, skins on the back with doubles on par 5s, birdies are worth an extra unit, and we net out at the end."`;

const EXAMPLES = [
  '"Nassau $5 with auto presses when 2 down, birdie earns a unit from everyone"',
  '"Skins with carryovers, par 5s worth double, settle up at the end"',
  '"Wolf with 2x lone wolf payout, full handicaps, gimmes inside 2 feet"',
  '"Match play with 90% handicap, birdies pay a unit, no blood rule"',
];

export default function HouseGameBuilder() {
  const { groupId } = useParams<{ groupId?: string }>();
  const isPersonal = !groupId;
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as any)?.returnTo as string | undefined;
  const { isPro, isLoading: subLoading } = useSubscription();
  const { parsing: groupParsing, parseDescription: groupParseDescription } = useHouseGame(isPersonal ? null : groupId ?? null);
  const { formats, loading: formatsLoading, parsing: personalParsing, parseDescription: personalParseDescription } = usePersonalGameFormats();
  const parsing = isPersonal ? personalParsing : groupParsing;
  const parseDescription = isPersonal ? personalParseDescription : groupParseDescription;
  const [description, setDescription] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Free users: allowed 1 saved personal format. Gate if they already have one.
  // Group builder always requires Pro.
  const freeUsageExhausted = isPersonal && !isPro && formats.length >= 1;

  useEffect(() => {
    if (subLoading || formatsLoading) return;
    if (!isPersonal && !isPro) { setShowPaywall(true); return; }
    if (freeUsageExhausted) { setShowPaywall(true); return; }
    // Show tutorial on first visit for personal builder
    if (isPersonal && shouldShowAIBuilderTutorial()) {
      setShowTutorial(true);
    }
  }, [subLoading, formatsLoading, isPro, isPersonal, freeUsageExhausted]);

  const { startListening, stopListening, isSupported: voiceSupported } = useVoiceRecognition({
    onResult: (transcript) => {
      setDescription(prev => prev ? `${prev} ${transcript}` : transcript);
      setIsListening(false);
      hapticSuccess();
    },
    onError: () => {
      setIsListening(false);
      hapticError();
      toast.error('Voice not available — type your description instead');
    },
  });

  const handleVoice = () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
    } else {
      hapticLight();
      setIsListening(true);
      startListening();
    }
  };

  const handleParse = async () => {
    if (!description.trim() || description.trim().length < 10) {
      toast.error('Add more detail about your game');
      return;
    }
    hapticLight();
    const primitives = await parseDescription(description.trim());
    if (!primitives) {
      toast.error('Failed to read your game rules — try again');
      return;
    }
    // Navigate to confirm screen with parsed results
    const confirmPath = isPersonal
      ? '/my-formats/confirm'
      : `/groups/${groupId}/house-game/confirm`;
    navigate(confirmPath, {
      state: { description: description.trim(), parsedPrimitives: primitives, returnTo },
    });
  };

  const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

  return (
    <div className="h-screen flex flex-col bg-[#F8F8F6]">
      <PaywallModal
        open={showPaywall}
        onOpenChange={(open) => {
          setShowPaywall(open);
          if (!open && (freeUsageExhausted || (!isPersonal && !isPro))) navigate(-1);
        }}
        feature="House Game"
      />
      <AnimatePresence>
        {showTutorial && (
          <AIBuilderTutorial onDismiss={() => setShowTutorial(false)} />
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="flex-shrink-0 px-6 pt-safe-content pb-3 border-b-2 border-foreground">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </motion.button>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">House Game</p>
            <h1 className="text-[22px] font-black tracking-[-0.04em] text-foreground leading-none">Build Your Game</h1>
          </div>
          {isPro ? (
            <div className="ml-auto bg-foreground text-[#F0EE3A] text-[9px] font-black tracking-[0.1em] px-2 py-1 rounded-lg">
              PRO
            </div>
          ) : (
            <div className="ml-auto bg-[#F0EE3A] text-[#0A0A0A] text-[9px] font-black tracking-[0.1em] px-2 py-1 rounded-lg">
              1 FREE
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
        {/* Free tier notice */}
        {isPersonal && !isPro && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="flex items-center gap-2.5 bg-[#F0EE3A]/20 border border-[#F0EE3A]/40 rounded-xl px-4 py-3"
          >
            <span className="text-[18px]">✦</span>
            <p className="text-[12px] font-bold text-foreground leading-snug">
              Free plan includes <span className="text-[#0A0A0A]">1 saved format</span> — upgrade for unlimited
            </p>
          </motion.div>
        )}
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="bg-[#0A0A0A] rounded-2xl p-5"
        >
          <Sparkles className="w-6 h-6 text-[#F0EE3A] mb-3" />
          <p className="text-white font-bold text-[15px] leading-snug mb-1">
            Describe your Saturday game in plain English
          </p>
          <p className="text-white/50 text-[13px] leading-relaxed">
            {isPersonal
              ? 'AI reads your description and builds a custom scoring ruleset. Save it and pick it anytime when starting a round.'
              : 'AI reads your description and builds a custom scoring ruleset for your group. Every round with this group auto-loads your House Game.'}
          </p>
        </motion.div>

        {/* Text input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="relative"
        >
          <textarea
            ref={textareaRef}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={7}
            className={cn(
              'w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 pr-14 text-[14px] text-foreground placeholder:text-muted-foreground/60 leading-relaxed resize-none border-0 outline-none focus:ring-2 focus:ring-foreground/20',
              isListening && 'ring-2 ring-[#F0EE3A]'
            )}
          />
          {/* Voice button */}
          {voiceSupported && (
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleVoice}
              className={cn(
                'absolute right-3 top-3 w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                isListening ? 'bg-[#F0EE3A]' : 'bg-muted'
              )}
            >
              {isListening
                ? <MicOff className="w-4 h-4 text-[#0A0A0A]" />
                : <Mic className="w-4 h-4 text-foreground" />
              }
            </motion.button>
          )}
          {isListening && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-3 left-4 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
              <span className="text-[11px] font-bold text-[#EF4444]">Listening...</span>
            </motion.div>
          )}
        </motion.div>

        {/* Character count */}
        {description.length > 0 && (
          <p className="text-[11px] text-muted-foreground text-right -mt-3">
            {description.length} characters
          </p>
        )}

        {/* Example prompts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">Examples</p>
          <div className="space-y-2">
            {EXAMPLES.map((ex, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setDescription(ex.replace(/^"|"$/g, '')); hapticLight(); }}
                className="w-full text-left bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-4 py-3 flex items-center gap-3"
              >
                <span className="text-[13px] text-muted-foreground flex-1 leading-snug">{ex}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </main>

      {/* CTA */}
      <div className="flex-shrink-0 px-6 pb-safe pt-4 border-t border-border/30 bg-[#F8F8F6]">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleParse}
          disabled={description.trim().length < 10 || parsing}
          className="w-full bg-foreground text-background rounded-2xl h-[54px] font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <AnimatePresence mode="wait">
            {parsing ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-5 h-5 rounded-full border-2 border-background border-t-transparent"
                />
                <span>Reading your game rules...</span>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Parse My Game</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
