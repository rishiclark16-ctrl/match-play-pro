import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, DollarSign, Snowflake, ShieldAlert, ChevronsUp, Trophy, Search } from 'lucide-react';
import { useRoundReactions, ReactionType } from '@/hooks/useRoundReactions';
import { hapticLight } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const REACTION_CONFIG: Record<ReactionType, { label: string; icon: typeof DollarSign; color: string }> = {
  pay_up: { label: 'Pay Up', icon: DollarSign, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  cold_blooded: { label: 'Cold', icon: Snowflake, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  robbery: { label: 'Robbery', icon: ShieldAlert, color: 'text-red-500 bg-red-500/10 border-red-500/20' },
  press_that: { label: 'Press', icon: ChevronsUp, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
  respect: { label: 'Respect', icon: Trophy, color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20' },
  fraud: { label: 'Fraud', icon: Search, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
};

interface ReactionBarProps {
  roundId: string;
  compact?: boolean;
}

export function ReactionBar({ roundId, compact = false }: ReactionBarProps) {
  const { reactions, toggleReaction } = useRoundReactions(roundId);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleToggle = (type: ReactionType) => {
    hapticLight();
    toggleReaction(type);
  };

  const allTypes = Object.keys(REACTION_CONFIG) as ReactionType[];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Existing reactions */}
      {reactions.map(r => {
        const config = REACTION_CONFIG[r.type];
        const Icon = config.icon;
        return (
          <motion.button
            key={r.type}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); handleToggle(r.type); }}
            className={cn(
              'flex items-center gap-1 rounded-lg border transition-all',
              compact ? 'px-1.5 py-0.5' : 'px-2 py-1',
              r.viewerReacted
                ? config.color
                : 'bg-muted/50 border-border/40 text-muted-foreground'
            )}
          >
            <Icon className={cn(compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
            {r.count > 1 && (
              <span className={cn('font-bold', compact ? 'text-[9px]' : 'text-[10px]')}>
                {r.count}
              </span>
            )}
          </motion.button>
        );
      })}

      {/* Add reaction button */}
      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); setPickerOpen(v => !v); hapticLight(); }}
          className={cn(
            'flex items-center justify-center rounded-lg border border-dashed border-border/40 text-muted-foreground hover:bg-muted/50 transition-colors',
            compact ? 'w-6 h-5' : 'w-7 h-7'
          )}
        >
          <Plus className={cn(compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
        </motion.button>

        {/* Reaction picker */}
        <AnimatePresence>
          {pickerOpen && (
            <>
              {/* Backdrop to close picker */}
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => { e.stopPropagation(); setPickerOpen(false); }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 4 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-lg border border-border/40 p-2 flex gap-1 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {allTypes.map(type => {
                  const config = REACTION_CONFIG[type];
                  const Icon = config.icon;
                  const isActive = reactions.find(r => r.type === type)?.viewerReacted;
                  return (
                    <motion.button
                      key={type}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => { handleToggle(type); setPickerOpen(false); }}
                      className={cn(
                        'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors min-w-[48px]',
                        isActive ? config.color : 'hover:bg-muted/50'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[8px] font-bold leading-none">{config.label}</span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
