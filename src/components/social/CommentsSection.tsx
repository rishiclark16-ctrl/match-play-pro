import { useState, useRef } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRoundComments } from '@/hooks/useRoundComments';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface CommentsSectionProps {
  roundId: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function CommentsSection({ roundId }: CommentsSectionProps) {
  const { user } = useAuth();
  const { comments, loading, submitting, addComment, deleteComment } = useRoundComments(roundId);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!draft.trim() || submitting) return;
    const ok = await addComment(draft.trim());
    if (ok) setDraft('');
  };

  return (
    <div className="mt-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3">
        Comments {comments.length > 0 && `(${comments.length})`}
      </p>

      {/* Comment list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => (
            <div key={i} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-muted animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-2.5 bg-muted rounded w-1/3 animate-pulse" />
                <div className="h-2.5 bg-muted rounded w-2/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {comments.map(c => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex gap-2.5 group"
              >
                <Avatar className="w-7 h-7 rounded-full flex-shrink-0">
                  <AvatarImage src={c.authorAvatar ?? undefined} />
                  <AvatarFallback className="rounded-full text-[10px] font-bold bg-muted">
                    {c.authorName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[12px] font-bold text-foreground">{c.authorName}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-[12px] text-foreground/80 mt-0.5 leading-relaxed">{c.body}</p>
                </div>
                {c.authorId === user?.id && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-muted"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {comments.length === 0 && (
            <p className="text-[12px] text-muted-foreground text-center py-3">
              No comments yet — be first!
            </p>
          )}
        </div>
      )}

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value.slice(0, 500))}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="Add a comment..."
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
  );
}
