import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MoreVertical, Flag, Share2, RotateCcw, Users, Settings, BarChart3 } from 'lucide-react';
import type { ReactNode } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ManageScorekeepersSheet } from '@/components/golf/ManageScorekeepersSheet';
import { GameSettingsSheet } from '@/components/golf/GameSettingsSheet';
import { Round, PlayerWithScores, GameConfig } from '@/types/golf';
import { hapticLight } from '@/lib/haptics';
import { toast } from 'sonner';

interface ScorecardHeaderProps {
  round: Round;
  playersWithScores: PlayerWithScores[];
  isCreator: boolean;
  isSpectator: boolean;
  canEditScores: boolean;
  scorekeeperIds: string[];
  onShowExitDialog: () => void;
  onShowShareModal: () => void;
  onShowEndDialog: () => void;
  onAddScorekeeper: (playerId: string) => Promise<void>;
  onRemoveScorekeeper: (playerId: string) => Promise<void>;
  onUpdateGames: (games: GameConfig[]) => Promise<void>;
  /** Solo round — hide Share / Scorekeepers / Game Settings / join code. */
  isSolo?: boolean;
  /** Holes fully scored, shown in the caption ("7 of 18 done"). */
  completedHoles?: number;
  onNavigateToLeaderboard?: () => void;
  /** Side-bets trigger (PropBetSheet), rendered as a header icon button. */
  sideBets?: ReactNode;
}

const iconButton =
  'w-11 h-11 rounded-[14px] bg-white border border-[#E7E9E3] text-[#0F1F17] flex items-center justify-center shrink-0 touch-manipulation active:bg-[#F0F2EC]';

export function ScorecardHeader({
  round,
  playersWithScores,
  isCreator,
  isSpectator,
  canEditScores,
  scorekeeperIds,
  onShowExitDialog,
  onShowShareModal,
  onShowEndDialog,
  onAddScorekeeper,
  onRemoveScorekeeper,
  onUpdateGames,
  isSolo = false,
  completedHoles,
  onNavigateToLeaderboard,
  sideBets,
}: ScorecardHeaderProps) {
  const [showScorekeepersSheet, setShowScorekeepersSheet] = useState(false);
  const [showGameSettingsSheet, setShowGameSettingsSheet] = useState(false);

  return (
    <>
      <header
        className="flex-shrink-0 z-30 bg-[#FAFAF7] pt-safe-content"
        style={{
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
        }}
      >
        <div className="pb-2 px-3.5 flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={() => {
              hapticLight();
              onShowExitDialog();
            }}
            className={iconButton}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label="Exit round"
          >
            <X className="w-5 h-5" />
          </motion.button>

          <div className="flex-1 min-w-0 pl-1">
            <h1 className="text-[17px] font-bold tracking-[-0.02em] text-[#0F1F17] truncate leading-tight">{round.courseName}</h1>
            <p className="text-[12px] font-medium text-[#5A6B61] truncate tabular-nums leading-tight mt-0.5">
              {isSolo ? 'Solo round' : `Code ${round.joinCode}`}
              {completedHoles !== undefined && ` · ${completedHoles}/${round.holes}`}
            </p>
          </div>

          {/* Live leaderboard — not for solo rounds */}
          {!isSolo && onNavigateToLeaderboard && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={onNavigateToLeaderboard}
              className={iconButton}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label="View leaderboard"
            >
              <BarChart3 className="w-5 h-5" />
            </motion.button>
          )}

          {/* Side bets (CTP, greenie, sandie…) */}
          {sideBets}

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className={iconButton}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-56 z-50 bg-white rounded-[20px] shadow-[0_8px_28px_rgba(15,31,23,0.12)] border border-[#E7E9E3] p-1.5"
            >
              {!isSolo && (
                <DropdownMenuItem
                  onClick={onShowShareModal}
                  className="rounded-[14px] text-[15px] font-medium min-h-[44px] px-3 hover:bg-muted focus:bg-muted"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share round
                </DropdownMenuItem>
              )}

              {!isSolo && canEditScores && (
                <DropdownMenuItem
                  onClick={() => setShowGameSettingsSheet(true)}
                  className="rounded-[14px] text-[15px] font-medium min-h-[44px] px-3 hover:bg-muted focus:bg-muted"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Game settings
                </DropdownMenuItem>
              )}

              {!isSolo && isCreator && !isSpectator && (
                <DropdownMenuItem
                  onClick={() => setShowScorekeepersSheet(true)}
                  className="rounded-[14px] text-[15px] font-medium min-h-[44px] px-3 hover:bg-muted focus:bg-muted"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Manage scorekeepers
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => toast.info('Reset feature coming soon')}
                className="rounded-[14px] text-[15px] font-medium min-h-[44px] px-3 hover:bg-muted focus:bg-muted"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset this hole
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={onShowEndDialog}
                className="rounded-[14px] text-[15px] font-medium min-h-[44px] px-3 text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
              >
                <Flag className="w-4 h-4 mr-2" />
                End round early
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Sheets rendered outside header for proper stacking */}
      {isCreator && !isSpectator && (
        <ManageScorekeepersSheet
          players={playersWithScores.map(p => ({
            id: p.id,
            name: p.name,
            profile_id: p.profileId,
            order_index: p.orderIndex,
          }))}
          scorekeeperIds={scorekeeperIds}
          isCreator={isCreator}
          onAddScorekeeper={onAddScorekeeper}
          onRemoveScorekeeper={onRemoveScorekeeper}
          open={showScorekeepersSheet}
          onOpenChange={setShowScorekeepersSheet}
        />
      )}

      {canEditScores && (
        <GameSettingsSheet
          round={round}
          onUpdateGames={onUpdateGames}
          playerCount={playersWithScores.length}
          open={showGameSettingsSheet}
          onOpenChange={setShowGameSettingsSheet}
        />
      )}
    </>
  );
}
