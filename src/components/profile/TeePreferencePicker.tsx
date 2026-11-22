import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

/** Tee colours are the physical tee-marker colours, not brand colours. */
const PROFILE_TEE_OPTIONS = [
  { value: 'back', label: 'Black', dot: 'bg-[#1a1a1a]' },
  { value: 'blue', label: 'Blue', dot: 'bg-blue-600' },
  { value: 'white', label: 'White', dot: 'bg-white ring-1 ring-inset ring-border-strong' },
  { value: 'gold', label: 'Gold', dot: 'bg-yellow-500' },
  { value: 'red', label: 'Red', dot: 'bg-red-600' },
];

interface TeePreferencePickerProps {
  value: string | null;
  /** Called with the tapped tee, or null when the selected tee is tapped again. */
  onChange: (value: string | null) => void;
}

/** Muted-fill chips with a tee-colour dot; active = Forest with white text. */
export function TeePreferencePicker({ value, onChange }: TeePreferencePickerProps) {
  return (
    <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label="Preferred tees">
      {PROFILE_TEE_OPTIONS.map((tee) => {
        const active = value === tee.value;
        return (
          <button
            key={tee.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => { hapticLight(); onChange(active ? null : tee.value); }}
            className={cn(
              'h-11 pl-2.5 pr-3.5 rounded-full inline-flex items-center gap-2 text-[14px] font-semibold transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            )}
          >
            <span className={cn('w-4 h-4 rounded-full', tee.dot, active && 'ring-2 ring-white/80')} />
            {tee.label}
          </button>
        );
      })}
    </div>
  );
}
