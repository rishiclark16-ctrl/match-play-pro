import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fdCard, fdInput } from './setupStyles';

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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
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
  const filled = name.trim().length > 0;
  const mark = initials(name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="mb-2"
    >
      <div className={cn(fdCard, 'p-3')}>
        <div className="flex items-center gap-3">
          {/* Player mark */}
          <div
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-[15px] font-extrabold',
              filled ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
            )}
            aria-hidden
          >
            {mark || index + 1}
          </div>

          <input
            placeholder={`Player ${index + 1} name`}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className={cn(fdInput, 'flex-1 min-w-0')}
            aria-label={`Player ${index + 1} name`}
            autoComplete="off"
          />

          {canRemove && (
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onRemove}
              aria-label={`Remove player ${index + 1}`}
              className="w-11 h-11 rounded-[14px] bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0"
            >
              <X className="w-[18px] h-[18px]" />
            </motion.button>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2 pl-14">
          {handicapMode === 'auto' ? (
            <>
              <label className="text-[13px] font-semibold text-muted-foreground flex-shrink-0" htmlFor={`hcp-${index}`}>
                Handicap
              </label>
              <input
                id={`hcp-${index}`}
                type="number"
                inputMode="decimal"
                placeholder="12.4"
                value={handicap ?? ''}
                onChange={(e) => onHandicapChange(e.target.value ? Number(e.target.value) : undefined)}
                className={cn(fdInput, 'w-24 h-11 text-center tabular-nums')}
                aria-label="Handicap index"
                min={-10}
                max={54}
                step="0.1"
              />
              <p className="text-[12px] text-muted-foreground leading-tight">Plus handicap? Enter −3 for +3</p>
            </>
          ) : (
            <>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={manualStrokes ?? 0}
                onChange={(e) => onManualStrokesChange?.(e.target.value ? Number(e.target.value) : 0)}
                className={cn(fdInput, 'w-20 h-11 text-center tabular-nums')}
                aria-label="Strokes received"
                min={0}
                max={36}
              />
              <span className="text-[14px] text-muted-foreground">strokes received</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
