import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { BingoBangoHoleResult, PlayerWithScores } from '@/types/golf';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface BingoBangoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  holeNumber: number;
  players: PlayerWithScores[];
  existingResults: BingoBangoHoleResult[];
  onSave: (result: BingoBangoHoleResult) => Promise<void>;
}

const POINT_LABELS = [
  { key: 'bingoPlayerId' as const, label: 'Bingo', description: 'First ball on the green' },
  { key: 'bangoPlayerId' as const, label: 'Bango', description: 'Closest to pin when all are on' },
  { key: 'bongoPlayerId' as const, label: 'Bongo', description: 'First to hole out' },
];

export function BingoBangoSheet({
  isOpen,
  onClose,
  holeNumber,
  players,
  existingResults,
  onSave,
}: BingoBangoSheetProps) {
  const existing = existingResults.find(r => r.holeNumber === holeNumber);

  const [bingoId, setBingoId] = useState<string | null>(existing?.bingoPlayerId ?? null);
  const [bangoId, setBangoId] = useState<string | null>(existing?.bangoPlayerId ?? null);
  const [bongoId, setBongoId] = useState<string | null>(existing?.bongoPlayerId ?? null);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selections: Record<typeof POINT_LABELS[number]['key'], string | null> = {
    bingoPlayerId: bingoId,
    bangoPlayerId: bangoId,
    bongoPlayerId: bongoId,
  };
  const setters: Record<typeof POINT_LABELS[number]['key'], (id: string | null) => void> = {
    bingoPlayerId: setBingoId,
    bangoPlayerId: setBangoId,
    bongoPlayerId: setBongoId,
  };

  const handleSave = async () => {
    if (bingoId === null && bangoId === null && bongoId === null) {
      setValidationError('Assign at least one point or close to skip this hole.');
      return;
    }
    setValidationError(null);
    setSaving(true);
    await onSave({
      holeNumber,
      bingoPlayerId: bingoId,
      bangoPlayerId: bangoId,
      bongoPlayerId: bongoId,
    });
    hapticSuccess();
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-[#F8F8F6] rounded-t-3xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="w-10 h-1 bg-muted-foreground/25 rounded-full mx-auto mt-3 mb-4" />

            {/* Header */}
            <div className="px-5 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black tracking-[-0.03em] text-foreground">
                  Bingo Bango Bongo
                </h3>
                <p className="text-[12px] font-mono text-muted-foreground mt-0.5">
                  Hole {holeNumber}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { hapticLight(); onClose(); }}
                className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Point rows */}
            <div className="px-5 space-y-4 pb-5">
              {POINT_LABELS.map(({ key, label, description }) => {
                // Ghost players require physical presence — exclude from Bingo (first on green)
                // and Bango (closest to pin). Ghost CAN be Bongo (first to hole out via pickup).
                const eligiblePlayers = key === 'bongoPlayerId'
                  ? players
                  : players.filter(p => !p.isGhost);
                return (
                <div key={key}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
                    {label} — {description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {eligiblePlayers.map(player => {
                      const selected = selections[key] === player.id;
                      return (
                        <motion.button
                          key={player.id}
                          whileTap={{ scale: 0.93 }}
                          onClick={() => {
                            hapticLight();
                            setters[key](selected ? null : player.id);
                          }}
                          className={cn(
                            'px-3.5 py-2 rounded-xl text-[13px] font-bold border transition-colors',
                            selected
                              ? 'bg-[#F0EE3A] border-[#D4D200] text-[#0A0A0A]'
                              : 'bg-white border-border text-foreground'
                          )}
                        >
                          {player.name.split(' ')[0]}
                        </motion.button>
                      );
                    })}
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={() => { hapticLight(); setters[key](null); }}
                      className={cn(
                        'px-3.5 py-2 rounded-xl text-[13px] font-bold border transition-colors',
                        selections[key] === null
                          ? 'bg-muted border-border text-muted-foreground'
                          : 'bg-white border-border text-muted-foreground'
                      )}
                    >
                      None
                    </motion.button>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Validation error */}
            {validationError && (
              <p className="px-5 pb-2 text-[12px] font-medium text-[#EF4444]">
                {validationError}
              </p>
            )}

            {/* Save button */}
            <div className="px-5 pb-4">
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={saving}
                onClick={handleSave}
                className="w-full bg-foreground text-background rounded-2xl h-[52px] font-bold text-[15px] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Results'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
