import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Sparkles, AlertCircle, RotateCcw, Crown, Check, ArrowUpLeft } from 'lucide-react';
import { useHouseGame } from '@/hooks/useHouseGame';
import { usePersonalGameFormats } from '@/hooks/usePersonalGameFormats';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useSubscription } from '@/hooks/useSubscription';
import { PaywallModal } from '@/components/subscription/PaywallModal';
import { AIBuilderTutorial, shouldShowAIBuilderTutorial } from '@/components/golf/AIBuilderTutorial';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SetupHeader } from '@/components/golf/setupUi';

const PLACEHOLDER = `Describe your game however you want.\n\nE.g. "Nassau with 2-down auto presses, skins on the back, par 5s pay double, birdies are worth a unit."`;

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
        setParseStepIndex(i => Math.min(i + 1, PARSE_STEPS.length - 1));
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
    transcript: voiceTranscript,
    reset: resetVoice,
  } = useVoiceRecognition();

  // The voice hook publishes each finished phrase as `transcript` (it has no
  // onTranscript callback), so append every new phrase to the description once.
  const lastVoiceTranscript = useRef<string | null>(null);
  useEffect(() => {
    if (!voiceTranscript || voiceTranscript === lastVoiceTranscript.current) return;
    lastVoiceTranscript.current = voiceTranscript;
    handleVoiceTranscript(voiceTranscript);
  }, [voiceTranscript, handleVoiceTranscript]);

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
  const canBuild = description.trim().length >= 10 && !parsing;

  return (
    <div className="h-screen flex flex-col bg-background">
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

      <SetupHeader
        onBack={() => navigate(-1)}
        caption={isPersonal ? 'My Formats' : 'House Game'}
        title="AI Game Builder"
        right={
          <span className="flex-shrink-0 bg-gold text-primary text-[12px] font-bold px-2.5 py-1 rounded-full">
            {isPro ? 'PRO' : '1 FREE'}
          </span>
        }
      />

      <main className="flex-1 overflow-y-auto px-5 pt-2 pb-nav flex flex-col gap-3.5">
        {/* Hero: the describe-your-game moment */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="bg-primary rounded-[28px] p-5"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <p className="text-[12px] font-semibold text-[#CFE3D6] flex-1">Describe your game</p>
            {description.length > 0 && (
              <p className="text-[12px] font-medium text-[#CFE3D6] tabular-nums">{description.length} chars</p>
            )}
          </div>
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] leading-[1.1] text-white mt-1.5">
            Tell us how your group plays.
          </h2>
          <p className="text-[14px] leading-snug text-[#CFE3D6] mt-2">
            Bets, presses, junk, handicaps. Plain English is fine.
          </p>

          <div className="relative mt-4">
            <textarea
              ref={textareaRef}
              value={description}
              onChange={e => { setDescription(e.target.value); setParseError(null); }}
              placeholder={PLACEHOLDER}
              rows={6}
              readOnly={parsing}
              aria-label="Describe your game"
              className={cn(
                'w-full bg-card rounded-[20px] p-4 pb-16 text-[16px] text-foreground placeholder:text-muted-foreground/70 leading-relaxed resize-none border-2 outline-none focus-visible:outline-none transition-all',
                parsing && 'opacity-60',
                isListening
                  ? 'border-gold ring-4 ring-gold/30'
                  : parseError
                  ? 'border-destructive/50'
                  : 'border-transparent focus:border-gold'
              )}
            />
            {isListening && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute bottom-5 left-4 right-20 flex items-center gap-2"
              >
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-2 h-2 rounded-full bg-destructive flex-shrink-0"
                />
                {interimTranscript ? (
                  <span className="text-[13px] font-medium text-muted-foreground truncate">{interimTranscript}</span>
                ) : (
                  <span className="text-[13px] font-semibold text-destructive">Listening…</span>
                )}
              </motion.div>
            )}
            {voiceSupported && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleVoice}
                disabled={parsing}
                aria-label={isListening ? 'Stop dictation' : 'Dictate your game'}
                className={cn(
                  'absolute right-3 bottom-4 w-12 h-12 rounded-[14px] flex items-center justify-center transition-colors disabled:opacity-40',
                  isListening ? 'bg-primary' : 'bg-gold'
                )}
              >
                {isListening
                  ? <MicOff className="w-5 h-5 text-gold" />
                  : <Mic className="w-5 h-5 text-primary" />}
              </motion.button>
            )}
          </div>

          {/* Build / parsing */}
          <div className="mt-3">
            <AnimatePresence mode="wait" initial={false}>
              {parsing ? (
                <motion.div
                  key="parsing"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="h-[60px] rounded-[20px] bg-white/10 px-4 flex flex-col justify-center gap-2"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2.5">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                      className="w-4 h-4 rounded-full border-2 border-gold border-t-transparent flex-shrink-0"
                    />
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={parseStepIndex}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="text-[15px] font-semibold text-white"
                      >
                        {PARSE_STEPS[parseStepIndex]}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <div className="flex gap-1.5" aria-hidden>
                    {PARSE_STEPS.map((_, i) => (
                      <div key={i} className="h-1 flex-1 rounded-full bg-white/15 overflow-hidden">
                        <motion.div
                          className="h-full bg-gold rounded-full"
                          initial={false}
                          animate={{ scaleX: i <= parseStepIndex ? 1 : 0 }}
                          style={{ transformOrigin: 'left' }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="build"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleParse}
                  disabled={!canBuild}
                  className={cn(
                    'w-full h-[60px] rounded-[20px] text-[16px] font-bold flex items-center justify-center gap-2 transition-colors',
                    canBuild ? 'bg-gold text-primary' : 'bg-white/10 text-white/50'
                  )}
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Build my game</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <p className="text-[12px] text-[#CFE3D6] mt-3 leading-snug text-center">
            AI reads your description and maps it to scoring rules — you review everything before saving
          </p>
        </motion.section>

        {/* Parse error inline */}
        <AnimatePresence>
          {parseError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="flex items-center gap-3 bg-[#FEF3F2] border border-[#FECDCA] rounded-[20px] pl-4 pr-2 py-2"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="flex-1 text-[14px] font-semibold text-destructive leading-snug py-1">{parseError}</p>
              <button
                onClick={() => { setParseError(null); handleParse(); }}
                className="flex items-center gap-1.5 h-11 px-4 rounded-[14px] bg-card border border-[#FECDCA] text-[14px] font-bold text-destructive flex-shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Free tier notice */}
        {isPersonal && !isPro && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="flex items-center gap-3 bg-gold-muted rounded-[20px] px-4 py-3"
          >
            <Crown className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-[14px] font-medium text-primary leading-snug">
              Free plan: <span className="font-bold">1 saved format</span> — upgrade for unlimited
            </p>
          </motion.div>
        )}

        {/* Example prompts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.08 }}
        >
          <p className="text-[13px] font-semibold text-muted-foreground mt-2 mb-2 px-1">Or start from an example</p>
          <div className="space-y-2">
            {EXAMPLES.map((ex) => {
              const active = description === ex.text;
              return (
                <motion.button
                  key={ex.label}
                  whileTap={{ scale: 0.98 }}
                  disabled={parsing}
                  onClick={() => {
                    setDescription(ex.text); setParseError(null); hapticLight();
                    textareaRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
                  }}
                  className={cn(
                    'w-full text-left bg-card rounded-[20px] border px-4 py-3.5 flex items-center gap-3 transition-colors',
                    active ? 'border-primary ring-1 ring-primary' : 'border-border'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[12px] font-bold text-primary bg-gold-muted px-2.5 py-0.5 rounded-full mb-1.5">
                      {ex.label}
                    </span>
                    <p className="text-[14px] text-foreground leading-snug line-clamp-2">{ex.text}</p>
                  </div>
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                    active ? 'bg-primary' : 'bg-muted'
                  )}>
                    {active
                      ? <Check className="w-4 h-4 text-white" />
                      : <ArrowUpLeft className="w-4 h-4 text-foreground" />}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
