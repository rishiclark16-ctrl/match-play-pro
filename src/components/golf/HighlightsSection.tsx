import { cn } from '@/lib/utils';
import { Highlight } from '@/hooks/useRoundHighlights';
import { CollapsibleResults, Pill, ResultsCard } from './results/resultsUi';

interface HighlightsSectionProps {
  highlights: Highlight[];
  isOpen: boolean;
  onToggle: () => void;
}

export function HighlightsSection({
  highlights,
  isOpen,
  onToggle,
}: HighlightsSectionProps) {
  if (highlights.length === 0) return null;

  return (
    <CollapsibleResults
      title="Highlights"
      isOpen={isOpen}
      onToggle={onToggle}
      summary={<Pill>{highlights.length}</Pill>}
    >
      <ResultsCard>
        {highlights.map((h, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 min-h-[52px] border-b border-border last:border-b-0"
          >
            <span
              className={cn(
                'w-9 h-9 flex items-center justify-center shrink-0 text-[17px]',
                h.type === 'great'
                  ? 'rounded-full bg-[#ECFCCB] border-2 border-[#14532D]'
                  : h.type === 'bad'
                  ? 'rounded-[10px] border-2 border-foreground bg-card'
                  : 'rounded-full bg-muted',
              )}
              aria-hidden
            >
              {h.icon}
            </span>
            <span className="text-[14px] text-foreground leading-snug">{h.text}</span>
          </div>
        ))}
      </ResultsCard>
    </CollapsibleResults>
  );
}
