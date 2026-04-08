import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Mic, Check, ChevronRight } from 'lucide-react';
import { ParsedScore, ParseResult } from '@/lib/voiceParser';
import { getScoreColor, getScoreLabel, PlayerWithScores } from '@/types/golf';
import { cn } from '@/lib/utils';
import { ScoreInputSheet } from './ScoreInputSheet';
import { feedbackVoiceSuccess } from '@/lib/voiceFeedback';

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

const springTransition = { type: 'spring', stiffness: 300, damping: 28 };

function getScoreBorderClass(score: number, par: number): string {
  const diff = score - par;
  if (diff <= -1) return 'border-l-4 border-l-[#22C55E]';
  if (diff === 0) return 'border-l-4 border-l-border';
  return 'border-l-4 border-l-[#EF4444]';
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
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springTransition}
            className="fixed bottom-0 left-0 right-0 bg-[#F8F8F6] rounded-t-3xl z-50 shadow-2xl max-h-[85vh] flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-muted-foreground/25 rounded-full mx-auto mt-3" />

            {hasParsedScores ? (
              // Success state - show parsed scores
              <>
                {/* Header */}
                <div className="px-5 pt-3 pb-2 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-lg font-black tracking-[-0.03em]">Confirm Scores</h3>
                    <p className="text-sm text-muted-foreground px-5" style={{ paddingLeft: 0 }}>
                      Hole {holeNumber} &bull; Par {par}
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleClose}
                    className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Subtitle */}
                <p className="text-sm text-muted-foreground px-5 mb-1 shrink-0">
                  Tap a score to edit
                </p>

                {/* Parsed Scores List */}
                <div className="flex-1 overflow-auto pb-4">
                  {currentScores.map((parsedScore) => {
                    const score = parsedScore.score;
                    const label = getScoreLabel(score, par);
                    const colorClass = getScoreColor(score, par);
                    const borderClass = getScoreBorderClass(score, par);

                    return (
                      <motion.button
                        key={parsedScore.playerId}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setEditingPlayerId(parsedScore.playerId)}
                        className={cn(
                          "bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mx-5 mb-2 px-4 py-3 flex items-center justify-between w-[calc(100%-2.5rem)]",
                          borderClass
                        )}
                      >
                        <span className="font-bold text-sm text-foreground">{parsedScore.playerName}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn("font-black text-foreground tabular-nums", colorClass)}>
                            {score}
                          </span>
                          <span className={cn("text-sm text-muted-foreground")}>
                            {label}
                          </span>
                          <ChevronRight className="text-muted-foreground w-4 h-4" />
                        </div>
                      </motion.button>
                    );
                  })}

                  {/* Missing players warning */}
                  {missingPlayers.length > 0 && (
                    <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl mx-5 mb-3 p-3">
                      <p className="text-sm text-[#92400E] font-medium">
                        Didn't catch: {missingPlayers.map(p => p.name).join(', ')}
                      </p>
                      <p className="text-xs text-[#92400E]/80 mt-1">
                        You can add their scores manually after confirming
                      </p>
                    </div>
                  )}

                  {/* Transcript */}
                  <p className="mt-2 text-xs text-muted-foreground text-center px-5">
                    Heard: "{parseResult?.rawTranscript}"
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="px-5 pb-4 pt-2 shrink-0 border-t border-border/50">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirm}
                    className="bg-foreground text-background rounded-2xl w-full mb-3 py-4 font-bold text-[15px] flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Confirm
                  </motion.button>
                  <button
                    onClick={handleClose}
                    className="w-full text-muted-foreground text-sm font-medium text-center py-1"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              // Error state - couldn't parse
              <div className="px-5 pb-6 pt-4 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-6 h-6 text-muted-foreground" />
                </div>

                <h3 className="font-black text-lg tracking-[-0.02em] text-center mb-2">
                  Couldn't catch that
                </h3>

                <p className="text-muted-foreground mb-4 text-sm">
                  Try saying something like:
                </p>

                <div className="bg-muted/50 rounded-xl p-3 mx-5 mb-4">
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

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={onRetry}
                  className="bg-foreground text-background rounded-2xl w-full mb-3 py-4 font-bold text-[15px] flex items-center justify-center gap-2"
                >
                  <Mic className="w-5 h-5" />
                  Try Again
                </motion.button>
                <button
                  onClick={handleClose}
                  className="w-full text-muted-foreground text-sm font-medium text-center py-1"
                >
                  Cancel
                </button>
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
