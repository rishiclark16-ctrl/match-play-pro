import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Sparkles, History } from 'lucide-react';
import { toast } from 'sonner';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { hapticLight, hapticError } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { fdPrimaryCta } from '@/components/golf/setupStyles';
import { CtaFooter } from '@/components/golf/setupUi';

const EXAMPLES = [
  'Sonoma Golf Club from the blues with Jack, Jim and Tim. $5 skins',
  'Me and Jack vs Jim and Tim, $20 best ball match',
  'Front nine at the muni with Sam, no handicaps, $1 skins',
  '$5 nassau with auto presses and $2 skins with carryovers',
];

interface PlayComposerProps {
  initialText: string;
  /** A sentence that repeats the user's last round, if there is one. */
  lastRoundText: string | null;
  busy: boolean;
  /** Start listening on open (the Home mic button). */
  autoListen?: boolean;
  onSubmit: (text: string) => void;
}

/** The first tee: say or type the round. Voice first, keyboard always available. */
export function PlayComposer({ initialText, lastRoundText, busy, autoListen, onSubmit }: PlayComposerProps) {
  const [text, setText] = useState(initialText);
  const [listening, setListening] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const { startListening, stopListening, isSupported, transcript, interimTranscript, error, reset } = useVoiceRecognition();

  // Each finished phrase arrives once as `transcript`; append it.
  const lastTranscript = useRef<string | null>(null);
  useEffect(() => {
    if (!transcript || transcript === lastTranscript.current) return;
    lastTranscript.current = transcript;
    setText(t => (t.trim() ? `${t.trim()} ${transcript}` : transcript));
  }, [transcript]);

  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoListen || autoStarted.current || !isSupported) return;
    autoStarted.current = true;
    setListening(true);
    startListening();
  }, [autoListen, isSupported, startListening]);

  useEffect(() => {
    if (!error) return;
    setListening(false);
    hapticError();
    toast.error('Voice isn\'t available right now. Type it instead');
    reset();
  }, [error, reset]);

  const toggleMic = () => {
    hapticLight();
    if (listening) {
      stopListening();
      setListening(false);
    } else {
      setListening(true);
      startListening();
    }
  };

  const submit = () => {
    if (listening) {
      stopListening();
      setListening(false);
    }
    if (text.trim().length >= 3) onSubmit(text.trim());
  };

  const canSubmit = text.trim().length >= 3 && !busy;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 pb-32">
        <h1 className="mt-2 text-[34px] font-extrabold leading-[1.02] tracking-[-0.04em] text-foreground">
          What are we<br />playing today?
        </h1>
        <p className="mt-2 text-[15px] leading-snug text-muted-foreground">
          Say the course, who's playing and the game. We'll build the card.
        </p>

        <div className={cn(
          'mt-5 rounded-[20px] border-2 bg-card transition-colors',
          listening ? 'border-primary' : 'border-border focus-within:border-primary/50',
        )}>
          <textarea
            ref={textRef}
            value={listening && interimTranscript ? `${text}${text ? ' ' : ''}${interimTranscript}` : text}
            onChange={e => setText(e.target.value)}
            rows={4}
            placeholder={EXAMPLES[0]}
            aria-label="Describe your round"
            className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[18px] font-semibold leading-snug text-foreground placeholder:font-normal placeholder:text-muted-foreground/60 outline-none focus:outline-none focus-visible:outline-none"
          />
          {text && !listening && (
            <div className="flex justify-end px-3 pb-3">
              <button onClick={() => setText('')} className="text-[13px] font-semibold text-muted-foreground px-2 py-1">
                Clear
              </button>
            </div>
          )}
        </div>

        {isSupported && (
          <div className="mt-6 flex flex-col items-center">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={toggleMic}
              aria-label={listening ? 'Stop listening' : 'Tap and talk'}
              aria-pressed={listening}
              className={cn(
                'relative h-[76px] w-[76px] rounded-full flex items-center justify-center',
                listening ? 'bg-primary text-primary-foreground' : 'bg-gold text-gold-foreground',
              )}
            >
              <AnimatePresence>
                {listening && (
                  <motion.span
                    className="absolute inset-0 rounded-full border-4 border-primary"
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 1.45, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
              </AnimatePresence>
              {listening ? <Square className="h-7 w-7" fill="currentColor" /> : <Mic className="h-8 w-8" strokeWidth={2.25} />}
            </motion.button>
            <p className="mt-2.5 text-[13px] font-semibold text-muted-foreground">
              {listening ? 'Listening… tap to stop' : 'Tap and talk'}
            </p>
          </div>
        )}

        <div className="mt-7 space-y-2">
          {lastRoundText && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => { hapticLight(); setText(lastRoundText); }}
              className="w-full rounded-[18px] bg-primary/[0.06] border border-primary/15 px-4 py-3 text-left flex items-start gap-3"
            >
              <History className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 text-primary" />
              <span>
                <span className="block text-[13px] font-bold text-primary">Same as last time</span>
                <span className="block text-[14px] leading-snug text-foreground">{lastRoundText}</span>
              </span>
            </motion.button>
          )}
          <p className="pt-2 text-[12px] font-semibold text-muted-foreground">Try saying</p>
          {EXAMPLES.slice(1).map(ex => (
            <button
              key={ex}
              onClick={() => { hapticLight(); setText(ex); }}
              className="w-full rounded-[16px] bg-muted px-4 py-3 text-left text-[14px] leading-snug text-foreground flex gap-2.5"
            >
              <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              {ex}
            </button>
          ))}
        </div>
      </div>

      <CtaFooter>
        <motion.button whileTap={{ scale: 0.98 }} onClick={submit} disabled={!canSubmit} className={fdPrimaryCta}>
          Set it up
        </motion.button>
      </CtaFooter>
    </>
  );
}
