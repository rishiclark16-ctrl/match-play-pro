import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ChevronRight, Crown, Flag, Loader2, Pencil, UserRound, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fdPrimaryCta, fdCard } from '@/components/golf/setupStyles';
import { CtaFooter, SectionLabel } from '@/components/golf/setupUi';
import { PaywallModal } from '@/components/subscription/PaywallModal';
import { canTeeOff, type DraftOverrides, type RoundDraft } from '@/lib/roundPlan/buildDraft';
import { GAME_LABEL, formatStake } from '@/lib/roundPlan/games';
import type { FriendLike } from '@/lib/roundPlan/names';
import type { PlanGameType } from '@/lib/roundPlan/types';
import type { GameConfig } from '@/types/golf';
import { CourseSheet, FriendSheet, TeeSheet } from './PlaySheets';

function gameDetail(g: GameConfig, names: Map<string, string>): string | null {
  const bits: string[] = [];
  if (g.carryover) bits.push('carryovers');
  if (g.autoPress) bits.push('auto presses');
  if (g.modifiedStableford) bits.push('modified');
  const teams = g.matchPlayTeams ?? (g.type === 'bestball' && g.teams && g.teams.length === 2 ? g.teams : null);
  if (teams) bits.push(teams.map(t => t.playerIds.map(id => names.get(id) ?? '?').join(' & ')).join(' vs '));
  if (g.useNet === false) bits.push('gross');
  return bits.length ? bits.join(' · ') : null;
}

interface PlayReviewProps {
  draft: RoundDraft;
  friends: FriendLike[];
  creating: boolean;
  failure: string | null;
  onUpdate: (o: DraftOverrides) => void;
  onEdit: () => void;
  onTeeOff: () => void;
}

