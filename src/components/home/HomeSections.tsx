import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { staggerItem } from '@/lib/animations';
import { cn } from '@/lib/utils';
import type { Round } from '@/types/golf';
import type { FriendLiveRound } from '@/hooks/useFriendActivity';
import { HomeRoundCard, HomeSectionLabel } from './HomeRoundCard';

/** Three muted-fill stat tiles: active / watching / rounds. */
export function HomeStatsStrip({ active, watching, rounds }: { active: number; watching: number; rounds: number }) {
  const items = [
    { label: 'Active', value: active, live: active > 0 },
    { label: 'Watching', value: watching },
    { label: 'Rounds', value: rounds },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((s) => (
        <div key={s.label} className="rounded-[20px] bg-muted px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground leading-none">
            {s.live && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            {s.label}
          </p>
          <p className="mt-2 text-[26px] font-extrabold leading-none tracking-[-0.04em] text-foreground tabular-nums">
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

interface FriendsPlayingNowProps {
  rounds: FriendLiveRound[];
  onSpectate: (roundId: string) => void;
  onWatchParty: (roundId: string) => void;
}

/** Friends' live rounds you can follow along with. */
export function FriendsPlayingNow({ rounds, onSpectate, onWatchParty }: FriendsPlayingNowProps) {
  if (rounds.length === 0) return null;
  return (
    <section>
      <HomeSectionLabel live count={rounds.length}>Friends playing now</HomeSectionLabel>
      <div className="space-y-2">
        {rounds.map((fr) => (
          <motion.div
            key={fr.roundId}
            whileTap={{ scale: 0.98 }}
            role="button"
            tabIndex={0}
            onClick={() => onSpectate(fr.roundId)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSpectate(fr.roundId); }}
            className="w-full min-h-[68px] rounded-[20px] border border-border bg-card pl-3.5 pr-2 py-2.5 flex items-center gap-3 text-left cursor-pointer select-none"
          >
            <Avatar className="h-11 w-11 rounded-[14px] flex-shrink-0">
              <AvatarImage src={fr.creatorAvatar ?? undefined} className="rounded-[14px]" />
              <AvatarFallback className="rounded-[14px] bg-muted text-[14px] font-bold text-primary">
                {fr.creatorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-foreground truncate">{fr.courseName}</p>
              <p className="text-[13px] text-muted-foreground truncate">
                {fr.playerNames.slice(0, 3).join(', ')}
                {fr.playerNames.length > 3 && ` +${fr.playerNames.length - 3}`}
                {fr.currentHole > 0 && ` · thru ${fr.currentHole}`}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onWatchParty(fr.roundId); }}
              className="flex-shrink-0 h-11 rounded-full bg-muted px-3.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary active:bg-primary active:text-primary-foreground"
            >
              <Eye className="h-4 w-4" />
              Watch party
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

interface RoundListSectionProps {
  title: string;
  live?: boolean;
  rounds: Round[];
  /** Offset for stagger animation so sections cascade. */
  indexOffset?: number;
  onOpen: (round: Round) => void;
  onDelete?: (id: string) => Promise<void>;
  deletingRoundId?: string | null;
  statsFor: (id: string) => { playerCount?: number; currentHole?: number } | undefined;
  showHole?: boolean;
  className?: string;
}

/** A labelled list of HomeRoundCards. Renders nothing when empty. */
export function RoundListSection({
  title,
  live,
  rounds,
  indexOffset = 0,
  onOpen,
  onDelete,
  deletingRoundId,
  statsFor,
  showHole = true,
  className,
}: RoundListSectionProps) {
  if (rounds.length === 0) return null;
  return (
    <section className={cn(className)}>
      <HomeSectionLabel live={live} count={rounds.length}>{title}</HomeSectionLabel>
      <div className="space-y-2">
        {rounds.map((round, i) => {
          const stats = statsFor(round.id);
          return (
            <motion.div key={round.id} variants={staggerItem} initial="initial" animate="animate" custom={i + indexOffset}>
              <HomeRoundCard
                round={round}
                onClick={() => onOpen(round)}
                onDelete={onDelete}
                isDeleting={deletingRoundId === round.id}
                playerCount={stats?.playerCount}
                currentHole={showHole ? stats?.currentHole : undefined}
              />
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
