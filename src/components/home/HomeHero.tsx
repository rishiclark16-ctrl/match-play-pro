import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Trash2, Flag, Coins, Users } from 'lucide-react';
import { formatGameType } from '@/lib/formatGameType';
import { cn } from '@/lib/utils';
import type { Round } from '@/types/golf';

/** Greeting for the hero caption, by local hour. */
function greeting(firstName: string | null): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return firstName ? `${part}, ${firstName}` : part;
}

function gameNames(round: Round): string[] {
  const games = (round as Round & { games?: unknown[] }).games as unknown[] | undefined;
  if (!Array.isArray(games)) return [];
  const names = games
    .map((g: unknown) => {
      if (typeof g === 'string') return g;
      if (g && typeof g === 'object') {
        const obj = g as Record<string, unknown>;
        return String(obj.type ?? obj.name ?? '');
      }
      return '';
    })
    .filter(Boolean)
    .map(formatGameType);
  return Array.from(new Set(names));
}

/** Sub-tile inside the Forest hero. `hot` = the one lime tile. */
function HeroTile({ label, value, sub, hot }: { label: string; value: string | number; sub?: string; hot?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-[18px] px-3.5 pt-3 pb-3 min-w-0',
        hot ? 'bg-gold text-gold-foreground' : 'bg-white/10 text-white'
      )}
    >
      <p className={cn('text-[12px] font-semibold leading-none', hot ? 'text-gold-foreground/80' : 'text-[#CFE3D6]')}>
        {label}
      </p>
      <p className="mt-2 text-[30px] font-extrabold leading-none tracking-[-0.04em] tabular-nums truncate">
        {value}
      </p>
      {sub && (
        <p className={cn('mt-1.5 text-[12px] font-medium leading-none truncate', hot ? 'text-gold-foreground/80' : 'text-[#CFE3D6]')}>
          {sub}
        </p>
      )}
    </div>
  );
}

const heroBase =
  'relative w-full overflow-hidden rounded-[28px] bg-primary text-primary-foreground p-5 text-left';

/** Faint contour lines in the hero corner: a quiet nod to a green's topography. */
function HeroContours() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -right-16 -top-16 h-[220px] w-[220px] text-white/[0.06]"
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="100" cy="100" r="30" />
      <circle cx="100" cy="100" r="52" />
      <circle cx="100" cy="100" r="74" />
      <circle cx="100" cy="100" r="96" />
    </svg>
  );
}

interface LiveHeroProps {
  round: Round;
  playerCount?: number;
  currentHole?: number;
  onOpen: () => void;
  onDelete?: (id: string) => Promise<void>;
  isDeleting?: boolean;
}

/** Forest hero card for the user's live round. */
export function HomeLiveHero({ round, playerCount, currentHole, onOpen, onDelete, isDeleting }: LiveHeroProps) {
  const holes = round.holes ?? 18;
  const thru = currentHole && currentHole > 0 ? currentHole : 0;
  const progress = Math.min(thru / holes, 1);
  const names = gameNames(round);

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={`Open live round at ${round.courseName}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className={cn(heroBase, 'cursor-pointer select-none')}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <HeroContours />

      <div className="relative flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 pl-2.5 pr-3 h-8 text-[13px] font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
          </span>
          Live now
        </span>
        {onDelete && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onDelete(round.id); }}
            disabled={isDeleting}
            aria-label="Delete round"
            className="-mr-1.5 -mt-1.5 h-11 w-11 rounded-[14px] flex items-center justify-center text-[#CFE3D6] active:bg-white/10 disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-[18px] w-[18px]" />}
          </motion.button>
        )}
      </div>

      <h2 className="relative mt-3 text-[28px] font-extrabold leading-[1.08] tracking-[-0.03em] text-white">
        {round.courseName}
      </h2>
      <p className="relative mt-1.5 text-[14px] text-[#CFE3D6] truncate">
        {names.length > 0 ? names.join(' · ') : 'Stroke play'} · {holes} holes
      </p>

      <div className="relative mt-5 grid grid-cols-3 gap-2">
        <HeroTile hot label="Thru" value={thru || '–'} sub={`of ${holes}`} />
        <HeroTile label="Players" value={playerCount ?? '–'} sub={playerCount === 1 ? 'solo' : 'in the group'} />
        {names.length > 0 ? (
          <HeroTile label="Games" value={names.length} sub="on the card" />
        ) : (
          <HeroTile label="Holes" value={holes} sub="stroke play" />
        )}
      </div>

      <div className="relative mt-5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gold transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="inline-flex h-11 items-center gap-1.5 rounded-[14px] bg-white pl-4 pr-3 text-[14px] font-bold text-primary">
          Keep scoring
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </div>
    </motion.div>
  );
}

interface WelcomeHeroProps {
  firstName: string | null;
  totalRounds: number;
}

/** Forest hero when there's no live round: a warm invitation to tee it up. */
export function HomeWelcomeHero({ firstName, totalRounds }: WelcomeHeroProps) {
  const isNew = totalRounds === 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className={heroBase}
    >
      <HeroContours />
      <p className="relative text-[14px] font-medium text-[#CFE3D6]">{greeting(firstName)}</p>
      <h2 className="relative mt-1.5 text-[30px] font-extrabold leading-[1.05] tracking-[-0.035em] text-white">
        {isNew ? (
          <>Your first round<br /><span className="text-gold">starts here.</span></>
        ) : (
          <>Ready for the<br /><span className="text-gold">next one?</span></>
        )}
      </h2>
      <p className="relative mt-2 text-[14px] leading-relaxed text-[#CFE3D6] max-w-[290px]">
        Score the card, run the side games and settle up with your group, all in one place.
      </p>

      <div className="relative mt-5 grid grid-cols-3 gap-2">
        {isNew ? (
          <>
            <FeatureTile hot icon={<Flag className="h-[18px] w-[18px]" />} label="Live scores" />
            <FeatureTile icon={<Coins className="h-[18px] w-[18px]" />} label="Side games" />
            <FeatureTile icon={<Users className="h-[18px] w-[18px]" />} label="Settle up" />
          </>
        ) : (
          <>
            <HeroTile hot label="Rounds" value={totalRounds} sub="played" />
            <FeatureTile icon={<Coins className="h-[18px] w-[18px]" />} label="Side games" />
            <FeatureTile icon={<Users className="h-[18px] w-[18px]" />} label="Settle up" />
          </>
        )}
      </div>
    </motion.div>
  );
}

function FeatureTile({ icon, label, hot }: { icon: React.ReactNode; label: string; hot?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-[18px] p-3 flex flex-col justify-between gap-5 min-h-[92px]',
        hot ? 'bg-gold text-gold-foreground' : 'bg-white/10 text-white'
      )}
    >
      <span className={cn('h-8 w-8 rounded-[10px] flex items-center justify-center', hot ? 'bg-primary/10' : 'bg-white/10')}>
        {icon}
      </span>
      <span className="text-[13px] font-bold leading-tight">{label}</span>
    </div>
  );
}
