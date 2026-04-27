import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Sparkles, AlertTriangle, ArrowRight, Flag } from 'lucide-react';
import { useHouseGame } from '@/hooks/useHouseGame';
import { usePersonalGameFormats } from '@/hooks/usePersonalGameFormats';
import { ParsedPrimitive, ActivePrimitive, HouseGamePrimitive, isCustomPrimitive } from '@/types/houseGame';
import { PRIMITIVE_MAP, PRIMITIVES_BY_CATEGORY, CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/houseGame/primitives';
import { PrimitiveRow, CategorySection, CustomPrimitiveRow } from '@/components/golf/HouseGamePrimitives';
import { validateConfig, buildConfig } from '@/engine/HouseGameEngine';
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
  // Stabilize identity: state?.parsedPrimitives ?? [] returns a new array
  // on each render, which would invalidate downstream useMemos.
  const parsedPrimitives: ParsedPrimitive[] = useMemo(
    () => state?.parsedPrimitives ?? [],
    [state?.parsedPrimitives],
  );
  const returnTo = state?.returnTo;

  const { saving: groupSaving, saveHouseGame } = useHouseGame(isPersonal ? null : groupId ?? null);
  const { saving: personalSaving, saveFormat } = usePersonalGameFormats();
  const saving = isPersonal ? personalSaving : groupSaving;

  // After successful save — shows the Step 3 success screen
  const [savedFormatId, setSavedFormatId] = useState<string | null>(null);

  // Game name — auto-generated from description, user can edit
  const [gameName, setGameName] = useState<string>(() => {
    if (!description) return 'My Format';
    const firstSentence = description.split(/[.!?]/)[0].trim();
    return firstSentence.length > 0 && firstSentence.length <= 30
      ? firstSentence
      : description.slice(0, 28).trim() + (description.length > 28 ? '…' : '');
  });

  // Initialize checked set from parsed results.
  // high/medium confidence → auto-checked; low confidence → starts unchecked (user must opt in).
  // Infeasible primitives are never checked.
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => {
    return new Set(
      parsedPrimitives
        .filter(p => !p.infeasible && (p.confidence === 'high' || p.confidence === 'medium'))
        .map(p => p.id)
    );
  });

  // Value map: id → current value (starts from parsed or default)
  const [valueMap, setValueMap] = useState<Map<string, unknown>>(() => {
    const m = new Map<string, unknown>();
    for (const p of parsedPrimitives) {
      if (p.value !== null && p.value !== undefined) m.set(p.id, p.value);
    }
    return m;
  });

  // Confidence map from parsed results
  const confidenceMap = new Map<string, 'high' | 'medium' | 'low'>(
    parsedPrimitives.map(p => [p.id, p.confidence])
  );

  // Compute stub warnings for currently checked primitives
  const configWarnings = useMemo(() => {
    if (checkedIds.size === 0) return [];
    const customMap = new Map<string, ParsedPrimitive>(
      parsedPrimitives.filter(isCustomPrimitive).map(p => [p.id, p])
    );
    const activePrimitives: ActivePrimitive[] = Array.from(checkedIds).map(id => {
      const custom = customMap.get(id);
      if (custom) {
        return {
          id,
          custom: true as const,
          label: custom.label,
          description: custom.description,
          value: valueMap.get(id) ?? custom.value ?? null,
        };
      }
      return { id, value: valueMap.get(id) ?? PRIMITIVE_MAP[id]?.defaultValue ?? null };
    });
    const { warnings } = buildConfig(activePrimitives);
    return warnings;
  }, [checkedIds, valueMap, parsedPrimitives]);

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

  const handleValueChange = useCallback((id: string, v: unknown) => {
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

    // Build a lookup map for custom primitives so we can preserve their metadata
    const customMap = new Map<string, ParsedPrimitive>(
      parsedPrimitives.filter(isCustomPrimitive).map(p => [p.id, p])
    );

    const activePrimitives: ActivePrimitive[] = Array.from(checkedIds).map(id => {
      const custom = customMap.get(id);
      if (custom) {
        return {
          id,
          custom: true as const,
          label: custom.label,
          description: custom.description,
          value: valueMap.get(id) ?? custom.value ?? null,
        };
      }
      return { id, value: valueMap.get(id) ?? PRIMITIVE_MAP[id]?.defaultValue ?? null };
    });

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
        setSavedFormatId(id);
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
        // For group house games, use a sentinel value to show the success screen
        setSavedFormatId('group');
      } else {
        toast.error('Failed to save — try again');
      }
    }
  };

  // Split into standard (known in PRIMITIVE_MAP), custom (AI-created), and infeasible (cannot be created)
  const aiFoundPrimitives = parsedPrimitives
    .filter(p => !isCustomPrimitive(p))
    .map(p => PRIMITIVE_MAP[p.id])
    .filter(Boolean) as HouseGamePrimitive[];

  const customPrimitives = parsedPrimitives.filter(p => isCustomPrimitive(p) && !p.infeasible);
  const infeasiblePrimitives = parsedPrimitives.filter(p => p.infeasible === true);

  const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };
  const defaultName = isPersonal ? 'My Format' : 'House Game';

  return (
    <div className="h-screen flex flex-col bg-[#F8F8F6] relative">
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
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {isPersonal ? 'My Format' : 'House Game'} · {checkedIds.size} rule{checkedIds.size !== 1 ? 's' : ''}
            </p>
            <h1 className="text-[22px] font-black tracking-[-0.04em] text-foreground leading-none">Confirm Rules</h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={checkedIds.size === 0 || saving}
            className="ml-auto bg-foreground text-background rounded-xl px-4 py-2 font-bold text-[13px] flex items-center gap-1.5 disabled:opacity-40 flex-shrink-0"
          >
            {saving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-4 h-4 rounded-full border-2 border-background border-t-transparent"
              />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save</span>
              </>
            )}
          </motion.button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5 pb-6">

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

        {/* Stub feature warnings */}
        {configWarnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.035 }}
            className="bg-[#FFF3CD] border border-[#F0BB3A] rounded-2xl px-4 py-3"
          >
            <div className="flex items-start gap-2 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-[#B45309] flex-shrink-0 mt-0.5" />
              <p className="text-[#7D4E0F] font-bold text-[13px]">
                {configWarnings.length === 1
                  ? 'One selected rule has limited support'
                  : `${configWarnings.length} selected rules have limited support`}
              </p>
            </div>
            <ul className="space-y-1 ml-6">
              {configWarnings.map((w) => (
                <li key={w} className="text-[#7D4E0F]/80 text-[12px] leading-snug list-disc">
                  {w}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

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
        >
          <div className="bg-[#0A0A0A] rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#F0EE3A] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-[13px] leading-snug">
                  Found {aiFoundPrimitives.length + customPrimitives.length} rule{(aiFoundPrimitives.length + customPrimitives.length) !== 1 ? 's' : ''} in your description
                  {infeasiblePrimitives.length > 0 && (
                    <span className="text-[#F0BB3A]"> · {infeasiblePrimitives.length} can't be created</span>
                  )}
                </p>
                {aiFoundPrimitives.length > 0 && (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {(() => {
                      const high = parsedPrimitives.filter(p => p.confidence === 'high').length;
                      const medium = parsedPrimitives.filter(p => p.confidence === 'medium').length;
                      const low = parsedPrimitives.filter(p => p.confidence === 'low').length;
                      return (
                        <>
                          {high > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-[#4ADE80] bg-[#4ADE80]/15 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
                              {high} high
                            </span>
                          )}
                          {medium > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-[#FCD34D] bg-[#FCD34D]/15 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FCD34D]" />
                              {medium} medium
                            </span>
                          )}
                          {low > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-[#FB923C] bg-[#FB923C]/15 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FB923C]" />
                              {low} low
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                <p className="text-white/40 text-[11px] mt-1.5 leading-relaxed line-clamp-2">
                  "{description}"
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() =>
              navigate(
                isPersonal ? '/my-formats/new' : `/groups/${groupId}/house-game/new`,
                { state: { prefillDescription: description } }
              )
            }
            className="mt-2 text-[12px] text-muted-foreground font-bold"
          >
            ← Refine description
          </button>
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
              {aiFoundPrimitives.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 + i * 0.05 }}
                >
                  <PrimitiveRow
                    primitive={p}
                    checked={checkedIds.has(p.id)}
                    confidence={confidenceMap.get(p.id)}
                    value={valueMap.get(p.id)}
                    onToggle={() => handleToggle(p.id)}
                    onValueChange={v => handleValueChange(p.id, v)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* AI-created custom rules */}
        {customPrimitives.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.12 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                AI-Created Rules
              </p>
              <span className="text-[9px] font-black text-[#0A0A0A] bg-[#F0EE3A] px-1.5 py-0.5 rounded-md">
                NEW
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2 leading-snug">
              These rules aren't in our standard library — they'll be saved as reminders and shown at settlement.
            </p>
            <div className="space-y-2">
              {customPrimitives.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.12 + i * 0.05 }}
                >
                  <CustomPrimitiveRow
                    primitive={p}
                    checked={checkedIds.has(p.id)}
                    onToggle={() => handleToggle(p.id)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Rules that cannot be created */}
        {infeasiblePrimitives.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.14 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Can't Be Created
              </p>
              <span className="text-[9px] font-black text-[#7D4E0F] bg-[#FEF3C7] px-1.5 py-0.5 rounded-md">
                {infeasiblePrimitives.length}
              </span>
            </div>
            <div className="bg-[#FFF9E6] border border-[#F0BB3A] rounded-2xl px-4 py-3 mb-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#B45309] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#7D4E0F] leading-snug">
                  The following rules can't be tracked in the app. You'll need to handle these manually with your group.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {infeasiblePrimitives.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.14 + i * 0.05 }}
                  className="rounded-xl px-4 py-3 border border-[#F0BB3A] bg-[#FFF9E6]"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#B45309] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-[#7D4E0F]">
                        {p.label ?? p.id.replace('custom_', '').replace(/_/g, ' ')}
                      </p>
                      {p.description && (
                        <p className="text-[11px] text-[#7D4E0F]/70 leading-snug mt-0.5">{p.description}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
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


      {/* Step 3: Success overlay — appears after saving */}
      <AnimatePresence>
        {savedFormatId && (
          <motion.div
            key="success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0A0A0A]/60 backdrop-blur-sm flex items-end z-50"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="w-full bg-[#0A0A0A] rounded-t-[32px] px-6 pt-6 pb-[40px]"
            >
              {/* Drag handle */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-7" />

              {/* Check circle with ring animation */}
              <div className="flex justify-center mb-5">
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-[#F0EE3A] flex items-center justify-center"
                  >
                    <Check className="w-9 h-9 text-[#0A0A0A] stroke-[3]" />
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0.6 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-full border-2 border-[#F0EE3A]"
                  />
                </div>
              </div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="text-center mb-1"
              >
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#F0EE3A] mb-1">
                  {isPersonal ? 'Format Created' : 'House Game Set'}
                </p>
                <h2 className="text-[28px] font-black tracking-[-0.04em] text-white leading-none">
                  {gameName || (isPersonal ? 'My Format' : 'House Game')}
                </h2>
                <p className="text-white/50 text-[13px] mt-2 leading-snug">
                  {checkedIds.size} rule{checkedIds.size !== 1 ? 's' : ''} ready to play
                </p>
              </motion.div>

              {/* Divider */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.28, duration: 0.4 }}
                className="h-px bg-white/10 my-5"
              />

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col gap-3"
              >
                {/* Primary: Start a Round */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (isPersonal && savedFormatId !== 'group') {
                      navigate('/new-round', {
                        state: { preSelectFormatId: savedFormatId },
                        replace: true,
                      });
                    } else {
                      // Group house game — just go to new round
                      navigate('/new-round', { replace: true });
                    }
                  }}
                  className="w-full h-[58px] bg-[#F0EE3A] rounded-2xl flex items-center justify-center gap-3 font-black text-[16px] text-[#0A0A0A] tracking-[-0.02em]"
                >
                  <Flag className="w-5 h-5" />
                  <span>Start a Round Now</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </motion.button>

                {/* Secondary: Done / back */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(returnTo ?? '/', { replace: true })}
                  className="w-full h-[50px] rounded-2xl flex items-center justify-center font-bold text-[14px] text-white/50"
                >
                  {returnTo ? 'Back to New Round' : 'Done'}
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
