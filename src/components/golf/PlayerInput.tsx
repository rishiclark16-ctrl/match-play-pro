import { motion } from 'framer-motion';
import { X, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PlayerInputProps {
  name: string;
  handicap?: number;
  index: number;
  onNameChange: (name: string) => void;
  onHandicapChange: (handicap?: number) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function PlayerInput({
  name,
  handicap,
  index,
  onNameChange,
  onHandicapChange,
  onRemove,
  canRemove,
}: PlayerInputProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="card-premium p-4"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div className="pt-3 text-muted-foreground">
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Inputs */}
        <div className="flex-1 space-y-3">
          <Input
            placeholder={`Player ${index + 1} name`}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="py-5"
          />
          <Input
            type="number"
            placeholder="Handicap (optional)"
            value={handicap ?? ''}
            onChange={(e) => onHandicapChange(e.target.value ? Number(e.target.value) : undefined)}
            className="py-5"
            min={0}
            max={54}
          />
        </div>

        {/* Remove Button */}
        {canRemove && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onRemove}
            className="pt-3 text-muted-foreground hover:text-danger transition-colors"
          >
            <X className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
