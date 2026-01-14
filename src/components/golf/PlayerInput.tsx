import { motion } from 'framer-motion';
import { X, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';

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
    >
      <TechCard>
        <TechCardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Player Number */}
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-lg">{index + 1}</span>
            </div>

            {/* Inputs */}
            <div className="flex-1 space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={`Player ${index + 1} name`}
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  className="pl-10 py-5"
                />
              </div>
              
              {handicapMode === 'auto' ? (
                <Input
                  type="number"
                  placeholder="Handicap (optional)"
                  value={handicap ?? ''}
                  onChange={(e) => onHandicapChange(e.target.value ? Number(e.target.value) : undefined)}
                  className="py-5 font-mono"
                  min={0}
                  max={54}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="0"
                    value={manualStrokes ?? 0}
                    onChange={(e) => onManualStrokesChange?.(e.target.value ? Number(e.target.value) : 0)}
                    className="py-5 font-mono w-20 text-center"
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
                whileTap={{ scale: 0.9 }}
                onClick={onRemove}
                className="w-10 h-10 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center text-danger hover:bg-danger/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        </TechCardContent>
      </TechCard>
    </motion.div>
  );
}
