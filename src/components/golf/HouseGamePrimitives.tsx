// Shared primitive UI components used by HouseGameConfirm and HouseGameEdit (Fairway Day).
import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Minus, Plus, Sparkles } from 'lucide-react';
import { HouseGamePrimitive, ParsedPrimitive, ActivePrimitive } from '@/types/houseGame';
import { hapticLight } from '@/lib/haptics';
import { cn } from '@/lib/utils';

type Confidence = 'high' | 'medium' | 'low';

const CONFIDENCE: Record<Confidence, { label: string; bars: number; className: string }> = {
  high: { label: 'High', bars: 3, className: 'text-primary bg-gold-muted' },
  medium: { label: 'Medium', bars: 2, className: 'text-foreground bg-muted' },
  low: { label: 'Low', bars: 1, className: 'text-[#92400E] bg-[#FEF3C7]' },
};

/** Three-bar signal glyph used for AI confidence. */
export function ConfidenceBars({ level, className }: { level: Confidence; className?: string }) {
  const filled = CONFIDENCE[level].bars;
  return (
    <span className={cn('inline-flex items-end gap-[2px] h-3', className)} aria-hidden>
      {[5, 8, 11].map((h, i) => (
        <span
          key={h}
          className={cn('w-[3px] rounded-full bg-current', i < filled ? 'opacity-100' : 'opacity-25')}
          style={{ height: h }}
        />
      ))}
    </span>
  );
}

/** Compact confidence tag shown on each AI-detected rule. */
export function ConfidenceTag({ level }: { level: Confidence }) {
  const c = CONFIDENCE[level];
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-[12px] font-semibold px-2 py-1 rounded-full flex-shrink-0', c.className)}
      aria-label={`${c.label} confidence`}
      title={`${c.label} confidence`}
    >
      <ConfidenceBars level={level} />
      {c.label}
    </span>
  );
}

