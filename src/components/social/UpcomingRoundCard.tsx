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

  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onPress}
      className="w-full text-left bg-white rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] border-l-[3px] border-l-emerald-500"
    >
      <div className="p-4">
        {/* Tee time — hero element */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-[15px] font-black tracking-[-0.02em] text-foreground">
              {formatTeeTime(round.teeTime)}
            </span>
          </div>
          {relative && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md flex-shrink-0">
              {relative}
            </span>
          )}
        </div>

        {/* Course name */}
        <h3 className="text-[17px] font-black tracking-[-0.03em] text-foreground leading-tight mb-3 ml-6">
          {round.courseName}
        </h3>

        {/* Player chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {shownNames.map((name, i) => {
            const pid = round.participantIds[i];
            const isClickable = !!pid && pid !== currentUserId;
            const chipClass = cn(
              'text-[11px] font-bold border px-2.5 py-1 rounded-lg',
              currentUserId && pid === currentUserId
                ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground'
                : 'bg-[#F8F8F6] border-border/60 text-foreground'
            );

            if (isClickable) {
              return (
                <button
                  key={pid}
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${pid}`); }}
                  className={cn(chipClass, 'active:opacity-70 transition-opacity')}
                >
                  {name}
                </button>
              );
            }

            return (
              <span key={pid ?? `name-${i}`} className={chipClass}>
                {name}
              </span>
            );
          })}
          {overflowCount > 0 && (
            <span className="text-[11px] font-bold bg-muted text-muted-foreground px-2.5 py-1 rounded-lg">
              +{overflowCount}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/40">
          <div className="flex items-center gap-2">
            <Avatar className="w-5 h-5 rounded-full flex-shrink-0">
              <AvatarImage src={round.creatorAvatar ?? undefined} />
              <AvatarFallback className="rounded-full text-[8px] font-black bg-muted">
                {round.creatorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground">{round.creatorName.split(' ')[0]}</span>
              {' created'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {userInvolved && (
              <div className="flex items-center gap-1 text-emerald-600">
                <Check className="w-3 h-3" />
                <span className="text-[10px] font-bold">You're in</span>
              </div>
            )}
            {round.messageCount > 0 && (
              <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
                <MessageCircle className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-black text-muted-foreground">{round.messageCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
