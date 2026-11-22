import { useState, useCallback, useMemo } from 'react';
import { suggestFormatName } from '@/lib/houseGame/suggestFormatName';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { useHouseGame } from '@/hooks/useHouseGame';
import { usePersonalGameFormats } from '@/hooks/usePersonalGameFormats';
import { ParsedPrimitive, ActivePrimitive, HouseGamePrimitive, isCustomPrimitive } from '@/types/houseGame';
import { PRIMITIVE_MAP, PRIMITIVES_BY_CATEGORY, CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/houseGame/primitives';
import { PrimitiveRow, CategorySection, CustomPrimitiveRow } from '@/components/golf/HouseGamePrimitives';
import { ConfirmHero, InfeasibleList, NoticeCard, SavedSheet } from '@/components/golf/HouseGameConfirmParts';
import { CtaFooter, SetupHeader } from '@/components/golf/setupUi';
import { fdPrimaryCta } from '@/components/golf/setupStyles';
import { cn } from '@/lib/utils';
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
  const [gameName, setGameName] = useState<string>(() =>
    suggestFormatName(parsedPrimitives, description, isPersonal ? 'My Format' : 'House Game'),
  );

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
  const selectableCount = parsedPrimitives.filter(p => !p.infeasible).length;
  const label = 'text-[13px] font-semibold text-muted-foreground px-1';

  const saveButtonInner = saving ? (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      className="w-5 h-5 rounded-full border-2 border-current border-t-transparent"
    />
  ) : null;

  return (
    <div className="h-screen flex flex-col bg-background relative">
      <SetupHeader
        onBack={() => navigate(-1)}
        caption={`${isPersonal ? 'My Format' : 'House Game'} · ${checkedIds.size} of ${selectableCount} rules on`}
        title="Confirm Rules"
        right={
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={checkedIds.size === 0 || saving}
            className="h-11 px-4 rounded-[14px] bg-primary text-white font-bold text-[14px] flex items-center gap-1.5 disabled:opacity-40 flex-shrink-0"
          >
            {saveButtonInner ?? (<><Check className="w-4 h-4" /><span>Save</span></>)}
          </motion.button>
        }
      />

      <main className="flex-1 overflow-y-auto px-5 pt-2 pb-36 flex flex-col gap-3.5">
        <ConfirmHero
          description={description}
          foundCount={aiFoundPrimitives.length + customPrimitives.length}
          checkedCount={checkedIds.size}
          infeasibleCount={infeasiblePrimitives.length}
          parsedPrimitives={parsedPrimitives}
          onRefine={() =>
            navigate(
              isPersonal ? '/my-formats/new' : `/groups/${groupId}/house-game/new`,
              { state: { prefillDescription: description } }
            )
          }
        />

        {/* Name */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.03 }}>
          <label htmlFor="format-name" className={cn(label, 'block mb-1.5')}>
            {isPersonal ? 'Format name' : 'Game name'}
          </label>
          <input
            id="format-name"
            type="text"
            value={gameName}
            onChange={e => setGameName(e.target.value)}
            maxLength={40}
            placeholder={defaultName}
            className="w-full h-14 bg-card border border-border focus:border-primary rounded-[20px] px-4 text-[17px] font-bold text-foreground placeholder:text-muted-foreground/60 outline-none focus-visible:outline-none transition-colors"
          />
        </motion.div>

        {configWarnings.length > 0 && (
          <NoticeCard
            title={configWarnings.length === 1
              ? 'One selected rule has limited support'
              : `${configWarnings.length} selected rules have limited support`}
          >
            <ul className="space-y-1 mt-1 ml-4">
              {configWarnings.map((w) => (
                <li key={w} className="text-[#7C4A03]/80 text-[13px] leading-snug list-disc">{w}</li>
              ))}
            </ul>
          </NoticeCard>
        )}

        {parsedPrimitives.length === 0 && description && (
          <NoticeCard title="We couldn't identify any rules from that description.">
            <p className="text-[#7C4A03]/80 text-[13px] mt-0.5 leading-snug">
              Try being more specific, or select rules manually from the categories below.
            </p>
          </NoticeCard>
        )}

        {aiFoundPrimitives.length > 0 && (
          <section>
            <p className={cn(label, 'mt-2 mb-2')}>Here's what we found</p>
            <div className="space-y-2">
              {aiFoundPrimitives.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: 0.08 + i * 0.05 }}
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
          </section>
        )}

        {customPrimitives.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mt-2 mb-1 px-1">
              <p className="text-[13px] font-semibold text-muted-foreground">AI-Created Rules</p>
              <span className="text-[11px] font-bold text-primary bg-gold px-2 py-0.5 rounded-full">New</span>
            </div>
            <p className="text-[13px] text-muted-foreground mb-2 leading-snug px-1">
              Not in our standard library. Saved as reminders and shown at settlement.
            </p>
            <div className="space-y-2">
              {customPrimitives.map(p => (
                <CustomPrimitiveRow
                  key={p.id}
                  primitive={p}
                  checked={checkedIds.has(p.id)}
                  onToggle={() => handleToggle(p.id)}
                />
              ))}
            </div>
          </section>
        )}

        {infeasiblePrimitives.length > 0 && (
          <section>
            <p className={cn(label, 'mt-2 mb-2')}>Can't be created · {infeasiblePrimitives.length}</p>
            <InfeasibleList items={infeasiblePrimitives} />
          </section>
        )}

        <section>
          <p className={cn(label, 'mt-2')}>Want to add anything?</p>
          <p className="text-[13px] text-muted-foreground mb-2 px-1">Browse every rule MATCH can track.</p>
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
        </section>
      </main>

      <CtaFooter>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={checkedIds.size === 0 || saving}
          className={fdPrimaryCta}
        >
          {saveButtonInner ?? (
            <>
              <Check className="w-5 h-5 text-gold" />
              <span>{isPersonal ? 'Save format' : 'Save house game'} · {checkedIds.size} rule{checkedIds.size !== 1 ? 's' : ''}</span>
            </>
          )}
        </motion.button>
      </CtaFooter>

      <AnimatePresence>
        {savedFormatId && (
          <SavedSheet
            isPersonal={isPersonal}
            name={gameName || defaultName}
            ruleCount={checkedIds.size}
            doneLabel={returnTo ? 'Back to New Round' : 'Done'}
            onStartRound={() => {
              if (isPersonal && savedFormatId !== 'group') {
                navigate('/new-round', { state: { preSelectFormatId: savedFormatId }, replace: true });
              } else {
                // Group house game — just go to new round
                navigate('/new-round', { replace: true });
              }
            }}
            onDone={() => navigate(returnTo ?? '/', { replace: true })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