/** 28px checkbox inside a 44px hit area. */
function RuleCheck({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      data-testid="rule-toggle"
      data-state={checked ? 'checked' : 'unchecked'}
      onClick={(e) => { e.stopPropagation(); hapticLight(); onToggle(); }}
      className="w-11 h-11 -m-2 flex items-center justify-center flex-shrink-0"
    >
      <span
        className={cn(
          'w-7 h-7 rounded-[9px] flex items-center justify-center border-2 transition-colors',
          checked ? 'bg-primary border-primary' : 'bg-card border-border'
        )}
      >
        {checked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
      </span>
    </button>
  );
}

// ── Value input component (stepper / segmented) ───────────────────────────────
export function ValueInput({
  primitive,
  value,
  onChange,
}: {
  primitive: HouseGamePrimitive;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const { valueType, valueConfig, defaultValue } = primitive;
  const current = (value ?? defaultValue) as number | string;

  if (valueType === 'select' && valueConfig?.options) {
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {valueConfig.options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => { hapticLight(); onChange(opt); }}
            aria-pressed={current === opt}
            className={cn(
              'flex-1 min-w-[64px] h-10 px-3 text-[14px] font-semibold rounded-full transition-colors',
              current === opt ? 'bg-primary text-white' : 'bg-muted text-foreground'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (valueType === 'number' || valueType === 'currency' || valueType === 'distance') {
    const min = valueConfig?.min ?? 0;
    const max = valueConfig?.max ?? 99;
    const step = valueConfig?.step ?? 1;
    const unit = valueConfig?.unit ?? (valueType === 'currency' ? '$' : valueType === 'distance' ? 'ft' : '');
    const n = Number(current);

    return (
      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          onClick={() => { hapticLight(); onChange(Math.max(min, n - step)); }}
          disabled={n <= min}
          aria-label={`Decrease ${primitive.label}`}
          className="w-11 h-11 rounded-[14px] bg-muted flex items-center justify-center disabled:opacity-30"
        >
          <Minus className="w-4 h-4 text-foreground" />
        </button>
        <span className="text-[20px] font-extrabold tracking-[-0.02em] text-foreground min-w-[72px] text-center tabular-nums">
          {valueType === 'currency' ? `${unit}${current}` : `${current}${unit ? ` ${unit}` : ''}`}
        </span>
        <button
          type="button"
          onClick={() => { hapticLight(); onChange(Math.min(max, n + step)); }}
          disabled={n >= max}
          aria-label={`Increase ${primitive.label}`}
          className="w-11 h-11 rounded-[14px] bg-primary flex items-center justify-center disabled:opacity-30"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>
    );
  }

  return null;
}

interface RuleRowShellProps {
  checked: boolean;
  label: string;
  onToggle: () => void;
  title: ReactNode;
  tags?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  tone?: 'default' | 'ai';
}

function RuleRowShell({ checked, label, onToggle, title, tags, description, children, tone = 'default' }: RuleRowShellProps) {
  return (
    <motion.div
      layout
      data-checked={checked}
      className={cn(
        'rounded-[20px] border px-4 py-3.5 transition-colors',
        checked ? 'bg-card border-border' : 'bg-card/60 border-border border-dashed',
        tone === 'ai' && checked && 'border-gold bg-[#F7FEE7]'
      )}
    >
      <div className="flex items-start gap-3">
        <RuleCheck checked={checked} onToggle={onToggle} label={label} />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { hapticLight(); onToggle(); }}>
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-[16px] font-semibold leading-snug', checked ? 'text-foreground' : 'text-muted-foreground')}>
              {title}
            </p>
            {tags && <div className="flex items-center gap-1.5 flex-shrink-0">{tags}</div>}
          </div>
          {description && (
            <p className="text-[13px] text-muted-foreground leading-snug mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {children && <div className="pl-10">{children}</div>}
    </motion.div>
  );
}

// ── Single primitive row ───────────────────────────────────────────────────────
export function PrimitiveRow({
  primitive,
  checked,
  confidence,
  value,
  onToggle,
  onValueChange,
}: {
  primitive: HouseGamePrimitive;
  checked: boolean;
  confidence?: Confidence;
  value?: unknown;
  onToggle: () => void;
  onValueChange: (v: unknown) => void;
}) {
  return (
    <RuleRowShell
      checked={checked}
      label={primitive.label}
      onToggle={onToggle}
      title={primitive.label}
      tags={
        <>
          {!primitive.implemented && (
            <span className="text-[12px] font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full">Coming soon</span>
          )}
          {confidence && <ConfidenceTag level={confidence} />}
        </>
      }
      description={primitive.description}
    >
      {checked && primitive.valueType !== 'none' && (
        <ValueInput primitive={primitive} value={value} onChange={onValueChange} />
      )}
    </RuleRowShell>
  );
}

// ── Custom primitive row (AI-created rules) ───────────────────────────────────
export function CustomPrimitiveRow({
  primitive,
  checked,
  onToggle,
}: {
  primitive: ParsedPrimitive | ActivePrimitive;
  checked: boolean;
  onToggle: () => void;
}) {
  const label = primitive.label ?? primitive.id.replace('custom_', '').replace(/_/g, ' ');
  const description = primitive.description ?? '';
  const value = primitive.value;

  return (
    <RuleRowShell
      tone="ai"
      checked={checked}
      label={label}
      onToggle={onToggle}
      title={
        <>
          {label}
          {value != null && <span className="ml-1.5 text-primary font-bold">${String(value)}</span>}
        </>
      }
      tags={
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-primary bg-gold px-2 py-1 rounded-full">
          <Sparkles className="w-3 h-3" />
          AI Created
        </span>
      }
      description={description || undefined}
    />
  );
}

// ── Collapsible category section ───────────────────────────────────────────────
export function CategorySection({
  categoryId,
  label,
  primitives,
  checkedIds,
  confidenceMap,
  valueMap,
  onToggle,
  onValueChange,
  defaultOpen = false,
}: {
  categoryId: string;
  label: string;
  primitives: HouseGamePrimitive[];
  checkedIds: Set<string>;
  confidenceMap?: Map<string, Confidence>;
  valueMap: Map<string, unknown>;
  onToggle: (id: string) => void;
  onValueChange: (id: string, v: unknown) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const checkedInCategory = primitives.filter(p => checkedIds.has(p.id)).length;

  return (
    <div className="rounded-[20px] overflow-hidden border border-border bg-card" data-category={categoryId}>
      <button
        type="button"
        onClick={() => { hapticLight(); setOpen(o => !o); }}
        aria-expanded={open}
        className="w-full min-h-[56px] flex items-center justify-between gap-3 px-4"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[16px] font-semibold text-foreground truncate">{label}</span>
          {checkedInCategory > 0 && (
            <span className="text-[12px] font-bold text-white bg-primary min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center">
              {checkedInCategory}
            </span>
          )}
        </div>
        <span className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[13px] text-muted-foreground tabular-nums">{primitives.length}</span>
          <ChevronDown className={cn('w-5 h-5 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="overflow-hidden"
          >
            <div className="p-2 pt-0 space-y-2">
              {primitives.map(p => (
                <PrimitiveRow
                  key={p.id}
                  primitive={p}
                  checked={checkedIds.has(p.id)}
                  confidence={confidenceMap?.get(p.id)}
                  value={valueMap.get(p.id)}
                  onToggle={() => onToggle(p.id)}
                  onValueChange={v => onValueChange(p.id, v)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
