import { useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { useHouseGame } from '@/hooks/useHouseGame';
import { usePersonalGameFormats } from '@/hooks/usePersonalGameFormats';
import { ParsedPrimitive, ActivePrimitive, HouseGamePrimitive } from '@/types/houseGame';
import { PRIMITIVE_MAP, PRIMITIVES_BY_CATEGORY, CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/houseGame/primitives';
import { PrimitiveRow, CategorySection } from '@/components/golf/HouseGamePrimitives';
import { validateConfig } from '@/engine/HouseGameEngine';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { toast } from 'sonner';

interface LocationState {
  description: string;
  parsedPrimitives: ParsedPrimitive[];
  returnTo?: string;
}

// ── Main confirm page ─────────────────────────────────────────────────────────
export default function HouseGameConfirm() {
  const { groupId } = useParams<{ groupId?: string }>();
  const isPersonal = !groupId;
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const description = state?.description ?? '';
  const parsedPrimitives: ParsedPrimitive[] = state?.parsedPrimitives ?? [];
  const returnTo = state?.returnTo;

  const { saving: groupSaving, saveHouseGame } = useHouseGame(isPersonal ? null : groupId ?? null);
  const { saving: personalSaving, saveFormat } = usePersonalGameFormats();
  const saving = isPersonal ? personalSaving : groupSaving;

  // Game name — auto-generated from description, user can edit
  const [gameName, setGameName] = useState<string>(() => {
    if (!description) return 'My Format';
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

    if (isPersonal) {
      const id = await saveFormat({
        name: gameName.trim() || 'My Format',
        description,
        activePrimitives,
      });
      if (id) {
        hapticSuccess();
        toast.success('Format saved!');
        navigate(returnTo ?? '/', { replace: true });
      } else {
        toast.error('Failed to save — try again');
      }
    } else {
      const ok = await saveHouseGame({
        groupId: groupId!,
        name: gameName.trim() || 'House Game',
        description,
        activePrimitives,
      });
      if (ok) {
        hapticSuccess();
        toast.success('House Game saved!');
        navigate('/groups', { replace: true });
      } else {
        toast.error('Failed to save — try again');
      }
    }
  };

  // Build the "AI found" list (parsed primitives that still exist in PRIMITIVE_MAP)
  const aiFoundPrimitives = parsedPrimitives
    .map(p => PRIMITIVE_MAP[p.id])
    .filter(Boolean) as HouseGamePrimitive[];

  const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };
  const defaultName = isPersonal ? 'My Format' : 'House Game';

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
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {isPersonal ? 'My Format' : 'House Game'}
            </p>
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
            {isPersonal ? 'Format Name' : 'Game Name'}
          </label>
          <input
            type="text"
            value={gameName}
            onChange={e => setGameName(e.target.value)}
            maxLength={40}
            placeholder={defaultName}
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
                <span>Saving{isPersonal ? ' format' : ' your game'}...</span>
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
                <span>{isPersonal ? 'Save My Format' : 'Looks Good — Save My House Game'}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
