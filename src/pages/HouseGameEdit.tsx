import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Trash2, Globe, Lock, Sparkles } from 'lucide-react';
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
import { HeroCard, HeroTile, SetupHeader } from '@/components/golf/setupUi';
import { NoticeCard } from '@/components/golf/HouseGameConfirmParts';
import { fdPrimaryCta } from '@/components/golf/setupStyles';
import { cn } from '@/lib/utils';

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
  const back = () => navigate(-1);

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <SetupHeader onBack={back} caption={isPersonal ? 'My Format' : 'House Game'} title="Edit Rules" />
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <SetupHeader
        onBack={back}
        caption={isPersonal ? 'My Format' : 'House Game'}
        title="Edit Rules"
        right={
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleDelete}
            disabled={deleting}
            aria-label={isPersonal ? 'Delete format' : 'Delete house game'}
            className="w-11 h-11 rounded-[14px] bg-[#FEF3F2] flex items-center justify-center disabled:opacity-40 flex-shrink-0"
          >
            <Trash2 className="w-5 h-5 text-destructive" />
          </motion.button>
        }
      />

      <main className="flex-1 overflow-y-auto px-5 pt-2 pb-nav flex flex-col gap-3.5">
        <HeroCard
          eyebrow={<span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-gold" /> {isPersonal ? 'Your format' : 'Group house game'}</span>}
          title={gameName || (isPersonal ? 'My Format' : 'House Game')}
          body={currentSource?.description || undefined}
        >
          <div className="grid grid-cols-2 gap-2 mt-4">
            <HeroTile hot value={checkedIds.size} label={checkedIds.size === 1 ? 'Rule on' : 'Rules on'} />
            {isPersonal && personalFormat
              ? <HeroTile value={personalFormat.isPublic ? 'Public' : 'Private'} label="Visibility" />
              : <HeroTile value={CATEGORY_ORDER.filter(c => PRIMITIVES_BY_CATEGORY[c]?.some(p => checkedIds.has(p.id))).length} label="Categories" />}
          </div>
        </HeroCard>

        {hasActiveRound && (
          <NoticeCard title="Round in progress">
            <p className="text-[#7C4A03]/80 text-[13px] mt-0.5 leading-snug">
              Changes will apply to your next round, not the current one.
            </p>
          </NoticeCard>
        )}

        <div>
          <label htmlFor="edit-format-name" className="block text-[13px] font-semibold text-muted-foreground mb-1.5 px-1">
            {isPersonal ? 'Format name' : 'Game name'}
          </label>
          <input
            id="edit-format-name"
            type="text"
            value={gameName}
            onChange={e => setGameName(e.target.value)}
            maxLength={40}
            placeholder={isPersonal ? 'My Format' : 'House Game'}
            className="w-full h-14 bg-card border border-border focus:border-primary rounded-[20px] px-4 text-[17px] font-bold text-foreground placeholder:text-muted-foreground/60 outline-none focus-visible:outline-none transition-colors"
          />
        </div>

        {isPersonal && personalFormat && (
          <div className="flex items-center justify-between gap-3 bg-card rounded-[20px] border border-border px-4 min-h-[64px]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-[14px] bg-muted flex items-center justify-center">
                {personalFormat.isPublic
                  ? <Globe className="w-5 h-5 text-primary" />
                  : <Lock className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-[16px] font-semibold text-foreground">
                  {personalFormat.isPublic ? 'Public' : 'Private'}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {personalFormat.isPublic
                    ? 'Friends in your group can use this format'
                    : 'Only visible to you'}
                </p>
              </div>
            </div>
            <Switch
              checked={personalFormat.isPublic ?? false}
              aria-label="Public format"
              onCheckedChange={async (checked) => {
                hapticLight();
                if (personalFormat?.id) await togglePublic(personalFormat.id, checked);
              }}
            />
          </div>
        )}

        <p className="text-[13px] font-semibold text-muted-foreground px-1 mt-2 -mb-1.5">Rules</p>
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

        {/* Save — in the flow so the bottom nav can't cover it */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={checkedIds.size === 0 || saving}
          className={cn(fdPrimaryCta, 'mt-2')}
        >
          {saving ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-5 h-5 rounded-full border-2 border-white border-t-transparent"
              />
              <span>Saving changes...</span>
            </>
          ) : (
            <>
              <Check className="w-5 h-5 text-gold" />
              <span>Save Changes · {checkedIds.size} rule{checkedIds.size !== 1 ? 's' : ''}</span>
            </>
          )}
        </motion.button>
      </main>
    </div>
  );
}
