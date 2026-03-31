import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Plus, Minus, ChevronLeft, ChevronRight, Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  examples?: string[];
  note?: string;
  icon: React.ReactNode;
  targetRef?: React.RefObject<HTMLElement>;
  position: 'above' | 'below' | 'center';
}

interface ScorecardTutorialProps {
  isOpen: boolean;
  onComplete: (dontShowAgain: boolean) => void;
  playerNames: string[];
  voiceButtonRef?: React.RefObject<HTMLDivElement>;
  playerCardRef?: React.RefObject<HTMLDivElement>;
  holeNavRef?: React.RefObject<HTMLDivElement>;
  leaderboardRef?: React.RefObject<HTMLDivElement>;
}

export function ScorecardTutorial({
  isOpen,
  onComplete,
  playerNames,
  voiceButtonRef,
  playerCardRef,
  holeNavRef,
  leaderboardRef,
}: ScorecardTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  // Build tutorial steps with player names - with null safety
  const player1 = (playerNames[0] || '').split(' ')[0] || 'Mike';
  const player2 = (playerNames[1] || '').split(' ')[0] || 'Tim';

  const steps: TutorialStep[] = [
    {
      id: 'voice',
      title: 'Voice Scoring',
      description: 'Tap the mic and say player names with their scores',
      examples: [
        `"${player1} 5, ${player2} 4"`,
        `"birdie for ${player1}"`,
        `"next hole"`,
        `"go to hole 14"`,
      ],
      icon: <Mic className="w-6 h-6" />,
      targetRef: voiceButtonRef,
      position: 'above',
    },
    {
      id: 'scoring',
      title: 'Quick Scores',
      description: 'Use the + and - buttons to adjust scores quickly, or tap the score box for a full keypad',
      note: 'Dots on the score show handicap strokes for this hole',
      icon: (
        <div className="flex items-center gap-1">
          <Minus className="w-5 h-5" />
          <Plus className="w-5 h-5" />
        </div>
      ),
      targetRef: playerCardRef,
      position: 'below',
    },
    {
      id: 'navigation',
      title: 'Navigate Holes',
      description: 'Swipe left or right on the hole display, or tap the arrows to change holes',
      icon: (
        <div className="flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" />
          <ChevronRight className="w-5 h-5" />
        </div>
      ),
      targetRef: holeNavRef,
      position: 'below',
    },
    {
      id: 'leaderboard',
      title: 'Live Leaderboard',
      description: 'Track standings in real-time as you play. See who\'s winning and by how much',
      icon: <Trophy className="w-6 h-6" />,
      targetRef: leaderboardRef,
      position: 'below',
    },
    {
      id: 'complete',
      title: "You're All Set!",
      description: 'When all holes are scored, tap Finish to see results and settlements',
      icon: <span className="text-2xl">🎉</span>,
      position: 'center',
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Update spotlight position when step changes
  useEffect(() => {
    if (!isOpen) return;

    const updateSpotlight = () => {
      const ref = currentStepData.targetRef;
      if (ref?.current) {
        const rect = ref.current.getBoundingClientRect();
        setSpotlightRect(rect);
      } else {
        setSpotlightRect(null);
      }
    };

    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    return () => window.removeEventListener('resize', updateSpotlight);
  }, [currentStep, isOpen, currentStepData.targetRef]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete(dontShowAgain);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLastStep, onComplete, dontShowAgain]);

  const handleSkip = useCallback(() => {
    onComplete(false);
  }, [onComplete]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  }, [isFirstStep]);

  if (!isOpen) return null;

  // Always center the tooltip - simpler and works on all screen sizes

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
        >
          {/* Dark overlay with spotlight cutout */}
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <mask id="spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {spotlightRect && (
                  <rect
                    x={spotlightRect.left - 8}
                    y={spotlightRect.top - 8}
                    width={spotlightRect.width + 16}
                    height={spotlightRect.height + 16}
                    rx="16"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.85)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* Pulsing border around spotlight */}
          {spotlightRect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute pointer-events-none"
              style={{
                left: spotlightRect.left - 8,
                top: spotlightRect.top - 8,
                width: spotlightRect.width + 16,
                height: spotlightRect.height + 16,
              }}
            >
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 0 2px hsl(var(--primary))',
                    '0 0 0 4px hsl(var(--primary) / 0.5)',
                    '0 0 0 2px hsl(var(--primary))',
                  ],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-full h-full rounded-2xl"
              />
            </motion.div>
          )}

          {/* Close button - positioned below notch/dynamic island */}
          <button
            onClick={handleSkip}
            className="absolute top-[70px] right-4 z-50 p-2 rounded-full bg-white/10 backdrop-blur-sm text-white/70 hover:text-white transition-colors"
            aria-label="Skip tutorial"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Tutorial card - always centered */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
            <div className="w-full max-w-sm pointer-events-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.16)]"
                >
                  {/* Icon / illustration area */}
                  <div className="bg-[#F8F8F6] p-8 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#F0EE3A] flex items-center justify-center text-[#0A0A0A]">
                      {currentStepData.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 pb-6 pt-4">
                    {/* Step indicator dots */}
                    <div className="flex gap-1.5 justify-center mb-4">
                      {steps.map((_, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'rounded-full transition-all',
                            idx === currentStep
                              ? 'w-4 h-1.5 bg-foreground'
                              : 'w-1.5 h-1.5 bg-muted'
                          )}
                        />
                      ))}
                    </div>

                    <h3 className="text-[20px] font-black tracking-[-0.04em] text-foreground text-center">
                      {currentStepData.title}
                    </h3>
                    <p className="text-[14px] text-muted-foreground text-center mt-2 leading-relaxed">
                      {currentStepData.description}
                    </p>

                    {/* Examples */}
                    {currentStepData.examples && (
                      <div className="flex flex-wrap gap-2 mt-3 justify-center">
                        {currentStepData.examples.map((example, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-foreground"
                          >
                            {example}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Note */}
                    {currentStepData.note && (
                      <p className="text-xs text-muted-foreground/80 italic mt-3 text-center">
                        {currentStepData.note}
                      </p>
                    )}

                    {/* Don't show again checkbox on last step */}
                    {isLastStep && (
                      <label className="flex items-center gap-2 cursor-pointer mt-3 justify-center">
                        <input
                          type="checkbox"
                          checked={dontShowAgain}
                          onChange={(e) => setDontShowAgain(e.target.checked)}
                          className="w-4 h-4 rounded border-border text-foreground focus:ring-foreground"
                        />
                        <span className="text-sm text-muted-foreground">
                          Don't show this again
                        </span>
                      </label>
                    )}

                    {/* Navigation */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleNext}
                      className="bg-foreground text-background rounded-2xl h-[52px] font-bold w-full mt-4 text-[15px]"
                    >
                      {isLastStep ? 'Start Scoring' : 'Next'}
                    </motion.button>

                    {/* Back / Skip row */}
                    <div className="flex items-center justify-between mt-1">
                      {!isFirstStep ? (
                        <button
                          onClick={handlePrevious}
                          className="text-muted-foreground text-sm font-medium py-2 px-1"
                        >
                          Back
                        </button>
                      ) : (
                        <div />
                      )}
                      <button
                        onClick={handleSkip}
                        className="text-muted-foreground text-sm font-medium py-2 px-1"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
