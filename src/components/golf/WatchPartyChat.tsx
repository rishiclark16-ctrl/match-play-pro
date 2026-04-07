import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SendHorizonal, ChevronDown } from 'lucide-react';
import { WatchPartyChatBubble } from './WatchPartyChatBubble';
import { WatchPartyEmptyState } from './WatchPartyEmptyState';
import { WatchPartyMessage } from '@/hooks/useWatchPartyChat';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';

interface WatchPartyChatProps {
  messages: WatchPartyMessage[];
  currentUserId: string;
  isRoundComplete: boolean;
  submitting: boolean;
  onSend: (body: string, isRoundComplete: boolean) => Promise<boolean>;
}

const TIME_GROUP_GAP_MS = 5 * 60 * 1000; // 5 minutes

export function WatchPartyChat({ messages, currentUserId, isRoundComplete, submitting, onSend }: WatchPartyChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevCountRef = useRef(messages.length);

  // Auto-scroll to bottom on new messages (if already at bottom)
  useEffect(() => {
    if (messages.length > prevCountRef.current && !isAtBottom) {
      setUnreadCount(prev => prev + (messages.length - prevCountRef.current));
    }
    prevCountRef.current = messages.length;

    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isAtBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' as any });
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 60;
    setIsAtBottom(atBottom);
    if (atBottom) setUnreadCount(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadCount(0);
  }, []);

  const handleSend = async () => {
    const body = input.trim();
    if (!body || submitting) return;
    setInput('');
    hapticLight();
    await onSend(body, isRoundComplete);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Find the divider point between during-round and post-reveal messages
  const revealDividerIndex = messages.findIndex(m => m.isPostReveal);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-3 space-y-1.5"
      >
        {messages.length === 0 && !isRoundComplete && <WatchPartyEmptyState />}

        {messages.map((msg, i) => {
          const prev = i > 0 ? messages[i - 1] : null;
          const showSender = !prev || prev.authorId !== msg.authorId;
          const showTimestamp = !prev ||
            new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > TIME_GROUP_GAP_MS;

          // Insert "During the round" / "After the round" dividers
          const showRevealDivider = revealDividerIndex === i && i > 0;

          return (
            <div key={msg.id}>
              {/* During-round divider at the very top if we have post-reveal messages */}
              {i === 0 && revealDividerIndex > 0 && (
                <div className="flex items-center gap-3 px-6 py-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">During the round</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}

              {showRevealDivider && (
                <div className="flex items-center gap-3 px-6 py-3 my-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">After the round</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}

              {showTimestamp && showSender && i > 0 && !showRevealDivider && (
                <div className="h-2" />
              )}

              <WatchPartyChatBubble
                message={msg}
                isSelf={msg.authorId === currentUserId}
                showSender={showSender || showTimestamp}
                showTimestamp={showTimestamp}
              />
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom FAB */}
      <AnimatePresence>
        {!isAtBottom && unreadCount > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToBottom}
            className="absolute bottom-20 right-4 bg-violet-600 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-lg z-10"
          >
            <ChevronDown className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="border-t border-gray-100 px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] bg-white flex items-end gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value.slice(0, 500))}
          onKeyDown={handleKeyDown}
          placeholder="Say something..."
          className={cn(
            'flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-[14px] outline-none',
            'border border-transparent focus:border-violet-300 transition-colors',
            input.length >= 500 && 'border-red-300'
          )}
          disabled={submitting}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || submitting}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors',
            input.trim()
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-300'
          )}
          aria-label="Send message"
        >
          <SendHorizonal className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  );
}
