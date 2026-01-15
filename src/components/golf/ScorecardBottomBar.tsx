import { motion } from 'framer-motion';
import { BarChart3, Trophy, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceButton } from '@/components/golf/VoiceButton';
import { PropBetSheet } from '@/components/golf/PropBetSheet';
import { cn } from '@/lib/utils';
import { PlayerWithScores, HoleInfo, PropBet } from '@/types/golf';

interface ScorecardBottomBarProps {
  roundId: string;
  players: PlayerWithScores[];
  currentHole: number;
  holeInfo: HoleInfo[];
  completedHoles: number;
  totalHoles: number;
  playoffHole: number;
  canFinish: boolean;
  hole18FullyScored: boolean;
  isSpectator: boolean;
  canEditScores: boolean;
  showFinishOptions: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  propBets: PropBet[];
  onNavigateToLeaderboard: () => void;
  onVoicePress: () => void;
  onShowFinishOptions: () => void;
  onFinishRound: () => void;
  onPropBetAdded: (bet: any) => void;
  onPropBetUpdated: (bet: any) => void;
}

export function ScorecardBottomBar({
  roundId,
  players,
  currentHole,
  holeInfo,
  completedHoles,
  totalHoles,
  playoffHole,
  canFinish,
  hole18FullyScored,
  isSpectator,
  canEditScores,
  showFinishOptions,
  isListening,
  isProcessing,
  isSupported,
  propBets,
  onNavigateToLeaderboard,
  onVoicePress,
  onShowFinishOptions,
  onFinishRound,
  onPropBetAdded,
  onPropBetUpdated,
}: ScorecardBottomBarProps) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border transition-opacity',
        showFinishOptions && 'opacity-0 pointer-events-none'
      )}
    >
      <div className="px-3 py-3 flex items-center justify-between gap-2">
        {/* Leaderboard Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onNavigateToLeaderboard}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-card border border-border"
        >
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-xs">Board</span>
        </motion.button>

        {/* Voice Button - centered, only for scorekeepers */}
        {canEditScores ? (
          <VoiceButton
            isListening={isListening}
            isProcessing={isProcessing}
            isSupported={isSupported}
            onPress={onVoicePress}
          />
        ) : (
          <div className="w-14" />
        )}

        {/* Finish / Progress / Playoff */}
        {playoffHole > 0 ? (
          <div className="flex items-center gap-2">
            <div className="px-3 py-2.5 rounded-lg bg-primary/10 border-2 border-primary">
              <span className="font-bold text-xs text-primary">Playoff #{playoffHole}</span>
            </div>
            <Button
              onClick={onFinishRound}
              size="sm"
              className="px-3 py-2 h-auto rounded-lg font-bold text-xs"
            >
              <Trophy className="w-3 h-3 mr-1" />
              End
            </Button>
          </div>
        ) : canFinish && !isSpectator ? (
          <Button
            onClick={onShowFinishOptions}
            className="px-4 py-2.5 h-auto rounded-lg font-bold text-xs"
          >
            <Trophy className="w-3 h-3 mr-1" />
            Finish
          </Button>
        ) : hole18FullyScored && !isSpectator ? (
          <Button
            onClick={onShowFinishOptions}
            variant="outline"
            className="px-4 py-2.5 h-auto rounded-lg font-bold text-xs border-2 border-primary text-primary"
          >
            <Flag className="w-3 h-3 mr-1" />
            Done?
          </Button>
        ) : !isSpectator && playoffHole === 0 ? (
          <PropBetSheet
            roundId={roundId}
            players={players}
            currentHole={currentHole}
            holeInfo={holeInfo}
            propBets={propBets}
            onPropBetAdded={onPropBetAdded}
            onPropBetUpdated={onPropBetUpdated}
          />
        ) : (
          <div className="px-3 py-2.5 rounded-lg bg-card border border-border">
            <span className="font-bold tabular-nums text-xs">
              {completedHoles}/{totalHoles}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
