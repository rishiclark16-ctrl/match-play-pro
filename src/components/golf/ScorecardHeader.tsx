import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MoreVertical, Flag, Share2, RotateCcw, Users, Settings } from 'lucide-react';
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
}

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
}: ScorecardHeaderProps) {
  const [showScorekeepersSheet, setShowScorekeepersSheet] = useState(false);
  const [showGameSettingsSheet, setShowGameSettingsSheet] = useState(false);

  return (
    <>
      <header
        className="flex-shrink-0 z-30 bg-background border-b-2 border-foreground pt-safe-content"
        style={{
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
        }}
      >
        <div className="pb-3 px-4 flex items-center justify-between gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={() => {
              hapticLight();
              onShowExitDialog();
            }}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label="Exit round"
          >
            <X className="w-4 h-4" />
          </motion.button>

          <div className="text-center flex-1 min-w-0">
            <h1 className="text-base font-black tracking-[-0.04em] text-foreground truncate">{round.courseName}</h1>
            <p className="text-[11px] font-mono tracking-[0.15em] text-muted-foreground">
              {isSolo ? 'SOLO' : round.joinCode}
            </p>
          </div>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-52 z-50 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] border-0 p-1"
            >
              {!isSolo && (
                <DropdownMenuItem
                  onClick={onShowShareModal}
                  className="rounded-xl text-sm font-medium py-2.5 px-3 hover:bg-muted focus:bg-muted"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Round
                </DropdownMenuItem>
              )}

              {!isSolo && canEditScores && (
                <DropdownMenuItem
                  onClick={() => setShowGameSettingsSheet(true)}
                  className="rounded-xl text-sm font-medium py-2.5 px-3 hover:bg-muted focus:bg-muted"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Game Settings
                </DropdownMenuItem>
              )}

              {!isSolo && isCreator && !isSpectator && (
                <DropdownMenuItem
                  onClick={() => setShowScorekeepersSheet(true)}
                  className="rounded-xl text-sm font-medium py-2.5 px-3 hover:bg-muted focus:bg-muted"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Manage Scorekeepers
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => toast.info('Reset feature coming soon')}
                className="rounded-xl text-sm font-medium py-2.5 px-3 hover:bg-muted focus:bg-muted"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset This Hole
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={onShowEndDialog}
                className="rounded-xl text-sm font-medium py-2.5 px-3 text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
              >
                <Flag className="w-4 h-4 mr-2" />
                End Round Early
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
