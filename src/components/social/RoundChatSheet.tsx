import { useState, useRef, useEffect } from 'react';
import { X, Send, Calendar, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRoundChat } from '@/hooks/useRoundChat';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { UpcomingRound } from '@/hooks/useUpcomingRounds';

interface RoundChatSheetProps {
  round: UpcomingRound | null;
  onClose: () => void;
}

function formatTeeTime(iso: string | null): string {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function RoundChatSheet({ round, onClose }: RoundChatSheetProps) {
  const { user } = useAuth();
  const { messages, loading, submitting, sendMessage, deleteMessage } = useRoundChat(round?.roundId ?? null);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async () => {
    if (!draft.trim() || submitting) return;
    const ok = await sendMessage(draft.trim());
    if (ok) setDraft('');
  };

  return (
    <Sheet open={!!round} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="bottom"
        className="[&>button]:hidden rounded-t-3xl p-0 max-h-[92vh] flex flex-col bg-[#F8F8F6]"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-0 flex-shrink-0">
          <div className="w-9 h-1 bg-foreground/15 rounded-full" />
        </div>

        {/* Dark hero header */}
        <div className="bg-[#0A0A0A] mx-4 mt-3 rounded-2xl p-5 relative overflow-hidden flex-shrink-0">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-white/70" />
          </motion.button>

          {round && (
            <>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40 mb-1">Upcoming Round</p>
              <h2 className="text-[20px] font-black tracking-[-0.03em] text-white leading-tight pr-10 mb-1">
                {round.courseName}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-white/50 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                {formatTeeTime(round.teeTime)}
              </div>

              {/* Players */}
              {round.participantNames.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {round.participantNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white/[0.08] rounded-xl px-2.5 py-1.5">
                      <span className="text-[11px] font-bold text-white/80">
                        {name.split(' ')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Chat messages — scrollable */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-4 min-h-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3">
            Chat {messages.length > 0 && `(${messages.length})`}
          </p>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2.5 bg-muted rounded w-1/3 animate-pulse" />
                    <div className="h-2.5 bg-muted rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-8">
              No messages yet — start the conversation!
            </p>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {messages.map(m => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex gap-2.5 group"
                  >
                    <Avatar className="w-7 h-7 rounded-full flex-shrink-0">
                      <AvatarImage src={m.authorAvatar ?? undefined} />
                      <AvatarFallback className="rounded-full text-[10px] font-bold bg-muted">
                        {m.authorName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[12px] font-bold text-foreground">{m.authorName.split(' ')[0]}</span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(m.createdAt)}</span>
                      </div>
                      <p className="text-[12px] text-foreground/80 mt-0.5 leading-relaxed">{m.body}</p>
                    </div>
                    {m.authorId === user?.id && (
                      <button
                        onClick={() => deleteMessage(m.id)}
                        className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-muted"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Input — fixed at bottom */}
        <div className="px-4 pt-3 flex-shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={e => setDraft(e.target.value.slice(0, 500))}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="Message your group..."
              className="flex-1 bg-muted rounded-xl px-3 py-2.5 text-[13px] outline-none border-0 placeholder:text-muted-foreground/60"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSubmit}
              disabled={!draft.trim() || submitting}
              className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center disabled:opacity-40 flex-shrink-0"
            >
              <Send className="w-4 h-4 text-[#F0EE3A]" />
            </motion.button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
