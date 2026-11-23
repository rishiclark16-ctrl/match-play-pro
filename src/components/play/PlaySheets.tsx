import { useEffect, useState } from 'react';
import { Check, Search, Loader2, MapPin } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { fdInput } from '@/components/golf/setupStyles';
import { cn } from '@/lib/utils';
import { courseDisplayName, type CourseCandidate } from '@/lib/roundPlan/courseMatch';
import { searchCoursesApi } from '@/lib/roundPlan/courseApi';
import type { CourseTee } from '@/lib/roundPlan/buildDraft';
import type { FriendLike } from '@/lib/roundPlan/names';

function SheetShell({ open, onOpenChange, title, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="[&>button]:hidden rounded-t-[28px] p-0 max-h-[85vh] overflow-y-auto bg-background">
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />
        <h2 className="px-5 pt-4 pb-2 text-[20px] font-extrabold tracking-[-0.02em] text-foreground">{title}</h2>
        <div className="px-5" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>{children}</div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ selected, onClick, title, sub }: { selected?: boolean; onClick: () => void; title: string; sub?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full min-h-[56px] rounded-[16px] border px-4 py-3 text-left flex items-center gap-3',
        selected ? 'border-primary bg-primary/[0.06]' : 'border-border bg-card',
      )}
    >
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] font-semibold text-foreground truncate">{title}</span>
        {sub && <span className="block text-[13px] text-muted-foreground truncate">{sub}</span>}
      </span>
      {selected && <Check className="h-5 w-5 text-primary" strokeWidth={3} />}
    </button>
  );
}

export function TeeSheet({ open, onOpenChange, tees, current, onPick }: {
  open: boolean; onOpenChange: (o: boolean) => void; tees: CourseTee[]; current: string | null; onPick: (name: string) => void;
}) {
  return (
    <SheetShell open={open} onOpenChange={onOpenChange} title="Tees">
      <div className="space-y-2">
        {[...tees].sort((a, b) => (b.total_yards ?? 0) - (a.total_yards ?? 0)).map(t => (
          <Row
            key={t.tee_name}
            selected={t.tee_name === current}
            onClick={() => onPick(t.tee_name)}
            title={t.tee_name}
            sub={[t.total_yards ? `${t.total_yards.toLocaleString('en-US')} yds` : null, t.slope_rating ? `slope ${t.slope_rating}` : null, t.course_rating ? `rating ${t.course_rating}` : null].filter(Boolean).join(' · ')}
          />
        ))}
      </div>
    </SheetShell>
  );
}

export function FriendSheet({ open, onOpenChange, spoken, friends, current, onPick }: {
  open: boolean; onOpenChange: (o: boolean) => void; spoken: string; friends: FriendLike[];
  current: string | null; onPick: (profileId: string | null) => void;
}) {
  const [q, setQ] = useState('');
  const list = friends.filter(f => f.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <SheetShell open={open} onOpenChange={onOpenChange} title={`Who is “${spoken}”?`}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search friends" className={cn(fdInput, 'mb-3')} aria-label="Search friends" />
      <div className="space-y-2">
        <Row selected={current === null} onClick={() => onPick(null)} title={`Guest: ${spoken}`} sub="Not on MATCH, or not a friend yet" />
        {list.map(f => (
          <Row key={f.profileId} selected={current === f.profileId} onClick={() => onPick(f.profileId)} title={f.name} sub={f.handicap != null ? `Handicap ${f.handicap}` : undefined} />
        ))}
      </div>
    </SheetShell>
  );
}

export function CourseSheet({ open, onOpenChange, initialQuery, choices, onPick }: {
  open: boolean; onOpenChange: (o: boolean) => void; initialQuery: string; choices: CourseCandidate[];
  onPick: (c: CourseCandidate) => void;
}) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<CourseCandidate[]>(choices);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setResults(choices); }, [choices]);
  useEffect(() => {
    if (q.trim().length < 3 || q === initialQuery) return;
    let live = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchCoursesApi(q.trim());
        if (live) setResults(r);
      } catch {
        if (live) setResults([]);
      } finally {
        if (live) setLoading(false);
      }
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [q, initialQuery]);

  return (
    <SheetShell open={open} onOpenChange={onOpenChange} title="Which course?">
      <div className="relative mb-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Course name" className={cn(fdInput, 'pl-10')} aria-label="Search courses" />
        {loading && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="space-y-2">
        {results.map(c => (
          <button key={c.id} onClick={() => onPick(c)} className="w-full min-h-[56px] rounded-[16px] border border-border bg-card px-4 py-3 text-left flex items-center gap-3">
            <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-[16px] font-semibold text-foreground truncate">{courseDisplayName(c)}</span>
              <span className="block text-[13px] text-muted-foreground truncate">{[c.location?.city, c.location?.state].filter(Boolean).join(', ')}</span>
            </span>
          </button>
        ))}
        {!loading && !results.length && <p className="py-6 text-center text-[14px] text-muted-foreground">No courses found. Try a shorter name</p>}
      </div>
    </SheetShell>
  );
}
