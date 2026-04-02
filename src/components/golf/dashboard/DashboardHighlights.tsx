import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Highlight } from '@/hooks/useRoundHighlights';

interface DashboardHighlightsProps {
  highlights: Highlight[];
}

export function DashboardHighlights({ highlights }: DashboardHighlightsProps) {
  if (highlights.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-muted-foreground text-sm">No notable moments this round.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-3">
        Highlights
      </h3>

      <div className="space-y-2">
        {highlights.map((h, i) => (
          <div
            key={i}
            className={cn(
              'bg-white rounded-2xl border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-4 py-3 flex items-start gap-3',
              h.type === 'great' && 'border-l-4 border-l-emerald-400',
              h.type === 'bad' && 'border-l-4 border-l-red-400',
              h.type === 'neutral' && 'border-l-4 border-l-blue-400'
            )}
          >
            <span className="text-lg flex-shrink-0 mt-0.5">{h.icon}</span>
            <p className="text-[13px] leading-relaxed">{h.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
