import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCog, X, Shield, Info } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface Player {
  id: string;
  name: string;
  profile_id?: string | null;
  order_index?: number;
}

interface ManageScorekeepersSheetProps {
  players: Player[];
  scorekeeperIds: string[];
  isCreator: boolean;
  onAddScorekeeper: (profileId: string) => Promise<boolean | void>;
  onRemoveScorekeeper: (profileId: string) => Promise<boolean | void>;
  // Optional controlled props for external trigger
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ManageScorekeepersSheet({
  players,
  scorekeeperIds,
  isCreator,
  onAddScorekeeper,
  onRemoveScorekeeper,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ManageScorekeepersSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  // Use controlled props if provided, otherwise use internal state
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => { })) : setInternalOpen;

  if (!isCreator) return null;

  // Max 1 additional scorekeeper (creator + 1 = 2 total)
  const MAX_ADDITIONAL_SCOREKEEPERS = 1;
  const atLimit = scorekeeperIds.length >= MAX_ADDITIONAL_SCOREKEEPERS;

  const handleToggle = async (player: Player, enabled: boolean) => {
    if (!player.profile_id) {
      toast.error('Guest players cannot be scorekeepers');
      return;
    }

    if (enabled && atLimit) {
      toast.error('Maximum of 2 scorekeepers per round');
      return;
    }

    setLoading(player.id);
    hapticLight();

    try {
      if (enabled) {
        await onAddScorekeeper(player.profile_id);
        toast.success(`${player.name} can now enter scores`);
      } else {
        await onRemoveScorekeeper(player.profile_id);
        toast.success(`${player.name} removed as scorekeeper`);
      }
      hapticSuccess();
    } catch (error) {
      toast.error('Failed to update scorekeeper');
    } finally {
      setLoading(null);
    }
  };

  const getPlayerRole = (player: Player) => {
    if (player.order_index === 0) return 'creator';
    if (player.profile_id && scorekeeperIds.includes(player.profile_id)) return 'scorekeeper';
    return 'player';
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Only render trigger when uncontrolled */}
      {!isControlled && (
        <SheetTrigger asChild>
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
          >
            <UserCog className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">Scorekeepers</span>
          </motion.button>
        </SheetTrigger>
      )}

      <SheetContent
        side="bottom"
        className="bg-[#F8F8F6] rounded-t-3xl p-0 border-0 shadow-none focus:outline-none"
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4 mt-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4">
          <h2 className="text-[20px] font-black tracking-[-0.04em] text-[#0A0A0A]">
            Manage Scorekeepers
          </h2>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setOpen(false)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        </div>

        {/* Section label */}
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-6 mb-3">
          Players ({scorekeeperIds.length}/{MAX_ADDITIONAL_SCOREKEEPERS} additional scorekeepers)
        </p>

        <div className="pb-6">
          {/* Player list */}
          <div className="space-y-0">
            {players
              .filter(player => {
                // Hide the creator — they're always a scorekeeper
                if (player.order_index === 0) return false;
                // Hide guests — they can't be scorekeepers
                if (!player.profile_id) return false;
                return true;
              })
              .map((player, index) => {
                const role = getPlayerRole(player);
                const isScorekeeper = role === 'scorekeeper';
                const isProcessing = loading === player.id;

                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
                    className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] mx-6 mb-2 px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 rounded-xl overflow-hidden bg-muted">
                        <AvatarFallback className="text-sm font-bold rounded-xl bg-muted">
                          {player.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-semibold text-foreground">{player.name}</span>
                        <div className="mt-0.5">
                          {isScorekeeper ? (
                            <span className="bg-[#F0EE3A] text-[#0A0A0A] rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                              Scorekeeper
                            </span>
                          ) : (
                            <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                              Player
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleToggle(player, !isScorekeeper)}
                      disabled={isProcessing || (atLimit && !isScorekeeper)}
                      className={cn(
                        'bg-foreground text-background rounded-xl px-3 py-1.5 text-[12px] font-bold transition-opacity',
                        (isProcessing || (atLimit && !isScorekeeper)) && 'opacity-40'
                      )}
                    >
                      {isProcessing ? '...' : isScorekeeper ? 'Remove' : 'Promote'}
                    </motion.button>
                  </motion.div>
                );
              })}

            {/* Show message if no eligible players */}
            {players.filter(p => p.order_index !== 0 && p.profile_id).length === 0 && (
              <div className="text-center py-6 text-muted-foreground mx-6">
                <p className="text-sm">No eligible players</p>
                <p className="text-xs mt-1">Only friends with accounts can be added as scorekeepers.</p>
              </div>
            )}
          </div>

          {/* Info note */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] mx-6 mt-3 p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Info className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Only friends with accounts can be scorekeepers. Remove one to add another.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
