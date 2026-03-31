import { X, MapPin, Users, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { CommentsSection } from './CommentsSection';
import { useRoundDetailForSheet } from '@/hooks/useRoundDetailForSheet';
import { AvatarStack } from './AvatarStack';

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
        className="[&>button]:hidden rounded-t-3xl p-0 max-h-[90vh] overflow-y-auto"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Round Details
            </p>
            <h2 className="text-[18px] font-black tracking-[-0.03em] text-foreground leading-none mt-0.5">
              {loading ? 'Loading...' : (detail?.courseName ?? creatorName ?? 'Round')}
            </h2>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4 text-foreground" />
          </motion.button>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-4 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : detail ? (
            <>
              {/* Meta info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[13px] font-semibold text-foreground">{detail.courseName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <AvatarStack
                    names={detail.participants.map(p => p.name)}
                    avatarUrls={detail.participants.map(p => p.avatarUrl)}
                    max={5}
                    size="sm"
                  />
                  <span className="text-[12px] text-muted-foreground ml-1">
                    {detail.participants.map(p => p.name.split(' ')[0]).join(', ')}
                  </span>
                </div>
                {detail.completedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[12px] text-muted-foreground">
                      {new Date(detail.completedAt).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Comments */}
              <CommentsSection roundId={detail.id} />
            </>
          ) : (
            <p className="text-[13px] text-muted-foreground text-center py-6">
              Could not load round details.
            </p>
          )}
        </div>

        {/* Safe area bottom padding */}
        <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }} />
      </SheetContent>
    </Sheet>
  );
}
