import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Minus, Plus, Trash2 } from 'lucide-react';
import { useHouseGame } from '@/hooks/useHouseGame';
import { ActivePrimitive, HouseGamePrimitive } from '@/types/houseGame';
import { PRIMITIVE_MAP, PRIMITIVES_BY_CATEGORY, CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/houseGame/primitives';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// ── Value input ───────────────────────────────────────────────────────────────
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
          onClick={() => { hapticLight(); onChange(Math.max(min, (current) - step)); }}
          disabled={current <= min}
          className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-[13px] font-bold text-foreground min-w-[40px] text-center">
          {valueType === 'currency' ? `${unit}${current}` : `${current}${unit ? ` ${unit}` : ''}`}
        </span>
        <button
          onClick={() => { hapticLight(); onChange(Math.min(max, (current) + step)); }}
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

// ── Single primitive row ──────────────────────────────────────────────────────
function PrimitiveRow({
  primitive,
  checked,
  value,
  onToggle,
  onValueChange,
}: {
  primitive: HouseGamePrimitive;
  checked: boolean;
  value?: any;
  onToggle: () => void;
  onValueChange: (v: any) => void;
}) {
  return (
    <motion.div
      layout
      className={cn(
        'rounded-xl px-4 py-3 border transition-colors',
        checked ? 'bg-white border-foreground/20' : 'bg-white border-border/40'
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
              {primitive.label}
            </span>
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
  valueMap,
  onToggle,
  onValueChange,
  defaultOpen = false,
}: {
  categoryId: string;
  label: string;
  primitives: HouseGamePrimitive[];
  checkedIds: Set<string>;
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

// ── Main edit page ────────────────────────────────────────────────────────────
export default function HouseGameEdit() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { houseGame, loading, saving, saveHouseGame } = useHouseGame(groupId ?? null);
  const [deleting, setDeleting] = useState(false);

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [valueMap, setValueMap] = useState<Map<string, any>>(new Map());
  const [initialized, setInitialized] = useState(false);

  // Pre-load existing primitives once house game data arrives
  useEffect(() => {
    if (houseGame && !initialized) {
      const ids = new Set(houseGame.activePrimitives.map(p => p.id));
      const vals = new Map<string, any>();
      for (const p of houseGame.activePrimitives) {
        if (p.value !== null && p.value !== undefined) vals.set(p.id, p.value);
      }
      setCheckedIds(ids);
      setValueMap(vals);
      setInitialized(true);
    }
  }, [houseGame, initialized]);

  const handleToggle = useCallback((id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        const prim = PRIMITIVE_MAP[id];
        if (prim && prim.valueType !== 'none') {
          setValueMap(vm => {
            if (vm.has(id)) return vm;
            const nm = new Map(vm);
            nm.set(id, prim.defaultValue);
            return nm;
          });
        }
      }
      return next;
    });
  }, []);

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

    const ok = await saveHouseGame({
      groupId: groupId!,
      name: houseGame?.name ?? 'House Game',
      description: houseGame?.description ?? '',
      activePrimitives,
    });

    if (ok) {
      hapticSuccess();
      toast.success('House Game updated!');
      navigate('/groups', { replace: true });
    } else {
      toast.error('Failed to save — try again');
    }
  };

  const handleDelete = async () => {
    if (!houseGame) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('house_games')
        .delete()
        .eq('id', houseGame.id);
      if (error) throw error;
      hapticSuccess();
      toast.success('House Game removed');
      navigate('/groups', { replace: true });
    } catch {
      hapticError();
      toast.error('Failed to delete — try again');
    } finally {
      setDeleting(false);
    }
  };

  const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-[#F8F8F6]">
        <header className="flex-shrink-0 px-6 pt-safe-content pb-3 border-b-2 border-foreground">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted" />
            <div className="h-6 w-40 bg-muted rounded-lg" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-6 h-6 rounded-full border-2 border-foreground border-t-transparent"
          />
        </div>
      </div>
    );
  }

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
            <h1 className="text-[22px] font-black tracking-[-0.04em] text-foreground leading-none">Edit Rules</h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </motion.button>
        </div>
      </header>

      {houseGame && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mt-4 bg-[#0A0A0A] rounded-2xl px-4 py-3"
        >
          <p className="text-white/50 text-[11px] font-bold uppercase tracking-[0.08em]">Current game</p>
          <p className="text-white text-[13px] font-bold mt-0.5 line-clamp-2">{houseGame.description || houseGame.name}</p>
        </motion.div>
      )}

      <main className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2 pb-32 mt-3">
        {CATEGORY_ORDER.map((catId, i) => {
          const prims = PRIMITIVES_BY_CATEGORY[catId];
          if (!prims?.length) return null;
          const hasChecked = prims.some(p => checkedIds.has(p.id));
          return (
            <motion.div
              key={catId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.05 + i * 0.03 }}
            >
              <CategorySection
                categoryId={catId}
                label={CATEGORY_LABELS[catId]}
                primitives={prims}
                checkedIds={checkedIds}
                valueMap={valueMap}
                onToggle={handleToggle}
                onValueChange={handleValueChange}
                defaultOpen={hasChecked}
              />
            </motion.div>
          );
        })}
      </main>

      {/* CTA */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-safe pt-4 bg-[#F8F8F6] border-t border-border/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-muted-foreground">
            {checkedIds.size} rule{checkedIds.size !== 1 ? 's' : ''} active
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
                <span>Saving changes...</span>
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
                <span>Save Changes</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
