import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mic, MicOff, Sparkles, ChevronRight, AlertCircle, RotateCcw } from 'lucide-react';
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
  { label: 'Nassau', text: 'Nassau $5 with auto presses when 2 down, birdie earns a unit from everyone' },
  { label: 'Skins', text: 'Skins with carryovers, par 5s worth double, settle up at the end' },
  { label: 'Wolf', text: 'Wolf with 2x lone wolf payout, full handicaps, gimmes inside 2 feet' },
  { label: 'Match Play', text: 'Match play with 90% handicap, birdies pay a unit, no blood rule' },
];

const PARSE_STEPS = [
  'Reading your description…',
  'Identifying game formats…',
  'Mapping betting rules…',
  'Building your ruleset…',
];

export default function HouseGameBuilder() {
  const { groupId } = useParams<{ groupId?: string }>();
  const isPersonal = !groupId;
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as Record<string, unknown> | null)?.returnTo as string | undefined;
  const { isPro, isLoading: subLoading } = useSubscription();
  const { parsing: groupParsing, parseDescription: groupParseDescription } = useHouseGame(isPersonal ? null : groupId ?? null);
  const { formats, loading: formatsLoading, parsing: personalParsing, parseDescription: personalParseDescription } = usePersonalGameFormats();
  const parsing = isPersonal ? personalParsing : groupParsing;
  const parseDescription = isPersonal ? personalParseDescription : groupParseDescription;
  const [description, setDescription] = useState<string>(() => {
    return ((location.state as Record<string, unknown> | null)?.prefillDescription as string) ?? '';
  });
  const [isListening, setIsListening] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseStepIndex, setParseStepIndex] = useState(0);
  const parseStepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const freeUsageExhausted = isPersonal && !isPro && formats.length >= 1;

  useEffect(() => {
    if (subLoading || formatsLoading) return;
    if (!isPersonal && !isPro) { setShowPaywall(true); return; }
    if (freeUsageExhausted) { setShowPaywall(true); return; }
    if (isPersonal && shouldShowAIBuilderTutorial()) {
      setShowTutorial(true);
    }
  }, [subLoading, formatsLoading, isPro, isPersonal, freeUsageExhausted]);

  // Cycle parse step text while parsing
  useEffect(() => {
    if (parsing) {
      setParseStepIndex(0);
      parseStepTimer.current = setInterval(() => {
        setParseStepIndex(i => (i + 1) % PARSE_STEPS.length);
      }, 900);
    } else {
      if (parseStepTimer.current) clearInterval(parseStepTimer.current);
    }
    return () => { if (parseStepTimer.current) clearInterval(parseStepTimer.current); };
  }, [parsing]);

  const handleVoiceTranscript = useCallback((text: string) => {
    setDescription(prev => prev ? `${prev} ${text}` : text);
    hapticSuccess();
  }, []);

  const {
    startListening,
    stopListening,
    isSupported: voiceSupported,
    error: voiceError,
    interimTranscript,
    reset: resetVoice,
  } = useVoiceRecognition({ continuous: true, onTranscript: handleVoiceTranscript });

  // Handle voice errors
  useEffect(() => {
    if (voiceError) {
      setIsListening(false);
      hapticError();
      toast.error('Voice not available — type your description instead');
      resetVoice();
    }
  }, [voiceError, resetVoice]);

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
    setParseError(null);
    hapticLight();
    const primitives = await parseDescription(description.trim());
    if (!primitives) {
      hapticError();
      setParseError('Couldn\'t read your game rules. Check your connection and try again.');
      return;
    }
    hapticSuccess();
    const confirmPath = isPersonal
      ? '/my-formats/confirm'
      : `/groups/${groupId}/house-game/confirm`;
    navigate(confirmPath, {
      state: { description: description.trim(), parsedPrimitives: primitives, returnTo },
    });
  };

  const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

  return (
    <div className="h-screen flex flex-col bg-[#F5F5F0]">
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
      <header className="flex-shrink-0 px-6 pt-safe-content pb-3 border-b-2 border-foreground bg-[#F5F5F0]">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white border border-border/40 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </motion.button>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {isPersonal ? 'My Formats' : 'House Game'}
            </p>
            <h1 className="text-[22px] font-black tracking-[-0.04em] text-foreground leading-none">AI Game Builder</h1>
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

      <main className="flex-1 overflow-y-auto px-6 pt-5 pb-nav flex flex-col gap-4">
        {/* Free tier notice */}
        {isPersonal && !isPro && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="flex items-center gap-2.5 bg-[#F0EE3A]/20 border border-[#F0EE3A]/50 rounded-xl px-4 py-3"
          >
            <Sparkles className="w-4 h-4 text-foreground flex-shrink-0" />
            <p className="text-[12px] font-bold text-foreground leading-snug">
              Free plan: <span className="font-black">1 saved format</span> — upgrade for unlimited
            </p>
          </motion.div>
        )}

        {/* Input section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Describe your game
            </p>
            {description.length > 0 && (
              <p className="text-[11px] text-muted-foreground">{description.length} chars</p>
            )}
          </div>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={description}
              onChange={e => { setDescription(e.target.value); setParseError(null); }}
              placeholder={PLACEHOLDER}
              rows={7}
              className={cn(
                'w-full bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] p-4 pr-14 text-[14px] text-foreground placeholder:text-muted-foreground/50 leading-relaxed resize-none border-2 outline-none transition-all',
                isListening
                  ? 'border-[#F0EE3A] ring-2 ring-[#F0EE3A]/30'
                  : parseError
                  ? 'border-red-300'
                  : 'border-transparent focus:border-foreground/20'
              )}
            />
            {voiceSupported && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={handleVoice}
                className={cn(
                  'absolute right-3 top-3 w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm',
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
                className="absolute bottom-3 left-4 right-14 flex items-center gap-2"
              >
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"
                />
                {interimTranscript ? (
                  <span className="text-[11px] font-medium text-muted-foreground truncate">{interimTranscript}</span>
                ) : (
                  <span className="text-[11px] font-bold text-red-500">Listening…</span>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Parse error inline */}
        <AnimatePresence>
          {parseError && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 -mt-1"
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[13px] font-bold text-red-700 leading-snug">{parseError}</p>
              </div>
              <button
                onClick={() => { setParseError(null); handleParse(); }}
                className="flex items-center gap-1 text-[11px] font-bold text-red-600 flex-shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Example prompts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">Try an example</p>
          <div className="grid grid-cols-2 gap-2">
            {EXAMPLES.map((ex) => (
              <motion.button
                key={ex.label}
                whileTap={{ scale: 0.96 }}
                onClick={() => { setDescription(ex.text); setParseError(null); hapticLight(); }}
                className="text-left bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-3 py-3 border-2 border-transparent active:border-foreground/20 transition-colors"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#F0EE3A] bg-foreground px-1.5 py-0.5 rounded-md inline-block mb-1.5">
                  {ex.label}
                </span>
                <p className="text-[12px] text-muted-foreground leading-snug line-clamp-2">
                  {ex.text}
                </p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
          className="pt-1"
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleParse}
            disabled={description.trim().length < 10 || parsing}
            className="w-full bg-foreground text-background rounded-2xl h-[54px] font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-40 relative overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {parsing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3"
                >
                  {/* Pulsing dots */}
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.span
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                        transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.2 }}
                        className="w-1.5 h-1.5 rounded-full bg-background"
                      />
                    ))}
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={parseStepIndex}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="text-[14px] font-bold"
                    >
                      {PARSE_STEPS[parseStepIndex]}
                    </motion.span>
                  </AnimatePresence>
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
                  <span>Build My Game</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
          <p className="text-center text-[11px] text-muted-foreground mt-2 leading-relaxed">
            AI reads your description and maps it to scoring rules — you review everything before saving
          </p>
        </motion.div>
      </main>
    </div>
  );
}
