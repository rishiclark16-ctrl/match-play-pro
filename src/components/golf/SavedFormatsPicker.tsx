import { motion } from 'framer-motion';
import { Sparkles, ToggleLeft, ToggleRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';
import { buildConfig, summarizeScoringConfig } from '@/engine/HouseGameEngine';
import { UseThisGameButton } from './UseThisGameButton';
import type { PersonalGameFormat } from '@/types/houseGame';

const springTransition = { type: 'spring', stiffness: 300, damping: 28 };
const sectionLabel = 'text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2 mt-5';

export interface SavedFormatsPickerProps {
  /** Group's currently-assigned format, if any. Always shown above the saved-formats list. */
  groupAssignedFormat?: PersonalGameFormat | null;
  /** User's personal saved formats. Pass `undefined` to hide the entire saved-formats UI. */
  personalFormats?: PersonalGameFormat[];
  selectedPersonalFormatId?: string | null;
  /** Called when the user toggles a format on/off (passes null when toggling off). */
  onPersonalFormatSelect?: (id: string | null) => void;
  /** Called when the user taps the "Build New Format" CTA. Hidden if not provided. */
  onBuildNewFormat?: () => void;
  /** True when a format is selected — renders the active-banner with rule pills. */
  formatActive?: boolean;
  selectedFormatName?: string;
  /** Show "Use this game" button on the group-assigned card (for non-owners). */
  onUseThisGame?: (format: PersonalGameFormat) => void;
  isPro?: boolean;
  onPaywall?: () => void;
}

/**
 * The "Saved Formats" UX block that lives above the per-game scoring toggles
 * inside FormatStep:
 *   1. Group-assigned format card (optional)
 *   2. List of personal saved formats with toggle switches + Build-New CTA
 *   3. Format-active banner with summarized rule pills
 *
 * Extracted from FormatStep.tsx so the parent can stay focused on per-game
 * scoring controls.
 */
export function SavedFormatsPicker({
  groupAssignedFormat,
  personalFormats,
  selectedPersonalFormatId,
  onPersonalFormatSelect,
  onBuildNewFormat,
  formatActive,
  selectedFormatName,
  onUseThisGame,
  isPro,
  onPaywall,
}: SavedFormatsPickerProps) {
  return (
    <>
      {/* Group-assigned format */}
      {groupAssignedFormat && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground mb-2">Group Format</p>
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              hapticLight();
              const newId = selectedPersonalFormatId === groupAssignedFormat.id ? null : groupAssignedFormat.id;
              onPersonalFormatSelect?.(newId);
            }}
            className={cn(
              'w-full rounded-2xl p-4 border-2 cursor-pointer transition-all',
              selectedPersonalFormatId === groupAssignedFormat.id
                ? 'bg-[#0A0A0A] border-[#0A0A0A]'
                : 'bg-white border-border/40'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                selectedPersonalFormatId === groupAssignedFormat.id ? 'bg-[#F0EE3A]/20' : 'bg-muted'
              )}>
                <Sparkles className={cn('w-4 h-4', selectedPersonalFormatId === groupAssignedFormat.id ? 'text-[#F0EE3A]' : 'text-muted-foreground')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('font-black text-[14px] leading-tight', selectedPersonalFormatId === groupAssignedFormat.id ? 'text-white' : 'text-foreground')}>
                  {groupAssignedFormat.name}
                </p>
                <p className={cn('text-[11px] mt-0.5 leading-snug', selectedPersonalFormatId === groupAssignedFormat.id ? 'text-white/50' : 'text-muted-foreground')}>
                  {groupAssignedFormat.description.slice(0, 80)}{groupAssignedFormat.description.length > 80 ? '…' : ''}
                </p>
              </div>
            </div>
            {/* Use This Game button — only for non-owners */}
            {onUseThisGame && (
              <UseThisGameButton
                isPro={isPro ?? false}
                onUse={() => onUseThisGame(groupAssignedFormat)}
                onPaywall={() => onPaywall?.()}
              />
            )}
          </motion.div>
        </motion.div>
      )}

      {/* My Saved Formats section */}
      {personalFormats !== undefined && (
        <>
          <p className={sectionLabel}>My Saved Formats</p>
          {personalFormats.length === 0 ? null : personalFormats.map(fmt => {
            const isSelected = selectedPersonalFormatId === fmt.id;
            const cfg = buildConfig(fmt.activePrimitives);
            const lines = summarizeScoringConfig(cfg, 2);
            return (
              <motion.div
                key={fmt.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springTransition}
                className={cn(
                  'rounded-2xl border-2 px-4 py-3 flex items-center gap-3 transition-colors mb-2',
                  isSelected ? 'bg-[#0A0A0A] border-[#0A0A0A]' : 'bg-white border-border/40'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                  isSelected ? 'bg-[#F0EE3A]' : 'bg-muted'
                )}>
                  <Sparkles className={cn('w-4 h-4', isSelected ? 'text-[#0A0A0A]' : 'text-muted-foreground')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-[13px] font-bold truncate', isSelected ? 'text-white' : 'text-foreground')}>
                    {fmt.name}
                  </p>
                  {lines.length > 0 && (
                    <p className={cn('text-[11px] truncate', isSelected ? 'text-white/50' : 'text-muted-foreground')}>
                      {lines.join(' · ')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onPersonalFormatSelect?.(isSelected ? null : fmt.id)}
                  className="flex-shrink-0"
                >
                  {isSelected
                    ? <ToggleRight className="w-7 h-7 text-[#F0EE3A]" />
                    : <ToggleLeft className="w-7 h-7 text-muted-foreground" />
                  }
                </button>
              </motion.div>
            );
          })}
          {onBuildNewFormat && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
              whileTap={{ scale: 0.97 }}
              onClick={onBuildNewFormat}
              className="w-full flex items-center justify-center gap-2 py-2.5 mb-2 text-[13px] font-bold text-foreground"
            >
              <Plus className="w-4 h-4" />
              Build New Format
            </motion.button>
          )}
        </>
      )}

      {/* Format Active Banner */}
      {formatActive && (() => {
        const selectedFmt = personalFormats?.find(f => f.id === selectedPersonalFormatId) ?? groupAssignedFormat;
        const rulePills = selectedFmt
          ? summarizeScoringConfig(buildConfig(selectedFmt.activePrimitives), 6)
          : [];
        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0A0A0A] rounded-2xl p-4 mb-3 mt-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F0EE3A]/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-[#F0EE3A]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black text-white truncate">
                  {selectedFormatName ?? 'Format'} is active
                </p>
                <p className="text-[11px] text-white/50 mt-0.5">
                  Your format controls all scoring, bets &amp; handicaps
                </p>
              </div>
            </div>
            {rulePills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {rulePills.map((pill) => (
                  <span
                    key={pill}
                    className="text-[10px] font-bold bg-white/10 text-white/70 px-2.5 py-1 rounded-full"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        );
      })()}
    </>
  );
}
