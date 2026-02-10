import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCog, Check, X, Shield, Crown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <UserCog className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium">Scorekeepers</span>
          </motion.button>
        </SheetTrigger>
      )}
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Manage Scorekeepers
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3 pb-6">
          <p className="text-sm text-muted-foreground">
            Choose who can enter and edit scores. Max 2 scorekeepers per round (including you).
          </p>
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border">
            <span className="text-xs text-muted-foreground">Additional scorekeepers</span>
            <span className={cn("text-xs font-semibold", atLimit ? "text-amber-500" : "text-primary")}>
              {scorekeeperIds.length}/{MAX_ADDITIONAL_SCOREKEEPERS}
            </span>
          </div>

          <div className="space-y-2">
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
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-colors",
                    isScorekeeper ? "bg-accent/50 border-accent" : "bg-card border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="text-sm font-bold">
                        {player.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-semibold">{player.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {isScorekeeper ? 'Can enter scores' : 'View only'}
                      </p>
                    </div>
                  </div>

                  <Switch
                    checked={isScorekeeper}
                    onCheckedChange={(checked) => handleToggle(player, checked)}
                    disabled={isProcessing || (atLimit && !isScorekeeper)}
                  />
                </motion.div>
              );
            })}

            {/* Show message if no eligible players */}
            {players.filter(p => p.order_index !== 0 && p.profile_id).length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No eligible players</p>
                <p className="text-xs mt-1">Only friends with accounts can be added as scorekeepers.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Only friends with accounts can be scorekeepers. Remove one to add another.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
