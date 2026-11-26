import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { useCreateSupabaseRound } from '@/hooks/useCreateSupabaseRound';
import { useCourses } from '@/hooks/useCourses';
import { generateId } from '@/types/golf';
import { capture } from '@/lib/posthog';
import { logger } from '@/lib/logger';
import { localParse } from '@/lib/roundPlan/localParse';
import { buildDraft, canTeeOff, type DraftDeps, type DraftOverrides, type RoundDraft } from '@/lib/roundPlan/buildDraft';
import { searchCoursesApi, getCourseDetailsApi } from '@/lib/roundPlan/courseApi';
import type { PlanSource, RoundPlan } from '@/lib/roundPlan/types';
import type { FriendLike } from '@/lib/roundPlan/names';

export type BuilderPhase = 'idle' | 'thinking' | 'review' | 'creating';

const AI_TIMEOUT_MS = 15_000;

/**
 * Every accepted friend (useFriends pages 20 at a time, which would leave
 * later friends unmatchable by name).
 */
async function fetchAllFriends(userId: string): Promise<FriendLike[]> {
  const { data: links } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .limit(1000);
  const ids = (links ?? []).map(l => (l.user_id === userId ? l.friend_id : l.user_id));
  if (!ids.length) return [];
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, handicap').in('id', ids);
  return (profiles ?? [])
    .filter(p => p.full_name)
    .map(p => ({ profileId: p.id, name: p.full_name as string, handicap: p.handicap ?? null }));
}

/** Asks the plan-round edge function; null means "use the offline parser". */
async function planWithAI(text: string, friendNames: string[]): Promise<RoundPlan | null> {
  // capabilities: what this build can play. The server keeps anything newer out of older apps.
  const call = supabase.functions.invoke('plan-round', { body: { text, friends: friendNames, capabilities: ['teamScoring', 'custom'] } });
  const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), AI_TIMEOUT_MS));
  try {
    const res = await Promise.race([call, timeout]);
    if (!res || res.error || !res.data?.plan) return null;
    return res.data.plan as RoundPlan;
  } catch {
    return null;
  }
}

/**
 * "Say it and play": a sentence in, a reviewed round out.
 * The page owns presentation; this hook owns the plan -> draft -> round pipeline.
 */
export function useRoundBuilder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [friends, setFriends] = useState<FriendLike[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    let live = true;
    fetchAllFriends(user.id)
      .then(f => { if (live) setFriends(f); })
      .catch(err => logger.error('Round builder could not load friends', err))
      .finally(() => { if (live) setFriendsLoading(false); });
    return () => { live = false; };
  }, [user]);
  const { isPro, limits } = useSubscription();
  const { createRound } = useCreateSupabaseRound();
  const { createCourse } = useCourses();

  const [phase, setPhase] = useState<BuilderPhase>('idle');
  const [draft, setDraft] = useState<RoundDraft | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const planRef = useRef<{ plan: RoundPlan; text: string; source: PlanSource } | null>(null);
  const overridesRef = useRef<DraftOverrides>({});

  const deps = useMemo<DraftDeps | null>(() => {
    if (!user) return null;
    return {
      searchCourses: searchCoursesApi,
      getCourseDetails: getCourseDetailsApi,
      friends,
      user: {
        profileId: user.id,
        name: profile?.full_name || 'You',
        handicap: profile?.handicap ?? null,
        teePreference: profile?.tee_preference ?? null,
      },
      isPro,
      maxPlayers: limits.maxPlayers,
      generateId,
    };
  }, [user, friends, profile, isPro, limits.maxPlayers]);

  const ready = !!deps && !friendsLoading;

  const run = useCallback(async (text: string) => {
    if (!deps) return;
    const clean = text.trim();
    if (clean.length < 3) return;
    setPhase('thinking');
    setFailure(null);
    overridesRef.current = {};
    const started = Date.now();
    const ai = await planWithAI(clean, deps.friends.map(f => f.name));
    const plan = ai ?? localParse(clean);
    const source: PlanSource = ai ? 'ai' : 'local';
    planRef.current = { plan, text: clean, source };
    try {
      const d = await buildDraft(plan, clean, source, deps);
      setDraft(d);
      setPhase('review');
      capture('ai_round_drafted', {
        source,
        ms: Date.now() - started,
        issues: d.issues.length,
        assumptions: d.assumptions.length,
        players: d.players.length,
        games: d.games.map(g => g.type),
        ready: canTeeOff(d),
      });
    } catch (err) {
      logger.error('Round builder failed to draft', err);
      setFailure("Couldn't set that up. Try again, or set the round up by hand.");
      setPhase('idle');
    }
  }, [deps]);

  /** Re-resolves with the user's picks from the review screen. */
  const update = useCallback(async (o: DraftOverrides) => {
    if (!deps || !planRef.current) return;
    const prev = overridesRef.current;
    overridesRef.current = {
      ...prev,
      ...o,
      friendFor: { ...prev.friendFor, ...o.friendFor },
      dropGames: [...new Set([...(prev.dropGames ?? []), ...(o.dropGames ?? [])])],
      ...(o.course ? { teeName: o.teeName } : {}),
    };
    const { plan, text, source } = planRef.current;
    setDraft(await buildDraft(plan, text, source, deps, overridesRef.current));
  }, [deps]);

  const teeOff = useCallback(async () => {
    if (!draft || !draft.course || !canTeeOff(draft)) return;
    setPhase('creating');
    const courseName = draft.tee ? `${draft.course.name} (${draft.tee.tee_name})` : draft.course.name;
    const loc = draft.course.candidate.location;
    const local = createCourse(
      courseName,
      [loc?.city, loc?.state].filter(Boolean).join(', ') || undefined,
      draft.holeInfo,
      draft.slope ?? undefined,
      draft.rating ?? undefined,
    );
    const match = draft.games.find(g => g.type === 'match');
    const bestball = draft.games.find(g => g.type === 'bestball');
    const result = await createRound({
      courseId: local.id,
      courseName,
      holes: draft.holes,
      holeInfo: draft.holeInfo,
      strokePlay: true,
      matchPlay: !!match,
      stakes: match?.stakes,
      slope: draft.slope ?? undefined,
      rating: draft.rating ?? undefined,
      handicapMode: 'auto',
      games: draft.games,
      players: draft.players.map(p => ({
        localId: p.key,
        name: p.name,
        handicap: p.handicap ?? undefined,
        profileId: p.profileId ?? undefined,
        teamId: bestball?.teams?.find(t => t.playerIds.includes(p.key))?.id,
      })),
    });
    if (result.round) {
      capture('ai_round_started', { source: draft.source, games: draft.games.map(g => g.type), players: draft.players.length });
      navigate(`/round/${result.round.id}`, { replace: true });
      return;
    }
    setPhase('review');
    if (result.error?.isAuthError) navigate('/auth');
    setFailure(result.error?.message ?? "Couldn't start the round. Try again.");
  }, [draft, createCourse, createRound, navigate]);

  return { phase, draft, failure, ready, run, update, teeOff, friends: deps?.friends ?? [], isPro };
}
