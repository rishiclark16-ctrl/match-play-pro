import { useState, type ReactNode, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Labelled text field for the light auth sheet: white, hairline, Forest focus ring. */
export function FieldInput({ id, type, label, placeholder, value, onChange, disabled, error, autoComplete, suffix }: {
  id: string; type: string; label: string; placeholder: string; value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean; error?: string; autoComplete?: string; suffix?: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={cn('block text-[13px] font-semibold mb-1.5 transition-colors', focused ? 'text-primary' : 'text-muted-foreground')}>
        {label}
      </label>
      <div
        className={cn(
          'relative flex items-center rounded-[14px] bg-card border transition-all duration-200',
          error ? 'border-loss ring-4 ring-loss/10' : focused ? 'border-primary ring-4 ring-primary/10' : 'border-border'
        )}
      >
        <input
          id={id} type={type} placeholder={placeholder} value={value} onChange={onChange}
          disabled={disabled} autoComplete={autoComplete}
          aria-invalid={!!error}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className="flex-1 min-w-0 h-14 bg-transparent px-4 text-[16px] font-medium text-foreground placeholder:text-muted-foreground/50 outline-none focus-visible:outline-none disabled:opacity-40"
        />
        {suffix && <div className="pr-1.5">{suffix}</div>}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="text-[12px] text-loss font-semibold mt-1.5 flex items-center gap-1">
            <X className="w-3.5 h-3.5 flex-shrink-0" />{error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Strength meter + requirement chips shown under the sign-up password field. */
export function PasswordStrength({ score, color, requirements }: {
  score: number;
  color: string;
  requirements: { met: boolean; label: string }[];
}) {
  return (
    <div>
      <div className="flex gap-1 mb-2.5">
        {[0, 1, 2, 3].map((i) => (
          <motion.div key={i} className="h-1 flex-1 rounded-full"
            animate={{ backgroundColor: score > i ? color : '#E7E9E3' }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {requirements.map((r) => (
          <span key={r.label}
            className={cn(
              'inline-flex items-center gap-1 h-7 pl-2 pr-2.5 rounded-full text-[12px] font-semibold transition-colors',
              r.met ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}
          >
            {r.met ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <X className="w-3.5 h-3.5 opacity-60" />}
            {r.label}
          </span>
        ))}
      </div>
    </div>
  );
}
