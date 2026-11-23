import { motion } from 'framer-motion';
import { Sparkles, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';
import { Switch } from '@/components/ui/switch';
import { buildConfig, summarizeScoringConfig } from '@/engine/HouseGameEngine';
import { UseThisGameButton } from './UseThisGameButton';
import { sectionLabel, springTransition } from './formatStepStyles';
import type { PersonalGameFormat } from '@/types/houseGame';

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
  /** Kept for API compatibility; the active-format summary now lives in FormatStep's hero. */
  formatActive?: boolean;
  selectedFormatName?: string;
  /** Show "Use this game" button on the group-assigned card (for non-owners). */
  onUseThisGame?: (format: PersonalGameFormat) => void;
  isPro?: boolean;
  onPaywall?: () => void;
}

interface FormatRowProps {
  name: string;
  summary: string;
  selected: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}

function FormatRow({ name, summary, selected, onToggle, badge, children }: FormatRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springTransition}
      onClick={() => { hapticLight(); onToggle(); }}
      className={cn(
        'bg-card rounded-[20px] border p-4 mb-2 cursor-pointer transition-colors',
        selected ? 'border-primary ring-1 ring-primary' : 'border-border'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0 transition-colors',
          selected ? 'bg-primary' : 'bg-gold-muted'
        )}>
          <Sparkles className={cn('w-5 h-5', selected ? 'text-gold' : 'text-primary')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-[16px] font-semibold text-foreground truncate">{name}</p>
            {badge}
          </div>
          {summary && <p className="text-[13px] text-muted-foreground truncate mt-0.5">{summary}</p>}
        </div>
        <Switch
          checked={selected}
          onCheckedChange={() => { hapticLight(); onToggle(); }}
          onClick={e => e.stopPropagation()}
          aria-label={`Use ${name}`}
        />
      </div>
      {children}
    </motion.div>
  );
}

/**
 * The "Saved formats" block above the per-game toggles inside FormatStep:
 *   1. Group-assigned format row (optional)
 *   2. Personal saved formats with switches
 *   3. "Build new format" entry to the AI Game Builder
 */
export function SavedFormatsPicker({
  groupAssignedFormat,
  personalFormats,
  selectedPersonalFormatId,
  onPersonalFormatSelect,
  onBuildNewFormat,
  onUseThisGame,
  isPro,
  onPaywall,
}: SavedFormatsPickerProps) {
  return (
    <>
      {groupAssignedFormat && (
        <>
          <p className={sectionLabel}>Group format</p>
          <FormatRow
            name={groupAssignedFormat.name}
            summary={summarizeScoringConfig(buildConfig(groupAssignedFormat.activePrimitives), 2).join(' · ') || groupAssignedFormat.description}
            selected={selectedPersonalFormatId === groupAssignedFormat.id}
            onToggle={() => onPersonalFormatSelect?.(selectedPersonalFormatId === groupAssignedFormat.id ? null : groupAssignedFormat.id)}
            badge={
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                <Users className="w-3 h-3" /> Group
              </span>
            }
          >
            {onUseThisGame && (
              <UseThisGameButton
                isPro={isPro ?? false}
                onUse={() => onUseThisGame(groupAssignedFormat)}
                onPaywall={() => onPaywall?.()}
              />
            )}
          </FormatRow>
        </>
      )}

      {personalFormats !== undefined && (
        <>
          <p className={sectionLabel}>My saved formats</p>
          {personalFormats.map(fmt => {
            const isSelected = selectedPersonalFormatId === fmt.id;
            const lines = summarizeScoringConfig(buildConfig(fmt.activePrimitives), 2);
            return (
              <FormatRow
                key={fmt.id}
                name={fmt.name}
                summary={lines.join(' · ')}
                selected={isSelected}
                onToggle={() => onPersonalFormatSelect?.(isSelected ? null : fmt.id)}
              />
            );
          })}
          {onBuildNewFormat && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
              whileTap={{ scale: 0.98 }}
              onClick={onBuildNewFormat}
              className="w-full bg-card rounded-[20px] border border-dashed border-primary/40 p-4 mb-2 flex items-center gap-3 text-left"
            >
              <div className="w-11 h-11 rounded-[14px] bg-gold flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-semibold text-foreground">Build new format</p>
                <p className="text-[13px] text-muted-foreground mt-0.5">Describe your game, AI sets up the rules</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </motion.button>
          )}
        </>
      )}
    </>
  );
}
