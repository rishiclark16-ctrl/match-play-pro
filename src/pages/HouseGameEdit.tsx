import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Trash2, Globe, Lock } from 'lucide-react';
import { useHouseGame } from '@/hooks/useHouseGame';
import { usePersonalGameFormats } from '@/hooks/usePersonalGameFormats';
import { useAuth } from '@/hooks/useAuth';
import { ActivePrimitive } from '@/types/houseGame';
import { PRIMITIVE_MAP, PRIMITIVES_BY_CATEGORY, CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/houseGame/primitives';
import { CategorySection } from '@/components/golf/HouseGamePrimitives';
import { Switch } from '@/components/ui/switch';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// ── Main edit page ────────────────────────────────────────────────────────────
export default function HouseGameEdit() {
  const { groupId, formatId } = useParams<{ groupId?: string; formatId?: string }>();
  const isPersonal = !groupId;
  const navigate = useNavigate();
  const { user } = useAuth();

  // Group mode hooks
  const { houseGame, loading: groupLoading, saving: groupSaving, saveHouseGame } = useHouseGame(isPersonal ? null : groupId ?? null);

  // Personal mode hooks
  const { formats, loading: personalLoading, saving: personalSaving, saveFormat, deleteFormat, togglePublic } = usePersonalGameFormats();
  const personalFormat = isPersonal ? (formats.find(f => f.id === formatId) ?? null) : null;

  const loading = isPersonal ? personalLoading : groupLoading;
  const saving = isPersonal ? personalSaving : groupSaving;

  const [deleting, setDeleting] = useState(false);
  const [hasActiveRound, setHasActiveRound] = useState(false);

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [valueMap, setValueMap] = useState<Map<string, unknown>>(new Map());
  const [initialized, setInitialized] = useState(false);
  const [gameName, setGameName] = useState<string>('');

  // Pre-load existing primitives once data arrives
  useEffect(() => {
    const source = isPersonal ? personalFormat : houseGame;
    if (source && !initialized) {
      const ids = new Set(source.activePrimitives.map(p => p.id));
      const vals = new Map<string, unknown>();
      for (const p of source.activePrimitives) {
        if (p.value !== null && p.value !== undefined) vals.set(p.id, p.value);
      }
      setCheckedIds(ids);
      setValueMap(vals);
      setGameName(source.name ?? (isPersonal ? 'My Format' : 'House Game'));
      setInitialized(true);
    }
  }, [houseGame, personalFormat, initialized, isPersonal]);

  // Check if the user is currently in any active (non-complete) round
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: playerRows } = await supabase
        .from('players')
        .select('round_id')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!playerRows?.length) { setHasActiveRound(false); return; }

      const roundIds = playerRows.map(r => r.round_id).filter(Boolean);
      const { data: activeRounds } = await supabase
        .from('rounds')
        .select('id')
        .in('id', roundIds)
        .neq('status', 'complete')
        .limit(1);

      setHasActiveRound((activeRounds?.length ?? 0) > 0);
    })();
  }, [user]);

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

    const activePrimitives: ActivePrimitive[] = Array.from(checkedIds).map(id => ({
      id,
      value: valueMap.get(id) ?? PRIMITIVE_MAP[id]?.defaultValue ?? null,
    }));

    if (isPersonal) {
      const id = await saveFormat({
        id: formatId,
        name: gameName.trim() || personalFormat?.name || 'My Format',
        description: personalFormat?.description ?? '',
        activePrimitives,
      });
      if (id) {
        hapticSuccess();
        toast.success('Format updated!');
        navigate(-1);
      } else {
        toast.error('Failed to save — try again');
      }
    } else {
      const ok = await saveHouseGame({
        groupId: groupId!,
        name: gameName.trim() || houseGame?.name || 'House Game',
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
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (isPersonal) {
        if (!formatId) return;
        const ok = await deleteFormat(formatId);
        if (ok) {
          hapticSuccess();
          toast.success('Format removed');
          navigate(-1);
        } else {
          hapticError();
          toast.error('Failed to delete — try again');
        }
      } else {
        if (!houseGame) return;
        const { error } = await supabase
          .from('house_games')
          .delete()
          .eq('id', houseGame.id);
        if (error) throw error;
        hapticSuccess();
        toast.success('House Game removed');
        navigate('/groups', { replace: true });
      }
    } catch {
      hapticError();
      toast.error('Failed to delete — try again');
    } finally {
      setDeleting(false);
    }
  };

  const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };
  const currentSource = isPersonal ? personalFormat : houseGame;

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
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {isPersonal ? 'My Format' : 'House Game'}
            </p>
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

      {currentSource && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mt-4 bg-[#0A0A0A] rounded-2xl px-4 py-3"
        >
          <p className="text-white/50 text-[11px] font-bold uppercase tracking-[0.08em]">Current</p>
          <p className="text-white text-[13px] font-bold mt-0.5 line-clamp-2">
            {currentSource.description || currentSource.name}
          </p>
        </motion.div>
      )}

      {hasActiveRound && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mt-3 bg-[#FFF3CD] border border-[#F0BB3A] rounded-2xl px-4 py-3"
        >
          <p className="text-[#7D4E0F] font-bold text-[13px]">Round in progress</p>
          <p className="text-[#7D4E0F]/70 text-[12px] mt-0.5 leading-snug">
            Changes will apply to your next round, not the current one.
          </p>
        </motion.div>
      )}

      <main className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 pb-32 mt-3">
        {/* Game name */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground block mb-1.5">
            {isPersonal ? 'Format Name' : 'Game Name'}
          </label>
          <input
            type="text"
            value={gameName}
            onChange={e => setGameName(e.target.value)}
            maxLength={40}
            placeholder={isPersonal ? 'My Format' : 'House Game'}
            className="w-full bg-white border-2 border-foreground/20 focus:border-foreground rounded-xl px-4 py-3 text-[15px] font-bold text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors"
          />
        </div>

        {isPersonal && personalFormat && (
          <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-border/30">
            <div className="flex items-center gap-2.5">
              {personalFormat.isPublic
                ? <Globe className="w-4 h-4 text-foreground" />
                : <Lock className="w-4 h-4 text-muted-foreground" />}
              <div>
                <p className="text-[13px] font-bold text-foreground">
                  {personalFormat.isPublic ? 'Public' : 'Private'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {personalFormat.isPublic
                    ? 'Friends in your group can use this format'
                    : 'Only visible to you'}
                </p>
              </div>
            </div>
            <Switch
              checked={personalFormat.isPublic ?? false}
              onCheckedChange={async (checked) => {
                hapticLight();
                if (personalFormat?.id) await togglePublic(personalFormat.id, checked);
              }}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
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
        </div>
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
