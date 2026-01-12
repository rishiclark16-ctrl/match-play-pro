import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Mic, Check, ChevronRight } from 'lucide-react';
import { ParsedScore, ParseResult } from '@/lib/voiceParser';
import { getScoreColor, getScoreLabel, PlayerWithScores } from '@/types/golf';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScoreInputSheet } from './ScoreInputSheet';

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
                    <h3 className="text-xl font-bold text-foreground">Confirm Scores</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Hole {holeNumber} • Par {par}
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
                <div className="px-6 pb-6 pt-2 flex gap-3 shrink-0 border-t border-border/50">
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
