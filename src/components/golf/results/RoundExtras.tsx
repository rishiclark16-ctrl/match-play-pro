import { CloudRain, Shuffle, Share2, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NetSettlement } from '@/lib/games/settlement';
import type { MatchPlayResult } from '@/lib/games/matchPlay';
import type { ActivePrimitive } from '@/types/houseGame';
import type { Player } from '@/types/golf';
import { getPropBetLabel, getPropBetIcon, type PropBet } from '@/types/betting';
import type { JunkSummaryEntry } from '@/hooks/useRoundCompleteState';
import { Reveal, ResultsCard, SectionLabel, Pill } from './resultsUi';
import { firstName, formatMoney, moneyClass } from './resultsFormat';

/**
 * Presentational sections for the round-results screen that sit around the
 * core settlement list: notices, ghost pot, house game, custom rules, junk.
 * All values arrive precomputed from the page's hooks.
 */

function Notice({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body?: string;
}) {
  return (
    <ResultsCard className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
      <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-foreground" />
      </span>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-foreground">{title}</p>
        {body && <p className="text-[12px] text-muted-foreground leading-snug">{body}</p>}
      </div>
    </ResultsCard>
  );
}

export function RoundNotices({
  matchPlayResult,
  isRainShortened,
  netOut,
}: {
  matchPlayResult: MatchPlayResult | null;
  isRainShortened: boolean;
  netOut: boolean;
}) {
  if (!matchPlayResult && !isRainShortened && !netOut) return null;
  return (
    <Reveal delay={0.3} className="space-y-2 mb-3.5">
      {matchPlayResult && <Notice icon={Swords} title={`Match play: ${matchPlayResult.statusText}`} />}
      {isRainShortened && (
        <Notice
          icon={CloudRain}
          title="Rain-shortened settlement applied"
          body="Front 9 settled normally · Back 9 and overall not scored"
        />
      )}
      {netOut && (
        <Notice
          icon={Shuffle}
          title="Net-out applied"
          body="All debts combined into the fewest payments"
        />
      )}
    </Reveal>
  );
}

function TransferRow({ from, to, amount }: { from: string; to: string; amount: number }) {
  return (
    <div className="flex items-center gap-3 px-4 min-h-[48px] border-b border-border last:border-b-0">
      <span className="text-[15px] font-semibold text-foreground flex-1 truncate">
        {from} <span className="font-normal text-muted-foreground">pays</span> {to}
      </span>
      <span className="text-[17px] font-extrabold tabular-nums text-foreground">
        {formatMoney(amount, { signed: false })}
      </span>
    </div>
  );
}

export function GhostPotCard({ entries, total }: { entries: NetSettlement[]; total: number }) {
  if (total <= 0) return null;
  return (
    <Reveal delay={0.36} className="mb-3.5">
      <SectionLabel right={<Pill>{formatMoney(total, { signed: false })} pot</Pill>}>Ghost pot</SectionLabel>
      <ResultsCard>
        {entries.map((s) => (
          <TransferRow key={`${s.fromPlayerId}-${s.toPlayerId}`} from={firstName(s.fromPlayerName)} to="the pot" amount={s.amount} />
        ))}
      </ResultsCard>
    </Reveal>
  );
}

export function HouseGameCard({
  settlements,
  onShare,
}: {
  settlements: NetSettlement[];
  onShare: () => void;
}) {
  if (settlements.length === 0) return null;
  return (
    <Reveal delay={0.38} className="mb-3.5">
      <SectionLabel>House game</SectionLabel>
      <ResultsCard>
        {settlements.map((s) => (
          <TransferRow
            key={`${s.fromPlayerId}-${s.toPlayerId}`}
            from={firstName(s.fromPlayerName)}
            to={firstName(s.toPlayerName)}
            amount={s.amount}
          />
        ))}
        <button
          onClick={onShare}
          className="w-full h-12 flex items-center justify-center gap-2 text-[14px] font-semibold text-[#14532D] border-t border-border active:bg-muted"
        >
          <Share2 className="w-4 h-4" />
          Share house game results
        </button>
      </ResultsCard>
    </Reveal>
  );
}

export function CustomRulesCard({ rules }: { rules: ActivePrimitive[] }) {
  if (rules.length === 0) return null;
  return (
    <Reveal delay={0.4} className="mb-3.5">
      <SectionLabel right={<span className="text-[12px] text-muted-foreground">Settle by hand</span>}>
        Custom rules
      </SectionLabel>
      <ResultsCard>
        {rules.map((rule) => {
          const label = rule.label ?? rule.id.replace('custom_', '').replace(/_/g, ' ');
          return (
            <div key={rule.id} className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-foreground">{label}</p>
                {rule.description && (
                  <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">{rule.description}</p>
                )}
              </div>
              {rule.value != null && (
                <span className="text-[15px] font-bold text-foreground shrink-0">${String(rule.value)}</span>
              )}
            </div>
          );
        })}
      </ResultsCard>
    </Reveal>
  );
}

export function JunkBetsCard({
  bets,
  players,
  summary,
}: {
  bets: PropBet[];
  players: Player[];
  summary: JunkSummaryEntry[];
}) {
  if (bets.length === 0) return null;
  return (
    <Reveal delay={0.42} className="mb-3.5">
      <SectionLabel right={<Pill>{bets.length} logged</Pill>}>Junk bets</SectionLabel>
      <ResultsCard>
        {bets.map((bet) => {
          const winner = players.find(p => p.id === bet.winnerId);
          return (
            <div key={bet.id} className="flex items-center gap-3 px-4 min-h-[52px] border-b border-border">
              <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[15px] shrink-0" aria-hidden>
                {getPropBetIcon(bet.type)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-foreground truncate">
                  {getPropBetLabel(bet.type)}
                  <span className="font-normal text-muted-foreground"> · Hole {bet.holeNumber}</span>
                </p>
                {winner && <p className="text-[12px] text-muted-foreground">{firstName(winner.name)}</p>}
              </div>
              <span className="text-[15px] font-bold tabular-nums text-[#14532D]">+${bet.stakes}</span>
            </div>
          );
        })}
        {summary.length > 0 && (
          <div className="px-4 py-3 bg-muted/60 grid grid-cols-2 gap-x-6 gap-y-1">
            {summary.map(entry => (
              <div key={entry.name} className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">{firstName(entry.name)}</span>
                <span className={cn('text-[13px] font-bold tabular-nums', moneyClass(entry.net))}>
                  {entry.net === 0 ? 'Even' : formatMoney(entry.net)}
                </span>
              </div>
            ))}
          </div>
        )}
      </ResultsCard>
    </Reveal>
  );
}
