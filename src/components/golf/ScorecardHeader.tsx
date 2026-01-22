import { motion } from 'framer-motion';
import { X, MoreVertical, Flag, Share2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  onAddScorekeeper: (playerId: string) => Promise<boolean>;
  onRemoveScorekeeper: (playerId: string) => Promise<boolean>;
  onUpdateGames: (games: GameConfig[]) => Promise<void>;
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
}: ScorecardHeaderProps) {
  return (
    <header
      className="flex-shrink-0 z-30 bg-background border-b border-border"
      style={{
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
      }}
    >
      <div className="pt-2 pb-3 px-4 flex items-center justify-between gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            hapticLight();
            onShowExitDialog();
          }}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-muted flex items-center justify-center shrink-0 touch-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          aria-label="Exit round"
        >
          <X className="w-5 h-5" />
        </motion.button>

        <div className="text-center flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">{round.courseName}</h1>
          <p className="text-xs text-muted-foreground/80 font-mono tracking-widest uppercase">
            {round.joinCode}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCreator && !isSpectator && (
            <ManageScorekeepersSheet
              players={playersWithScores.map(p => ({
                id: p.id,
                name: p.name,
                profile_id: (p as Record<string, unknown>).profile_id as string | undefined,
                order_index: (p as Record<string, unknown>).order_index as number | undefined,
              }))}
              scorekeeperIds={scorekeeperIds}
              isCreator={isCreator}
              onAddScorekeeper={onAddScorekeeper}
              onRemoveScorekeeper={onRemoveScorekeeper}
            />
          )}

          {canEditScores && (
            <GameSettingsSheet
              round={round}
              onUpdateGames={onUpdateGames}
              playerCount={playersWithScores.length}
            />
          )}

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-muted hover:bg-muted/80 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-50" sideOffset={8}>
              <DropdownMenuItem onClick={onShowShareModal}>
                <Share2 className="w-4 h-4 mr-2" />
                Share Round
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Reset feature coming soon')}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset This Hole
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onShowEndDialog}
                className="text-destructive focus:text-destructive"
              >
                <Flag className="w-4 h-4 mr-2" />
                End Round Early
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
