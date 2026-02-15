import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Plus, Minus, ChevronLeft, ChevronRight, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
          className="fixed inset-0 z-50"
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
            className="absolute top-[70px] right-4 z-50 p-2 rounded-full bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Skip tutorial"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Tooltip card - always centered */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-sm pointer-events-auto"
            >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-4 bg-primary/5 border-b border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  {currentStepData.icon}
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  {currentStepData.title}
                </h3>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentStepData.description}
                </p>

                {/* Examples */}
                {currentStepData.examples && (
                  <div className="flex flex-wrap gap-2">
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
                  <p className="text-xs text-muted-foreground/80 italic">
                    {currentStepData.note}
                  </p>
                )}

                {/* Don't show again checkbox on last step */}
                {isLastStep && (
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input
                      type="checkbox"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-muted-foreground">
                      Don't show this again
                    </span>
                  </label>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border flex items-center justify-between">
                {/* Progress dots */}
                <div className="flex items-center gap-1.5">
                  {steps.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'w-2 h-2 rounded-full transition-colors',
                        idx === currentStep
                          ? 'bg-primary'
                          : idx < currentStep
                          ? 'bg-primary/40'
                          : 'bg-muted-foreground/30'
                      )}
                    />
                  ))}
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center gap-2">
                  {!isFirstStep && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrevious}
                      className="h-9"
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="h-9 px-4 font-semibold"
                  >
                    {isLastStep ? 'Start Scoring' : 'Next'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
