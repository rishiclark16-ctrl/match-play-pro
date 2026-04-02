import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { CommentsSection } from './CommentsSection';
import { ScorecardGrid } from './ScorecardGrid';
import { ReactionBar } from './ReactionBar';
import { useRoundDetailForSheet } from '@/hooks/useRoundDetailForSheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatGameType } from '@/lib/formatGameType';

interface RoundDetailSheetProps {
  roundId: string | null;
  creatorName?: string;
  onClose: () => void;
}

export function RoundDetailSheet({ roundId, creatorName, onClose }: RoundDetailSheetProps) {
  const { detail, loading } = useRoundDetailForSheet(roundId);

  return (
    <Sheet open={!!roundId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="bottom"
        className="[&>button]:hidden rounded-t-3xl p-0 max-h-[92vh] overflow-y-auto bg-[#F8F8F6]"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="w-9 h-1 bg-foreground/15 rounded-full" />
        </div>

        {/* Dark hero header */}
        <div className="bg-[#0A0A0A] mx-4 mt-3 rounded-2xl p-5 relative overflow-hidden">
          {/* Close button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-white/70" />
          </motion.button>

          {loading ? (
            <div className="space-y-2">
              <div className="h-5 bg-white/10 rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-white/10 rounded w-1/3 animate-pulse" />
            </div>
          ) : detail ? (
            <>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40 mb-1">Round Recap</p>
              <h2 className="text-[20px] font-black tracking-[-0.03em] text-white leading-tight pr-10 mb-1">
                {detail.courseName}
              </h2>
              {detail.completedAt && (
                <p className="text-[11px] text-white/40 font-medium">
                  {new Date(detail.completedAt).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric',
                  })}
                </p>
              )}

              {/* Players row */}
              {detail.participants.length > 0 && (
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {detail.participants.map((p, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white/[0.08] rounded-xl px-2.5 py-1.5">
                      <Avatar className="w-5 h-5 rounded-full flex-shrink-0">
                        <AvatarImage src={p.avatarUrl ?? undefined} />
                        <AvatarFallback className="rounded-full text-[8px] font-black bg-white/20 text-white">
                          {p.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] font-bold text-white/80">
                        {p.name.split(' ')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Games played */}
              {detail.games.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30 mb-2">Games</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.games.map((g: any, i: number) => (
                      <span key={i} className="text-[11px] font-bold bg-white/[0.08] text-white/70 px-2.5 py-1 rounded-lg">
                        {formatGameType(g.type)}
                        {g.amount ? ` · $${g.amount}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-white/40 text-[13px]">Loading...</p>
          )}
        </div>

        {/* Reactions */}
        {roundId && detail && (
          <div className="px-4 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">Reactions</p>
            <div className="bg-white rounded-2xl p-3">
              <ReactionBar roundId={roundId} />
            </div>
          </div>
        )}

        {/* Scorecard */}
        {detail && detail.scores.length > 0 && (
          <div className="px-4 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">Scorecard</p>
            <div className="bg-white rounded-2xl p-3 overflow-hidden">
              <ScorecardGrid detail={detail} />
            </div>
          </div>
        )}

        {/* Comments section */}
        {detail && (
          <div className="px-4 pt-4 pb-0">
            <CommentsSection roundId={detail.id} />
          </div>
        )}

        <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }} />
      </SheetContent>
    </Sheet>
  );
}
