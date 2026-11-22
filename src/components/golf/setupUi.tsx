import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fdSpring, onForestMuted } from './setupStyles';

/**
 * Fairway Day building blocks shared by the round-setup flow and the AI Game
 * Builder (New Round, House Game builder / confirm / edit, My Formats).
 * Spec: docs/design/fairway-day.md. Presentational only.
 */

interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

export function BackButton({ onClick, label = 'Back' }: BackButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      aria-label={label}
      className="w-11 h-11 rounded-[14px] bg-card border border-border flex items-center justify-center flex-shrink-0"
    >
      <ArrowLeft className="w-5 h-5 text-foreground" />
    </motion.button>
  );
}

interface SetupHeaderProps {
  onBack: () => void;
  /** Small caption above the title (sentence case). */
  caption?: ReactNode;
  title: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** Compact page header: back button, caption + title, optional right slot. */
export function SetupHeader({ onBack, caption, title, right, children, className }: SetupHeaderProps) {
  return (
    <header className={cn('flex-shrink-0 relative z-10 bg-background px-5 pt-safe-content pb-3', className)}>
      <div className="flex items-center gap-3 min-h-[44px]">
        <BackButton onClick={onBack} />
        <div className="flex-1 min-w-0">
          {caption && <p className="text-[12px] font-semibold text-muted-foreground leading-tight truncate">{caption}</p>}
          <h1 className="text-[20px] font-extrabold tracking-[-0.02em] text-foreground leading-tight truncate">{title}</h1>
        </div>
        {right}
      </div>
      {children}
    </header>
  );
}

interface HeroCardProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** Forest radius-28 hero card that holds a screen's headline. */
export function HeroCard({ eyebrow, title, body, icon, children, className }: HeroCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fdSpring}
      className={cn('bg-primary rounded-[28px] p-5 text-white', className)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {eyebrow && <p className={cn('text-[12px] font-semibold mb-1.5', onForestMuted)}>{eyebrow}</p>}
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] leading-[1.1] text-white">{title}</h2>
          {body && <p className={cn('text-[14px] leading-snug mt-2', onForestMuted)}>{body}</p>}
        </div>
        {icon}
      </div>
      {children}
    </motion.section>
  );
}

interface HeroTileProps {
  value: ReactNode;
  label: ReactNode;
  hot?: boolean;
  className?: string;
}

/** Sub-tile inside a hero card. `hot` = the single lime tile for the key number. */
export function HeroTile({ value, label, hot, className }: HeroTileProps) {
  return (
    <div className={cn('rounded-[16px] px-3 py-2.5 min-w-0', hot ? 'bg-gold' : 'bg-white/10', className)}>
      <p className={cn('text-[20px] font-extrabold tracking-[-0.02em] leading-none truncate', hot ? 'text-primary' : 'text-white')}>
        {value}
      </p>
      <p className={cn('text-[12px] font-medium mt-1 truncate', hot ? 'text-primary/80' : onForestMuted)}>{label}</p>
    </div>
  );
}

interface SectionLabelProps {
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function SectionLabel({ children, right, className }: SectionLabelProps) {
  return (
    <div className={cn('flex items-center justify-between gap-2 mt-6 mb-2 px-1', className)}>
      <p className="text-[13px] font-semibold text-muted-foreground">{children}</p>
      {right}
    </div>
  );
}

interface ChipGroupProps<T extends string | number> {
  options: readonly { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}

/** Segmented pill chips: muted fill, active = Forest with white text. */
export function ChipGroup<T extends string | number>({ options, value, onChange, className, ariaLabel }: ChipGroupProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex gap-2', className)}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <motion.button
            key={String(opt.value)}
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              'flex-1 h-11 px-4 rounded-full text-[14px] font-semibold transition-colors',
              active ? 'bg-primary text-white' : 'bg-muted text-foreground'
            )}
          >
            {opt.label}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Sticky footer that holds the Ink primary CTA. */
export function CtaFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('fixed bottom-0 left-0 right-0 z-20 px-5 pt-3 bg-background/95 backdrop-blur-sm border-t border-border', className)}
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      {children}
    </div>
  );
}