export function PlayReview({ draft, friends, creating, failure, onUpdate, onEdit, onTeeOff }: PlayReviewProps) {
  const [sheet, setSheet] = useState<null | 'tee' | 'course' | { spoken: string; current: string | null }>(null);
  const [paywallFor, setPaywallFor] = useState<PlanGameType | null>(null);
  const ready = canTeeOff(draft);
  const firstNames = new Map(draft.players.map(p => [p.key, p.name.split(' ')[0]]));
  const loc = draft.course?.candidate.location;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 pb-48 space-y-[14px]">
        <button onClick={onEdit} className="w-full text-left rounded-[18px] bg-muted px-4 py-3 flex items-start gap-3">
          <span className="flex-1 text-[15px] leading-snug text-foreground">“{draft.text}”</span>
          <Pencil className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-label="Edit what you said" />
        </button>
        {draft.source === 'local' && (
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <WifiOff className="h-3.5 w-3.5" /> Set up offline from your words. Check the details
          </p>
        )}

        {/* Course */}
        {draft.course ? (
          <section className="rounded-[28px] bg-primary text-primary-foreground p-5">
            <button onClick={() => setSheet('course')} className="w-full text-left">
              <p className="text-[12px] font-semibold text-on-forest-muted">{[loc?.city, loc?.state].filter(Boolean).join(', ') || 'Course'}</p>
              <p className="mt-1 text-[26px] font-extrabold leading-tight tracking-[-0.03em]">{draft.course.name}</p>
            </button>
            <div className="mt-4 flex flex-wrap gap-2">
              {draft.tee && (
                <button onClick={() => setSheet('tee')} className="h-11 rounded-full bg-gold text-gold-foreground px-3.5 text-[14px] font-bold flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5" /> {draft.tee.tee_name} tees <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="h-9 rounded-full bg-white/10 px-3.5 text-[14px] font-semibold flex items-center">{draft.holes} holes</span>
              {draft.slope && <span className="h-9 rounded-full bg-white/10 px-3.5 text-[14px] font-semibold flex items-center tabular-nums">{draft.slope} / {draft.rating}</span>}
            </div>
          </section>
        ) : (
          <button onClick={() => setSheet('course')} className={cn(fdCard, 'w-full p-5 text-left border-2 border-dashed border-loss/40')}>
            <p className="text-[18px] font-bold text-foreground">Pick the course</p>
            <p className="mt-1 text-[14px] text-muted-foreground">{draft.courseChoices.length ? `${draft.courseChoices.length} possible matches` : 'Search for it'}</p>
          </button>
        )}

        {/* Players */}
        <section>
          <SectionLabel>Players · {draft.players.length}</SectionLabel>
          <div className={cn(fdCard, 'divide-y divide-border overflow-hidden')}>
            {draft.players.map(p => (
              <div key={p.key} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={cn('h-10 w-10 rounded-[12px] flex items-center justify-center text-[14px] font-bold',
                    p.kind === 'guest' ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground')}>
                    {p.kind === 'guest' ? <UserRound className="h-4 w-4" /> : p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                  <button
                    disabled={p.kind === 'you'}
                    onClick={() => setSheet({ spoken: p.spoken, current: p.profileId })}
                    className="flex-1 min-w-0 min-h-[44px] text-left flex flex-col justify-center"
                  >
                    <span className="block text-[16px] font-semibold text-foreground truncate">{p.name}{p.kind === 'you' && ' (you)'}</span>
                    <span className="block text-[13px] text-muted-foreground truncate">
                      {p.kind === 'guest' ? 'Guest' : p.kind === 'friend' ? 'Friend' : 'You'}
                      {p.saidAs && ` · you said “${p.saidAs}”`}
                    </span>
                  </button>
                  <span className="text-[15px] font-bold tabular-nums text-foreground">{p.handicap != null ? p.handicap : '–'}</span>
                </div>
                {p.alternatives.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2 pl-[52px]">
                    {p.alternatives.map(a => (
                      <button key={a.profileId} onClick={() => onUpdate({ friendFor: { [p.spoken.toLowerCase()]: a.profileId } })}
                        className="h-9 rounded-full border-2 border-primary px-3 text-[14px] font-semibold text-primary">
                        {a.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Games */}
        <section>
          <SectionLabel>Games</SectionLabel>
          <div className={cn(fdCard, 'divide-y divide-border overflow-hidden')}>
            {draft.games.map(g => {
              const type = g.type as PlanGameType;
              const detail = gameDetail(g, firstNames);
              return (
                <div key={g.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[16px] font-semibold text-foreground">{GAME_LABEL[type] ?? g.type}</span>
                    {detail && <span className="block text-[13px] text-muted-foreground truncate">{detail}</span>}
                  </span>
                  {g.stakes > 0 && <span className="text-[15px] font-bold text-primary tabular-nums">{formatStake(type, g.stakes)}</span>}
                </div>
              );
            })}
            {draft.needsPro.map(t => (
              <button key={t} onClick={() => setPaywallFor(t)} className="w-full px-4 py-3 flex items-center gap-3 text-left">
                <Crown className="h-4 w-4 text-primary" />
                <span className="flex-1 text-[16px] font-semibold text-foreground">{GAME_LABEL[t]}</span>
                <span className="text-[13px] font-bold text-primary">Unlock with Pro</span>
              </button>
            ))}
            {!draft.games.length && !draft.needsPro.length && (
              <p className="px-4 py-3 text-[15px] text-muted-foreground">Stroke play, no money</p>
            )}
          </div>
        </section>

        {/* Must fix */}
        {draft.issues.length > 0 && (
          <section className="rounded-[20px] border border-loss/30 bg-loss/[0.05] p-4 space-y-2" aria-live="polite">
            {draft.issues.map((i, n) => (
              <p key={n} className="flex gap-2.5 text-[15px] font-semibold leading-snug text-loss">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {i.message}
              </p>
            ))}
          </section>
        )}

        {/* Decided for you */}
        {draft.assumptions.length > 0 && (
          <section>
            <SectionLabel>We assumed</SectionLabel>
            <ul className="space-y-2">
              {draft.assumptions.map((a, n) => (
                <li key={n} className="flex gap-2.5 text-[14px] leading-snug text-foreground">
                  <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" /> {a.message}
                </li>
              ))}
            </ul>
          </section>
        )}
        {failure && <p className="text-[14px] font-semibold text-loss">{failure}</p>}
      </div>

      <CtaFooter>
        {draft.needsPro.length > 0 && draft.issues.length === 0 ? (
          <div className="space-y-2">
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setPaywallFor(draft.needsPro[0])} className={fdPrimaryCta}>
              <Crown className="h-5 w-5 text-gold" /> Unlock {draft.needsPro.map(t => GAME_LABEL[t]).join(' & ')}
            </motion.button>
            <button onClick={() => onUpdate({ dropGames: draft.needsPro })} className="w-full h-11 text-[15px] font-semibold text-foreground">
              Start without {draft.needsPro.length > 1 ? 'them' : GAME_LABEL[draft.needsPro[0]]}
            </button>
          </div>
        ) : (
          <motion.button whileTap={{ scale: 0.98 }} onClick={onTeeOff} disabled={!ready || creating} className={fdPrimaryCta}>
            {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : ready ? 'Tee off' : 'Fix the red items to start'}
          </motion.button>
        )}
      </CtaFooter>

      <TeeSheet
        open={sheet === 'tee'} onOpenChange={o => !o && setSheet(null)} tees={draft.teeChoices} current={draft.tee?.tee_name ?? null}
        onPick={name => { setSheet(null); onUpdate({ teeName: name }); }}
      />
      <CourseSheet
        open={sheet === 'course'} onOpenChange={o => !o && setSheet(null)}
        initialQuery={draft.courseQuery ?? draft.course?.name ?? ''} choices={draft.courseChoices}
        onPick={c => { setSheet(null); onUpdate({ course: c }); }}
      />
      {sheet && typeof sheet === 'object' && (
        <FriendSheet
          open onOpenChange={o => !o && setSheet(null)} spoken={sheet.spoken} friends={friends} current={sheet.current}
          onPick={id => { const k = sheet.spoken.toLowerCase(); setSheet(null); onUpdate({ friendFor: { [k]: id } }); }}
        />
      )}
      <PaywallModal open={!!paywallFor} onOpenChange={o => !o && setPaywallFor(null)} feature={paywallFor ? GAME_LABEL[paywallFor] : undefined} />
    </>
  );
}
