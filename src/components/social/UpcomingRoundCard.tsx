import { motion } from 'framer-motion';
import { Calendar, MessageCircle, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { UpcomingRound } from '@/hooks/useUpcomingRounds';

interface UpcomingRoundCardProps {
  round: UpcomingRound;
  onPress: () => void;
  currentUserId?: string;
}

function formatTeeTime(iso: string | null): string {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
}

function teeTimeRelative(iso: string | null): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'Past due';
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'Less than 1 hour';
  if (hrs < 24) return `In ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export function UpcomingRoundCard({ round, onPress, currentUserId }: UpcomingRoundCardProps) {
  const navigate = useNavigate();
  const firstNames = round.participantNames.map(n => n.split(' ')[0]);
  const shownNames = firstNames.slice(0, 5);
  const overflowCount = firstNames.length - shownNames.length;

  const userInvolved = currentUserId
    ? round.participantIds.includes(currentUserId) || round.invitedIds.includes(currentUserId) || round.creatorId === currentUserId
    : false;

  const relative = teeTimeRelative(round.teeTime);
  const d = round.teeTime ? new Date(round.teeTime) : null;

  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onPress}
      className="w-full text-left rounded-[20px] border border-border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        {/* Date block */}
        <div className="flex h-[58px] w-[54px] flex-shrink-0 flex-col items-center justify-center rounded-[14px] bg-primary text-primary-foreground">
          {d ? (
            <>
              <span className="text-[11px] font-semibold leading-none text-[#CFE3D6]">
                {d.toLocaleDateString('en-US', { month: 'short' })}
              </span>
              <span className="mt-1 text-[22px] font-extrabold leading-none tabular-nums">{d.getDate()}</span>
            </>
          ) : (
            <Calendar className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-muted-foreground truncate">{formatTeeTime(round.teeTime)}</span>
            {relative && (
              <span className="flex-shrink-0 rounded-full bg-gold px-2.5 py-[3px] text-[12px] font-semibold text-gold-foreground">
                {relative}
              </span>
            )}
          </div>
          <h3 className="mt-1 text-[17px] font-bold leading-tight tracking-[-0.02em] text-foreground">
            {round.courseName}
          </h3>
        </div>
      </div>

      {/* Player chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {shownNames.map((name, i) => {
          const pid = round.participantIds[i];
          const isClickable = !!pid && pid !== currentUserId;
          const chipClass = cn(
            'rounded-full px-2.5 py-1 text-[12px] font-semibold',
            currentUserId && pid === currentUserId ? 'bg-gold text-gold-foreground' : 'bg-muted text-foreground'
          );

          if (isClickable) {
            return (
              <span
                key={pid}
                role="link"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${pid}`); }}
                className={cn(chipClass, 'active:opacity-70 transition-opacity')}
              >
                {name}
              </span>
            );
          }

          return (
            <span key={pid ?? `name-${i}`} className={chipClass}>
              {name}
            </span>
          );
        })}
        {overflowCount > 0 && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-[12px] font-semibold text-muted-foreground">
            +{overflowCount}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 rounded-full flex-shrink-0">
            <AvatarImage src={round.creatorAvatar ?? undefined} />
            <AvatarFallback className="rounded-full bg-muted text-[10px] font-bold text-primary">
              {round.creatorName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-[13px] text-muted-foreground truncate">
            <span className="font-semibold text-foreground">{round.creatorName.split(' ')[0]}</span>
            {' set it up'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {userInvolved && (
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              You're in
            </span>
          )}
          {round.messageCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[12px] font-semibold text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5" />
              {round.messageCount}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
