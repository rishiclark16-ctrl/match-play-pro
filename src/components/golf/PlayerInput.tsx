import { motion } from 'framer-motion';
import { X, User } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PlayerInputProps {
  name: string;
  handicap?: number;
  manualStrokes?: number;
  index: number;
  handicapMode: 'auto' | 'manual';
  onNameChange: (name: string) => void;
  onHandicapChange: (handicap?: number) => void;
  onManualStrokesChange?: (strokes?: number) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function PlayerInput({
  name,
  handicap,
  manualStrokes,
  index,
  handicapMode,
  onNameChange,
  onHandicapChange,
  onManualStrokesChange,
  onRemove,
  canRemove,
}: PlayerInputProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-4">
        <div className="flex items-start gap-3">
          {/* Player Number */}
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-foreground font-black text-base">{index + 1}</span>
          </div>

          {/* Inputs */}
          <div className="flex-1 space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={`Player ${index + 1} name`}
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="pl-10 py-5 bg-muted/50 border-0 rounded-xl"
              />
            </div>

            {handicapMode === 'auto' ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  placeholder="Handicap (e.g., 12 or -3 for +3)"
                  value={handicap ?? ''}
                  onChange={(e) => onHandicapChange(e.target.value ? Number(e.target.value) : undefined)}
                  className="py-5 font-mono bg-muted/50 border-0 rounded-xl"
                  min={-10}
                  max={54}
                  step="0.1"
                />
                <p className="text-[10px] text-muted-foreground px-1">
                  Plus handicaps: enter negative (e.g., -3 for +3)
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="0"
                  value={manualStrokes ?? 0}
                  onChange={(e) => onManualStrokesChange?.(e.target.value ? Number(e.target.value) : 0)}
                  className="py-5 font-mono w-20 text-center bg-muted/50 border-0 rounded-xl"
                  min={0}
                  max={36}
                />
                <span className="text-sm text-muted-foreground">strokes received</span>
              </div>
            )}
          </div>

          {/* Remove Button */}
          {canRemove && (
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onRemove}
              className="w-10 h-10 rounded-xl bg-[#FEF2F2] flex items-center justify-center text-[#EF4444]"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
