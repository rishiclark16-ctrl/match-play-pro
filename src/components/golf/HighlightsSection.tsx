import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CollapsibleSection } from './CollapsibleSection';
import { Highlight } from '@/hooks/useRoundHighlights';

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
    <CollapsibleSection
      title="Highlights"
      icon={Flame}
      isOpen={isOpen}
      onToggle={onToggle}
      count={highlights.length}
    >
      {highlights.map((h, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-2.5 p-2.5 rounded-lg border',
            h.type === 'great'
              ? 'bg-success/5 border-success/20'
              : h.type === 'bad'
              ? 'bg-destructive/5 border-destructive/20'
              : 'bg-muted/50 border-border/50'
          )}
        >
          <span className="text-lg">{h.icon}</span>
          <span className="text-sm">{h.text}</span>
        </div>
      ))}
    </CollapsibleSection>
  );
}
