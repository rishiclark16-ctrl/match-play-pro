import { motion } from 'framer-motion';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { WatchPartyMessage } from '@/hooks/useWatchPartyChat';

interface WatchPartyChatBubbleProps {
  message: WatchPartyMessage;
  isSelf: boolean;
  showSender: boolean;
  showTimestamp: boolean;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function WatchPartyChatBubble({ message, isSelf, showSender, showTimestamp }: WatchPartyChatBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-2 px-4', isSelf ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      {showSender && !isSelf ? (
        <Avatar className="w-7 h-7 shrink-0 mt-0.5">
          {message.authorAvatar ? (
            <AvatarImage src={message.authorAvatar} alt={message.authorName} />
          ) : null}
          <AvatarFallback className="text-[10px] bg-gray-200 text-gray-600">
            {getInitials(message.authorName)}
          </AvatarFallback>
        </Avatar>
      ) : !isSelf ? (
        <div className="w-7 shrink-0" />
      ) : null}

      <div className={cn('flex flex-col max-w-[75%]', isSelf ? 'items-end' : 'items-start')}>
        {/* Sender name + timestamp */}
        {showSender && (
          <div className={cn('flex items-center gap-2 mb-0.5', isSelf ? 'flex-row-reverse' : 'flex-row')}>
            <span className="text-[11px] font-semibold text-gray-600">
              {message.authorName.split(' ')[0]}
              {message.isPlayer && <span className="ml-1">🏌️</span>}
            </span>
            {showTimestamp && (
              <span className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
            )}
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'px-3.5 py-2 text-[14px] leading-snug',
            isSelf
              ? 'bg-violet-600 text-white rounded-2xl rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
          )}
        >
          {message.body}
        </div>
      </div>
    </motion.div>
  );
}
