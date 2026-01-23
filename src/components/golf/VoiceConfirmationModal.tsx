import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Mic, Check, ChevronRight, Volume2 } from 'lucide-react';
import { ParsedScore, ParseResult } from '@/lib/voiceParser';
import { getScoreColor, getScoreLabel, PlayerWithScores } from '@/types/golf';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScoreInputSheet } from './ScoreInputSheet';
import { feedbackListeningStart, feedbackVoiceSuccess } from '@/lib/voiceFeedback';

interface VoiceConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scores: ParsedScore[]) => void;
  onRetry: () => void;
  parseResult: ParseResult | null;
  players: PlayerWithScores[];
  holeNumber: number;
  par: number;
}

// Voice command patterns for modal confirmation
const CONFIRM_PATTERNS = [
  /^(?:yes|yeah|yep|yup|confirm|save|correct|that'?s?\s*(?:right|correct|it)|ok(?:ay)?|affirmative|good|perfect|sounds?\s*good)$/i,
];

const RETRY_PATTERNS = [
  /^(?:no|nope|nah|retry|again|try\s*again|wrong|incorrect|cancel|redo)$/i,
];

// Parse modal voice commands
function parseModalVoiceCommand(transcript: string): 'confirm' | 'retry' | null {
  const text = transcript.toLowerCase().trim();

  for (const pattern of CONFIRM_PATTERNS) {
    if (pattern.test(text)) return 'confirm';
  }

  for (const pattern of RETRY_PATTERNS) {
    if (pattern.test(text)) return 'retry';
  }

  return null;
}

export function VoiceConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onRetry,
  parseResult,
  players,
  holeNumber,
  par,
}: VoiceConfirmationModalProps) {
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editedScores, setEditedScores] = useState<Map<string, number>>(new Map());
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const listenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if voice recognition is supported
  const isVoiceSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Start listening for voice confirmation when modal opens (with parsed scores)
  const startVoiceListening = useCallback(() => {
    if (!isVoiceSupported || editingPlayerId) return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsVoiceListening(true);
      setVoiceHint('Listening... say "yes" or "no"');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      const command = parseModalVoiceCommand(transcript);

      if (command === 'confirm') {
        feedbackVoiceSuccess();
        setVoiceHint('Confirmed!');
        setTimeout(() => {
          handleConfirm();
        }, 200);
      } else if (command === 'retry') {
        setVoiceHint('Retrying...');
        setTimeout(() => {
          onRetry();
        }, 200);
      } else {
        // Didn't understand, keep listening
        setVoiceHint(`Heard "${transcript}" - say "yes" to confirm`);
        // Restart listening after a moment
        setTimeout(() => {
          if (isOpen && parseResult?.scores?.length) {
            startVoiceListening();
          }
        }, 1500);
      }
    };

    recognition.onerror = () => {
      setIsVoiceListening(false);
      setVoiceHint(null);
    };

    recognition.onend = () => {
      setIsVoiceListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      feedbackListeningStart();
    } catch {
      // Voice recognition failed to start - silent fail
    }
  }, [isVoiceSupported, editingPlayerId, isOpen, parseResult]);

  // Stop voice listening
  const stopVoiceListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setIsVoiceListening(false);
    setVoiceHint(null);
    if (listenTimeoutRef.current) {
      clearTimeout(listenTimeoutRef.current);
      listenTimeoutRef.current = null;
    }
  }, []);

  // Auto-start voice listening when modal opens with parsed scores
  useEffect(() => {
    if (isOpen && parseResult?.scores?.length && isVoiceSupported && !editingPlayerId) {
      // Small delay before starting voice to let modal animate in
      listenTimeoutRef.current = setTimeout(() => {
        startVoiceListening();
      }, 600);
    } else {
      stopVoiceListening();
    }

    return () => {
      stopVoiceListening();
    };
  }, [isOpen, parseResult?.scores?.length, isVoiceSupported, editingPlayerId]);

  // Stop listening when editing a score
  useEffect(() => {
    if (editingPlayerId) {
      stopVoiceListening();
    }
  }, [editingPlayerId, stopVoiceListening]);

  // Merge parsed scores with any edits
  const getCurrentScores = (): ParsedScore[] => {
    if (!parseResult) return [];
    
    return parseResult.scores.map(score => ({
      ...score,
      score: editedScores.get(score.playerId) ?? score.score,
    }));
  };

  const handleScoreEdit = (playerId: string, newScore: number) => {
    setEditedScores(prev => new Map(prev).set(playerId, newScore));
    setEditingPlayerId(null);
  };

  const handleConfirm = () => {
    const finalScores = getCurrentScores();
    onConfirm(finalScores);
    setEditedScores(new Map());
  };

  const handleClose = () => {
    setEditedScores(new Map());
    onClose();
  };

  const editingPlayer = players.find(p => p.id === editingPlayerId);
  const currentScores = getCurrentScores();
  
  // Find players that weren't recognized
  const missingPlayers = players.filter(
    p => !parseResult?.scores.find(s => s.playerId === p.id)
  );

  const hasParsedScores = parseResult?.success && parseResult.scores.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl z-50 shadow-2xl max-h-[85vh] flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
            </div>

            {hasParsedScores ? (
              // Success state - show parsed scores
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 pb-4 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-foreground">Confirm Scores</h3>
                      {isVoiceListening && (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="w-3 h-3 rounded-full bg-primary"
                        />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {voiceHint || `Hole ${holeNumber} • Par ${par}`}
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleClose}
                    className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Parsed Scores List */}
                <div className="flex-1 overflow-auto px-6 pb-4">
                  <div className="space-y-2">
                    {currentScores.map((parsedScore) => {
                      const score = parsedScore.score;
                      const label = getScoreLabel(score, par);
                      const colorClass = getScoreColor(score, par);
                      
                      return (
                        <motion.button
                          key={parsedScore.playerId}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setEditingPlayerId(parsedScore.playerId)}
                          className="w-full flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-lg">{parsedScore.playerName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-2xl font-bold tabular-nums", colorClass)}>
                              {score}
                            </span>
                            <span className={cn("text-sm font-medium", colorClass)}>
                              {label}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Missing players warning */}
                  {missingPlayers.length > 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-warning/10 border border-warning/20">
                      <p className="text-sm text-warning font-medium">
                        Didn't catch: {missingPlayers.map(p => p.name).join(', ')}
                      </p>
                      <p className="text-xs text-warning/80 mt-1">
                        You can add their scores manually after confirming
                      </p>
                    </div>
                  )}

                  {/* Transcript */}
                  <p className="mt-4 text-xs text-muted-foreground text-center">
                    Heard: "{parseResult?.rawTranscript}"
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-6 pt-2 shrink-0 border-t border-border/50">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1 py-6 rounded-2xl font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirm}
                      className="flex-1 py-6 rounded-2xl font-semibold"
                    >
                      <Check className="w-5 h-5 mr-2" />
                      Confirm
                    </Button>
                  </div>
                  {isVoiceSupported && (
                    <p className="text-xs text-muted-foreground text-center mt-3">
                      <Volume2 className="w-3 h-3 inline mr-1" />
                      Say "yes" to confirm or "no" to retry
                    </p>
                  )}
                </div>
              </>
            ) : (
              // Error state - couldn't parse
              <div className="px-6 pb-6 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                
                <h3 className="text-xl font-bold mb-2">Couldn't catch that</h3>
                
                <p className="text-muted-foreground mb-4">
                  Try saying something like:
                </p>
                
                <div className="bg-muted/50 rounded-xl p-4 mb-4">
                  <p className="text-sm font-medium text-foreground">
                    "{players.slice(0, 2).map(p => `${p.name.split(' ')[0]} 5`).join(', ')}"
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    or "{players[0]?.name.split(' ')[0]} par, {players[1]?.name.split(' ')[0]} bogey"
                  </p>
                </div>
                
                {parseResult?.rawTranscript && (
                  <p className="text-xs text-muted-foreground mb-6">
                    Heard: "{parseResult.rawTranscript}"
                  </p>
                )}
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1 py-6 rounded-2xl font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={onRetry}
                    className="flex-1 py-6 rounded-2xl font-semibold"
                  >
                    <Mic className="w-5 h-5 mr-2" />
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Score Edit Sheet */}
          <ScoreInputSheet
            isOpen={!!editingPlayerId}
            onClose={() => setEditingPlayerId(null)}
            onSelectScore={(score) => editingPlayerId && handleScoreEdit(editingPlayerId, score)}
            playerName={editingPlayer?.name || ''}
            holeNumber={holeNumber}
            par={par}
            currentScore={editingPlayerId ? editedScores.get(editingPlayerId) ?? currentScores.find(s => s.playerId === editingPlayerId)?.score : undefined}
          />
        </>
      )}
    </AnimatePresence>
  );
}
