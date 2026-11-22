// Presentational pieces of the AI Game Builder review screen (HouseGameConfirm).
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Check, Flag, PencilLine, Sparkles } from 'lucide-react';
import type { ParsedPrimitive } from '@/types/houseGame';
import { cn } from '@/lib/utils';
import { ConfidenceBars } from './HouseGamePrimitives';

// ── Forest summary hero ────────────────────────────────────────────────────────
interface ConfirmHeroProps {
  description: string;
  foundCount: number;
  checkedCount: number;
  infeasibleCount: number;
  parsedPrimitives: ParsedPrimitive[];
  onRefine: () => void;
}

export function ConfirmHero({ description, foundCount, checkedCount, infeasibleCount, parsedPrimitives, onRefine }: ConfirmHeroProps) {
  const counts = (['high', 'medium', 'low'] as const)
    .map(level => ({ level, n: parsedPrimitives.filter(p => p.confidence === level).length }))
    .filter(c => c.n > 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="bg-primary rounded-[28px] p-5"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-gold" />
        <p className="text-[12px] font-semibold text-[#CFE3D6]">AI read your game</p>
      </div>
      <h2 className="text-[26px] font-extrabold tracking-[-0.02em] leading-[1.1] text-white mt-1.5">
        Found {foundCount} rule{foundCount !== 1 ? 's' : ''} in your description
      </h2>
      {description && (
        <p className="text-[14px] text-[#CFE3D6] leading-snug mt-2 line-clamp-3 italic">"{description}"</p>
      )}

      <div className="flex items-stretch gap-2 mt-4">
        <div className="rounded-[16px] bg-gold px-3 py-2.5 min-w-[92px]">
          <p className="text-[20px] font-extrabold tracking-[-0.02em] leading-none text-primary tabular-nums">
            {checkedCount}
          </p>
          <p className="text-[12px] font-medium mt-1 text-primary/80">rules on</p>
        </div>
        <div className="flex-1 rounded-[16px] bg-white/10 px-3 py-2.5 flex flex-col justify-center gap-1">
          {counts.length > 0 ? counts.map(({ level, n }) => (
            <p key={level} className="flex items-center gap-2 text-[13px] text-white">
              <ConfidenceBars level={level} className={level === 'low' ? 'text-[#FCD34D]' : 'text-gold'} />
              <span className="font-semibold tabular-nums">{n}</span>
              <span className="text-[#CFE3D6]">{level}</span>
            </p>
          )) : (
            <p className="text-[13px] text-[#CFE3D6]">Pick rules below</p>
          )}
        </div>
      </div>

      {infeasibleCount > 0 && (
        <p className="text-[13px] text-[#FCD34D] mt-3 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> {infeasibleCount} can't be created
        </p>
      )}

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onRefine}
        className="mt-4 w-full h-11 rounded-[14px] bg-white/10 text-white text-[14px] font-semibold flex items-center justify-center gap-2"
      >
        <PencilLine className="w-4 h-4" />
        Refine description
      </motion.button>
    </motion.section>
  );
}

// ── Amber notice card ──────────────────────────────────────────────────────────
export function NoticeCard({ title, children, className }: { title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('bg-[#FFFBEB] border border-[#FDE68A] rounded-[20px] px-4 py-3', className)}>
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 text-[#B45309] flex-shrink-0 mt-px" />
        <div className="min-w-0">
          <p className="text-[#7C4A03] font-semibold text-[14px] leading-snug">{title}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Rules the app can't track ──────────────────────────────────────────────────
export function InfeasibleList({ items }: { items: ParsedPrimitive[] }) {
  return (
    <div className="space-y-2">
      <NoticeCard title="These can't be tracked in the app">
        <p className="text-[13px] text-[#7C4A03]/80 leading-snug mt-0.5">Handle them with your group by hand.</p>
      </NoticeCard>
      {items.map(p => (
        <div key={p.id} className="rounded-[20px] px-4 py-3 border border-dashed border-[#FDE68A] bg-card">
          <p className="text-[15px] font-semibold text-foreground">
            {p.label ?? p.id.replace('custom_', '').replace(/_/g, ' ')}
          </p>
          {p.description && <p className="text-[13px] text-muted-foreground leading-snug mt-0.5">{p.description}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Saved sheet ────────────────────────────────────────────────────────────────
interface SavedSheetProps {
  isPersonal: boolean;
  name: string;
  ruleCount: number;
  doneLabel: string;
  onStartRound: () => void;
  onDone: () => void;
}

export function SavedSheet({ isPersonal, name, ruleCount, doneLabel, onStartRound, onDone }: SavedSheetProps) {
  return (
    <motion.div
      key="success-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-[#0F1F17]/50 backdrop-blur-sm flex items-end z-50"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        className="w-full bg-background rounded-t-[28px] px-5 pt-3"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />

        <div className="bg-primary rounded-[28px] p-5 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                className="w-[72px] h-[72px] rounded-full bg-gold flex items-center justify-center"
              >
                <Check className="w-9 h-9 text-primary" strokeWidth={3} />
              </motion.div>
              <motion.div
                initial={{ scale: 0.6, opacity: 0.6 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border-2 border-gold"
              />
            </div>
          </div>
          <p className="text-[13px] font-semibold text-gold">{isPersonal ? 'Format Created' : 'House Game Set'}</p>
          <h2 className="text-[28px] font-extrabold tracking-[-0.02em] text-white leading-tight mt-1">{name}</h2>
          <p className="text-[#CFE3D6] text-[14px] mt-1.5">
            {ruleCount} rule{ruleCount !== 1 ? 's' : ''} ready to play
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onStartRound}
            className="w-full h-[60px] rounded-[20px] bg-ink text-white text-[16px] font-bold flex items-center justify-center gap-2.5"
          >
            <Flag className="w-5 h-5 text-gold" />
            <span>Start a round now</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onDone}
            className="w-full h-[52px] rounded-[20px] text-[15px] font-semibold text-muted-foreground"
          >
            {doneLabel}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
