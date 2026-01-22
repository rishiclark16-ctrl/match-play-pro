import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScoreInputSheet } from '@/components/golf/ScoreInputSheet';
import { VoiceConfirmationModal } from '@/components/golf/VoiceConfirmationModal';
import { ShareJoinCodeModal } from '@/components/golf/ShareJoinCodeModal';
import { PlayoffWinnerModal } from '@/components/golf/PlayoffWinnerModal';
import { PlayoffWinner } from '@/hooks/usePlayoff';
import { PlayerWithScores } from '@/types/golf';
import { ParseResult, ParsedScore } from '@/lib/voiceParser';

interface SelectedPlayerInfo {
  name: string;
  currentHoleScore?: number;
}

interface ScorecardModalsProps {
  // Score input
  selectedPlayerId: string | null;
  selectedPlayer: SelectedPlayerInfo | undefined;
  currentHole: number;
  currentHolePar: number;
  onCloseScoreInput: () => void;
  onSelectScore: (score: number) => void;

  // Voice confirmation
  showVoiceModal: boolean;
  parseResult: ParseResult | null;
  players: PlayerWithScores[];
  onCloseVoiceModal: () => void;
  onVoiceConfirm: (scores: ParsedScore[]) => void;
  onVoiceRetry: () => void;

  // Share modal
  showShareModal: boolean;
  joinCode: string;
  courseName: string;
  roundId: string;
  onCloseShareModal: () => void;

  // Playoff winner
  showWinnerModal: boolean;
  playoffWinner: PlayoffWinner | null;
  onFinishWithWinner: () => void;

  // Exit dialog
  showExitDialog: boolean;
  onSetShowExitDialog: (show: boolean) => void;

  // End round dialog
  showEndDialog: boolean;
  onSetShowEndDialog: (show: boolean) => void;
  onFinishRound: () => void;
}

export function ScorecardModals({
  selectedPlayerId,
  selectedPlayer,
  currentHole,
  currentHolePar,
  onCloseScoreInput,
  onSelectScore,
  showVoiceModal,
  parseResult,
  players,
  onCloseVoiceModal,
  onVoiceConfirm,
  onVoiceRetry,
  showShareModal,
  joinCode,
  courseName,
  roundId,
  onCloseShareModal,
  showWinnerModal,
  playoffWinner,
  onFinishWithWinner,
  showExitDialog,
  onSetShowExitDialog,
  showEndDialog,
  onSetShowEndDialog,
  onFinishRound,
}: ScorecardModalsProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* Score Input Sheet */}
      <ScoreInputSheet
        isOpen={!!selectedPlayerId}
        onClose={onCloseScoreInput}
        onSelectScore={onSelectScore}
        playerName={selectedPlayer?.name || ''}
        holeNumber={currentHole}
        par={currentHolePar}
        currentScore={selectedPlayer?.currentHoleScore}
      />

      {/* Voice Confirmation Modal */}
      <VoiceConfirmationModal
        isOpen={showVoiceModal}
        onClose={onCloseVoiceModal}
        onConfirm={onVoiceConfirm}
        onRetry={onVoiceRetry}
        parseResult={parseResult}
        players={players}
        holeNumber={currentHole}
        par={currentHolePar}
      />

      {/* Share Join Code Modal */}
      <ShareJoinCodeModal
        isOpen={showShareModal}
        onClose={onCloseShareModal}
        joinCode={joinCode}
        courseName={courseName}
        roundId={roundId}
      />

      {/* Playoff Winner Modal */}
      <PlayoffWinnerModal
        isOpen={showWinnerModal}
        winner={playoffWinner}
        onFinish={onFinishWithWinner}
      />

      {/* Exit Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={onSetShowExitDialog}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Round?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress is saved. You can continue this round anytime from the home screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Stay</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/')} className="rounded-lg">
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Round Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={onSetShowEndDialog}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>End Round Early?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the round as complete with current scores. You won't be able to add
              more scores after this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onFinishRound}
              className="rounded-lg bg-destructive hover:bg-destructive/90"
            >
              End Round
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
