// Shared primitive UI components used by HouseGameConfirm and HouseGameEdit
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, Minus, Plus, AlertTriangle, Sparkles } from 'lucide-react';
import { HouseGamePrimitive, ParsedPrimitive, ActivePrimitive } from '@/types/houseGame';
import { hapticLight } from '@/lib/haptics';
import { cn } from '@/lib/utils';

// ── Value input component (stepper / segmented) ───────────────────────────────
export function ValueInput({
  primitive,
  value,
  onChange,
}: {
  primitive: HouseGamePrimitive;
  value: any;
  onChange: (v: any) => void;
}) {
  const { valueType, valueConfig, defaultValue } = primitive;
  const current = value ?? defaultValue;

  if (valueType === 'select' && valueConfig?.options) {
    return (
      <div className="flex gap-1 mt-2">
        {valueConfig.options.map(opt => (
          <button
            key={opt}
            onClick={() => { hapticLight(); onChange(opt); }}
            className={cn(
              'flex-1 text-[11px] font-bold py-1 rounded-lg border transition-colors',
              current === opt
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-muted-foreground border-border'
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

    return (
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => { hapticLight(); onChange(Math.max(min, current - step)); }}
          disabled={current <= min}
          className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-[13px] font-bold text-foreground min-w-[40px] text-center">
          {valueType === 'currency' ? `${unit}${current}` : `${current}${unit ? ` ${unit}` : ''}`}
        </span>
        <button
          onClick={() => { hapticLight(); onChange(Math.min(max, current + step)); }}
          disabled={current >= max}
          className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return null;
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
  confidence?: 'high' | 'medium' | 'low';
  value?: any;
  onToggle: () => void;
  onValueChange: (v: any) => void;
}) {
  const isLow = confidence === 'low';

  return (
    <motion.div
      layout
      className={cn(
        'rounded-xl px-4 py-3 border transition-colors',
        checked
          ? isLow
            ? 'bg-[#FFF9E6] border-[#F0EE3A]'
            : 'bg-white border-foreground/20'
          : 'bg-white border-border/40'
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => { hapticLight(); onToggle(); }}
          className={cn(
            'w-5 h-5 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center border-2 transition-colors',
            checked
              ? 'bg-foreground border-foreground'
              : 'bg-transparent border-border'
          )}
        >
          {checked && <Check className="w-3 h-3 text-background stroke-[3]" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-[13px] font-bold', checked ? 'text-foreground' : 'text-muted-foreground')}>
              {primitive.label}
            </span>
            {confidence === 'high' && checked && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] flex-shrink-0" />
            )}
            {confidence === 'medium' && checked && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#FCD34D] flex-shrink-0" />
            )}
            {isLow && checked && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.5 rounded-md">
                <AlertTriangle className="w-2.5 h-2.5" />
                Low
              </span>
            )}
            {!primitive.implemented && (
              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                Coming soon
              </span>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">
            {primitive.description}
          </p>
          {checked && primitive.valueType !== 'none' && (
            <ValueInput
              primitive={primitive}
              value={value}
              onChange={onValueChange}
            />
          )}
        </div>
      </div>
    </motion.div>
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
  const label = (primitive as any).label ?? primitive.id.replace('custom_', '').replace(/_/g, ' ');
  const description = (primitive as any).description ?? '';
  const value = primitive.value;

  return (
    <motion.div
      layout
      className={cn(
        'rounded-xl px-4 py-3 border-2 transition-colors',
        checked
          ? 'bg-[#F0EE3A]/10 border-[#F0EE3A]/60'
          : 'bg-white border-dashed border-border/50'
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => { hapticLight(); onToggle(); }}
          className={cn(
            'w-5 h-5 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center border-2 transition-colors',
            checked ? 'bg-foreground border-foreground' : 'bg-transparent border-border'
          )}
        >
          {checked && <Check className="w-3 h-3 text-background stroke-[3]" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-[13px] font-bold', checked ? 'text-foreground' : 'text-muted-foreground')}>
              {label}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-black text-[#0A0A0A] bg-[#F0EE3A] px-1.5 py-0.5 rounded-md">
              <Sparkles className="w-2.5 h-2.5" />
              AI Created
            </span>
            {value != null && (
              <span className="text-[11px] font-bold text-foreground">${value}</span>
            )}
          </div>
          {description && (
            <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </motion.div>
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
  confidenceMap?: Map<string, 'high' | 'medium' | 'low'>;
  valueMap: Map<string, any>;
  onToggle: (id: string) => void;
  onValueChange: (id: string, v: any) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const checkedInCategory = primitives.filter(p => checkedIds.has(p.id)).length;

  return (
    <div className="rounded-2xl overflow-hidden border border-border/40">
      <button
        onClick={() => { hapticLight(); setOpen(o => !o); }}
        className="w-full flex items-center justify-between px-4 py-3 bg-white"
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-foreground">{label}</span>
          {checkedInCategory > 0 && (
            <span className="text-[10px] font-black text-background bg-foreground px-1.5 py-0.5 rounded-full">
              {checkedInCategory}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
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
            <div className="px-3 pb-3 space-y-2 bg-[#F8F8F6]">
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
