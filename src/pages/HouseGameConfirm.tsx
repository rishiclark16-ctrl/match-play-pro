import { useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, ChevronDown, ChevronUp, AlertTriangle, Sparkles, Minus, Plus } from 'lucide-react';
import { useHouseGame } from '@/hooks/useHouseGame';
import { ParsedPrimitive, ActivePrimitive, HouseGamePrimitive } from '@/types/houseGame';
import { PRIMITIVE_MAP, PRIMITIVES_BY_CATEGORY, CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/houseGame/primitives';
import { validateConfig } from '@/engine/HouseGameEngine';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LocationState {
  description: string;
  parsedPrimitives: ParsedPrimitive[];
}

// ── Value input component (stepper / segmented) ──────────────────────────────
function ValueInput({
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
          onClick={() => { hapticLight(); onChange(Math.max(min, (current ?? defaultValue) - step)); }}
          disabled={(current ?? defaultValue) <= min}
          className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-[13px] font-bold text-foreground min-w-[40px] text-center">
          {unit && valueType === 'currency' ? `${unit}${current ?? defaultValue}` : `${current ?? defaultValue}${unit ? ` ${unit}` : ''}`}
        </span>
        <button
          onClick={() => { hapticLight(); onChange(Math.min(max, (current ?? defaultValue) + step)); }}
          disabled={(current ?? defaultValue) >= max}
          className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return null;
}

// ── Single primitive row ──────────────────────────────────────────────────────
function PrimitiveRow({
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
            {isLow && checked && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.5 rounded-md">
                <AlertTriangle className="w-2.5 h-2.5" />
                Low confidence
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

// ── Collapsible category section ──────────────────────────────────────────────
function CategorySection({
  categoryId,
  label,
  primitives,
  checkedIds,
  confidenceMap,
  valueMap,
  onToggle,
  onValueChange,
}: {
  categoryId: string;
  label: string;
  primitives: HouseGamePrimitive[];
  checkedIds: Set<string>;
  confidenceMap: Map<string, 'high' | 'medium' | 'low'>;
  valueMap: Map<string, any>;
  onToggle: (id: string) => void;
  onValueChange: (id: string, v: any) => void;
}) {
  const [open, setOpen] = useState(false);
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
                  confidence={confidenceMap.get(p.id)}
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

// ── Main confirm page ─────────────────────────────────────────────────────────
export default function HouseGameConfirm() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const description = state?.description ?? '';
  const parsedPrimitives: ParsedPrimitive[] = state?.parsedPrimitives ?? [];

  const { saving, saveHouseGame } = useHouseGame(groupId ?? null);

  // Game name — auto-generated from description, user can edit
  const [gameName, setGameName] = useState<string>(() => {
    if (!description) return 'House Game';
    const firstSentence = description.split(/[.!?]/)[0].trim();
    return firstSentence.length > 0 && firstSentence.length <= 30
      ? firstSentence
      : description.slice(0, 28).trim() + (description.length > 28 ? '…' : '');
  });

  // Initialize checked set from parsed results
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => {
    return new Set(parsedPrimitives.map(p => p.id));
  });

  // Value map: id → current value (starts from parsed or default)
  const [valueMap, setValueMap] = useState<Map<string, any>>(() => {
    const m = new Map<string, any>();
    for (const p of parsedPrimitives) {
      if (p.value !== null && p.value !== undefined) m.set(p.id, p.value);
    }
    return m;
  });

  // Confidence map from parsed results
  const confidenceMap = new Map<string, 'high' | 'medium' | 'low'>(
    parsedPrimitives.map(p => [p.id, p.confidence])
  );

  const handleToggle = useCallback((id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Set default value if not already set
        const prim = PRIMITIVE_MAP[id];
        if (prim && prim.valueType !== 'none' && !valueMap.has(id)) {
          setValueMap(vm => {
            const nm = new Map(vm);
            nm.set(id, prim.defaultValue);
            return nm;
          });
        }
      }
      return next;
    });
  }, [valueMap]);

  const handleValueChange = useCallback((id: string, v: any) => {
    setValueMap(prev => {
      const next = new Map(prev);
      next.set(id, v);
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (checkedIds.size === 0) {
      toast.error('Select at least one rule to save');
      return;
    }

    hapticLight();

    const activePrimitives: ActivePrimitive[] = Array.from(checkedIds).map(id => ({
      id,
      value: valueMap.get(id) ?? PRIMITIVE_MAP[id]?.defaultValue ?? null,
    }));

    const validation = validateConfig(activePrimitives);
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }

    const ok = await saveHouseGame({
      groupId: groupId!,
      name: gameName.trim() || 'House Game',
      description,
      activePrimitives,
    });

    if (ok) {
      hapticSuccess();
      toast.success('House Game saved!');
      navigate(`/groups`, { replace: true });
    } else {
      toast.error('Failed to save — try again');
    }
  };

  // Build the "AI found" list (parsed primitives that still exist in PRIMITIVE_MAP)
  const aiFoundPrimitives = parsedPrimitives
    .map(p => PRIMITIVE_MAP[p.id])
    .filter(Boolean) as HouseGamePrimitive[];

  // For the library, show categories excluding what AI already found (but still show all for completeness)
  const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

  return (
    <div className="h-screen flex flex-col bg-[#F8F8F6]">
      {/* Header */}
      <header className="flex-shrink-0 px-6 pt-safe-content pb-3 border-b-2 border-foreground">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </motion.button>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">House Game</p>
            <h1 className="text-[22px] font-black tracking-[-0.04em] text-foreground leading-none">Confirm Rules</h1>
          </div>
          <div className="ml-auto bg-foreground text-[#F0EE3A] text-[9px] font-black tracking-[0.1em] px-2 py-1 rounded-lg">
            PRO
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5 pb-32">

        {/* Game name field */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.03 }}
        >
          <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground block mb-1.5">
            Game Name
          </label>
          <input
            type="text"
            value={gameName}
            onChange={e => setGameName(e.target.value)}
            maxLength={40}
            placeholder="House Game"
            className="w-full bg-white border-2 border-foreground/20 focus:border-foreground rounded-xl px-4 py-3 text-[15px] font-bold text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors"
          />
        </motion.div>

        {/* 0-match warning */}
        {parsedPrimitives.length === 0 && description && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.04 }}
            className="bg-[#FFF3CD] border border-[#F0BB3A] rounded-2xl px-4 py-3"
          >
            <p className="text-[#7D4E0F] font-bold text-[13px]">
              We couldn't identify any rules from that description.
            </p>
            <p className="text-[#7D4E0F]/70 text-[12px] mt-0.5 leading-snug">
              Try being more specific, or select rules manually from the categories below.
            </p>
          </motion.div>
        )}

        {/* AI summary card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="bg-[#0A0A0A] rounded-2xl p-4 flex items-start gap-3"
        >
          <Sparkles className="w-5 h-5 text-[#F0EE3A] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-bold text-[13px] leading-snug">
              Found {aiFoundPrimitives.length} rule{aiFoundPrimitives.length !== 1 ? 's' : ''} in your description
            </p>
            <p className="text-white/50 text-[12px] mt-0.5 leading-relaxed line-clamp-2">
              "{description}"
            </p>
          </div>
        </motion.div>

        {/* AI found section */}
        {aiFoundPrimitives.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
              Here's what we found
            </p>
            <div className="space-y-2">
              {aiFoundPrimitives.map(p => (
                <PrimitiveRow
                  key={p.id}
                  primitive={p}
                  checked={checkedIds.has(p.id)}
                  confidence={confidenceMap.get(p.id)}
                  value={valueMap.get(p.id)}
                  onToggle={() => handleToggle(p.id)}
                  onValueChange={v => handleValueChange(p.id, v)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Add more section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
            Want to add anything?
          </p>
          <div className="space-y-2">
            {CATEGORY_ORDER.map(catId => {
              const prims = PRIMITIVES_BY_CATEGORY[catId];
              if (!prims?.length) return null;
              return (
                <CategorySection
                  key={catId}
                  categoryId={catId}
                  label={CATEGORY_LABELS[catId]}
                  primitives={prims}
                  checkedIds={checkedIds}
                  confidenceMap={confidenceMap}
                  valueMap={valueMap}
                  onToggle={handleToggle}
                  onValueChange={handleValueChange}
                />
              );
            })}
          </div>
        </motion.div>
      </main>

      {/* CTA */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-safe pt-4 bg-[#F8F8F6] border-t border-border/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-muted-foreground">
            {checkedIds.size} rule{checkedIds.size !== 1 ? 's' : ''} selected
          </span>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={checkedIds.size === 0 || saving}
          className="w-full bg-foreground text-background rounded-2xl h-[54px] font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <AnimatePresence mode="wait">
            {saving ? (
              <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-5 h-5 rounded-full border-2 border-background border-t-transparent"
                />
                <span>Saving your game...</span>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                <span>Looks Good — Save My House Game</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
