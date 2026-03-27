import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { TeeSet } from '@/types/golf';
import { hapticLight } from '@/lib/haptics';
import { cn } from '@/lib/utils';

// Preset tees with standard default values
const PRESET_TEES: Omit<TeeSet, 'id'>[] = [
  { name: 'Blue',  gender: 'mens',    slope: 130, courseRating: 71.5, par: 72 },
  { name: 'White', gender: 'mens',    slope: 123, courseRating: 69.8, par: 72 },
  { name: 'Gold',  gender: 'unisex',  slope: 118, courseRating: 68.5, par: 72 },
  { name: 'Red',   gender: 'womens',  slope: 113, courseRating: 68.2, par: 72 },
];

export const TEE_VISUAL: Record<string, { badge: string; dot: string }> = {
  Blue:  { badge: 'bg-blue-500 text-white',       dot: 'bg-blue-500' },
  White: { badge: 'bg-white text-gray-700 border border-gray-300', dot: 'bg-gray-100 border border-gray-400' },
  Gold:  { badge: 'bg-yellow-400 text-yellow-900', dot: 'bg-yellow-400' },
  Red:   { badge: 'bg-red-500 text-white',         dot: 'bg-red-500' },
};

export function getTeeVisual(name: string) {
  return TEE_VISUAL[name] ?? { badge: 'bg-muted text-foreground', dot: 'bg-muted-foreground' };
}

interface MixedTeesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  teeSets: TeeSet[];
  onUpdateTeeSets: (teeSets: TeeSet[]) => void;
}

export function MixedTeesSheet({ isOpen, onClose, teeSets, onUpdateTeeSets }: MixedTeesSheetProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addPreset = (preset: Omit<TeeSet, 'id'>) => {
    if (teeSets.some(t => t.name === preset.name)) return;
    hapticLight();
    onUpdateTeeSets([...teeSets, { ...preset, id: preset.name.toLowerCase() }]);
  };

  const removeTee = (id: string) => {
    hapticLight();
    onUpdateTeeSets(teeSets.filter(t => t.id !== id));
  };

  const updateTee = (id: string, field: keyof TeeSet, value: any) => {
    onUpdateTeeSets(teeSets.map(t => t.id === id ? { ...t, [field]: value } : t));
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
            className="fixed inset-x-0 bottom-0 z-50 bg-[#F8F8F6] rounded-t-3xl max-h-[80vh] flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="w-10 h-1 bg-muted-foreground/25 rounded-full mx-auto mt-3 mb-4 flex-shrink-0" />

            {/* Header */}
            <div className="px-5 pb-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-black tracking-[-0.03em]">Configure Tees</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">Set slope and rating for each tee in play</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { hapticLight(); onClose(); }}
                className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 pb-5">
              {/* Add presets */}
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">Add Tee</p>
              <div className="flex gap-2 flex-wrap mb-5">
                {PRESET_TEES.map(preset => {
                  const already = teeSets.some(t => t.name === preset.name);
                  const visual = getTeeVisual(preset.name);
                  return (
                    <motion.button
                      key={preset.name}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => addPreset(preset)}
                      disabled={already}
                      className={cn(
                        'px-3.5 py-2 rounded-xl text-[13px] font-bold border transition-all',
                        already
                          ? 'opacity-40 border-border bg-white text-muted-foreground'
                          : cn(visual.badge, 'border-transparent')
                      )}
                    >
                      {preset.name}
                    </motion.button>
                  );
                })}
              </div>

              {/* Active tees */}
              {teeSets.length === 0 ? (
                <p className="text-[13px] text-muted-foreground text-center py-4">No tees added — tap a color above</p>
              ) : (
                <div className="space-y-2">
                  {teeSets.map(tee => {
                    const visual = getTeeVisual(tee.name);
                    const expanded = expandedId === tee.id;
                    return (
                      <div key={tee.id} className="bg-white rounded-2xl border border-border/40 overflow-hidden">
                        <button
                          onClick={() => { hapticLight(); setExpandedId(expanded ? null : tee.id); }}
                          className="w-full flex items-center gap-3 px-4 py-3"
                        >
                          <div className={cn('w-3 h-3 rounded-full flex-shrink-0', visual.dot)} />
                          <span className="text-[14px] font-bold text-foreground flex-1 text-left">{tee.name}</span>
                          <span className="text-[12px] text-muted-foreground">
                            Slope {tee.slope} · {tee.courseRating}
                          </span>
                          {expanded
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
                          }
                        </button>
                        {expanded && (
                          <div className="px-4 pb-4 border-t border-border/20 pt-3 space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1">Slope</p>
                                <input
                                  type="number"
                                  value={tee.slope}
                                  onChange={e => updateTee(tee.id, 'slope', Number(e.target.value))}
                                  min={55}
                                  max={155}
                                  className="w-full bg-muted rounded-xl px-3 py-2 text-[13px] font-bold text-foreground outline-none text-center"
                                />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1">Rating</p>
                                <input
                                  type="number"
                                  value={tee.courseRating}
                                  onChange={e => updateTee(tee.id, 'courseRating', parseFloat(e.target.value))}
                                  step={0.1}
                                  min={55}
                                  max={80}
                                  className="w-full bg-muted rounded-xl px-3 py-2 text-[13px] font-bold text-foreground outline-none text-center"
                                />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1">Par</p>
                                <input
                                  type="number"
                                  value={tee.par}
                                  onChange={e => updateTee(tee.id, 'par', Number(e.target.value))}
                                  min={27}
                                  max={73}
                                  className="w-full bg-muted rounded-xl px-3 py-2 text-[13px] font-bold text-foreground outline-none text-center"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => removeTee(tee.id)}
                              className="flex items-center gap-1.5 text-[12px] font-bold text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove {tee.name} tees
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Done */}
            <div className="px-5 pb-4 flex-shrink-0">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { hapticLight(); onClose(); }}
                className="w-full bg-foreground text-background rounded-2xl h-[52px] font-bold text-[15px]"
              >
                Done
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
