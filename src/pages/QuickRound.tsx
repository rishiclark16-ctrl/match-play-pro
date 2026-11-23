import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRoundBuilder } from '@/hooks/useRoundBuilder';
import { describeRound } from '@/lib/roundPlan/describeRound';
import type { GameConfig } from '@/types/golf';
import { PlayComposer } from '@/components/play/PlayComposer';
import { PlayThinking } from '@/components/play/PlayThinking';
import { PlayReview } from '@/components/play/PlayReview';

/** The user's most recent round as a "same as last time" sentence. */
function useLastRoundText(userId: string | undefined): string | null {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    let live = true;
    (async () => {
      const { data } = await supabase
        .from('rounds')
        .select('course_name, games, players(name, order_index, is_ghost)')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!live || !data) return;
      const players = ((data.players ?? []) as { name: string; order_index: number; is_ghost: boolean }[])
        .filter(p => !p.is_ghost)
        .sort((a, b) => a.order_index - b.order_index)
        .slice(1)
        .map(p => p.name);
      setText(describeRound({
        courseName: data.course_name ?? '',
        games: (Array.isArray(data.games) ? data.games : []) as unknown as GameConfig[],
        otherPlayers: players,
      }));
    })();
    return () => { live = false; };
  }, [userId]);
  return text;
}

/**
 * /play: say the round, review it, tee off.
 * Entry points: the Home composer (passes `state.text`) and the centre tab.
 */
export default function QuickRound() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const builder = useRoundBuilder();
  const lastRoundText = useLastRoundText(user?.id);
  const navState = location.state as { text?: string; mic?: boolean } | null;
  const initial = navState?.text ?? '';
  const [autoListen] = useState(!!navState?.mic);
  const [text, setText] = useState(initial);
  const [editing, setEditing] = useState(!initial);
  const started = useRef(false);

  // Text handed over from Home: build as soon as friends and profile are loaded.
  useEffect(() => {
    if (!initial || started.current || !builder.ready) return;
    started.current = true;
    window.history.replaceState({}, '');
    builder.run(initial);
  }, [initial, builder]);

  // Submitting never waits on loading: a sentence sent before friends and profile
  // arrive runs the moment they do.
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    if (!pending || !builder.ready) return;
    const t = pending;
    setPending(null);
    builder.run(t);
  }, [pending, builder]);

  const submit = (t: string) => {
    setText(t);
    setEditing(false);
    setPending(t);
  };

  const showComposer = editing || (builder.phase === 'idle' && !initial);
  const thinking = !showComposer && (builder.phase === 'thinking' || !!pending || (builder.phase === 'idle' && !!initial && !builder.failure));

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex-shrink-0 px-5 pt-safe-content pb-2 flex items-center justify-between min-h-[56px]">
        <button
          onClick={() => (builder.phase === 'review' && !editing ? setEditing(true) : navigate(-1))}
          aria-label={builder.phase === 'review' && !editing ? 'Back to what you said' : 'Close'}
          className="h-11 w-11 rounded-[14px] bg-card border border-border flex items-center justify-center"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>
        <button onClick={() => navigate('/new-round')} className="h-11 px-3 text-[14px] font-semibold text-muted-foreground">
          Set up by hand
        </button>
      </header>

      {showComposer ? (
        <PlayComposer initialText={text} lastRoundText={lastRoundText} busy={false} autoListen={autoListen} onSubmit={submit} />
      ) : thinking ? (
        <PlayThinking text={text} />
      ) : builder.draft ? (
        <PlayReview
          draft={builder.draft}
          friends={builder.friends}
          creating={builder.phase === 'creating'}
          failure={builder.failure}
          onUpdate={builder.update}
          onEdit={() => setEditing(true)}
          onTeeOff={builder.teeOff}
        />
      ) : (
        <div className="flex-1 px-5 pt-6">
          <p className="text-[16px] font-semibold text-loss">{builder.failure ?? 'Something went wrong.'}</p>
          <button onClick={() => setEditing(true)} className="mt-4 text-[15px] font-bold text-primary">Try again</button>
        </div>
      )}
    </div>
  );
}
