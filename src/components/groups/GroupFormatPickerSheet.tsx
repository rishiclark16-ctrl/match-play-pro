import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check } from 'lucide-react';
import { PersonalGameFormat } from '@/types/houseGame';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

interface GroupFormatPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  formats: PersonalGameFormat[];
  currentFormatId: string | null;
  onSelect: (formatId: string) => void;
}

export function GroupFormatPickerSheet({
  isOpen,
  onClose,
  formats,
  currentFormatId,
  onSelect,
}: GroupFormatPickerSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-40"
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
            <div className="px-5 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black tracking-[-0.03em]">Assign Group Format</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">Pick a public format to share with your group</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { hapticLight(); onClose(); }}
                className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="px-5 pb-6 space-y-2 max-h-[60vh] overflow-y-auto">
              {formats.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-[13px] font-bold text-foreground mb-1">No public formats yet</p>
                  <p className="text-[12px] text-muted-foreground">Build a format and make it public first</p>
                </div>
              ) : (
                formats.map((fmt) => {
                  const isSelected = currentFormatId === fmt.id;
                  return (
                    <motion.button
                      key={fmt.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { hapticLight(); onSelect(fmt.id); }}
                      className={cn(
                        'w-full rounded-2xl p-4 flex items-center gap-3 border-2 text-left transition-all',
                        isSelected
                          ? 'bg-[#0A0A0A] border-[#0A0A0A]'
                          : 'bg-white border-border/40'
                      )}
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                        isSelected ? 'bg-[#F0EE3A]/20' : 'bg-muted'
                      )}>
                        <Sparkles className={cn('w-4 h-4', isSelected ? 'text-[#F0EE3A]' : 'text-muted-foreground')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-black text-[14px]', isSelected ? 'text-white' : 'text-foreground')}>
                          {fmt.name}
                        </p>
                        <p className={cn('text-[11px] mt-0.5 truncate', isSelected ? 'text-white/50' : 'text-muted-foreground')}>
                          {fmt.description}
                        </p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#F0EE3A] flex-shrink-0" />}
                    </motion.button>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
