import { motion } from 'framer-motion';
import { ChevronRight, Target, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticLight } from '@/lib/haptics';
import { HeroCard } from './setupUi';
import { fdSpring } from './setupStyles';

type RoundMode = 'solo' | 'multi';

interface NewRoundModeStepProps {
  /** Called with the chosen mode after the user taps a card. Page handles step advance. */
  onSelect: (mode: RoundMode) => void;
}

interface ModeOption {
  mode: RoundMode;
  title: string;
  caption: string;
  tags: string[];
  icon: LucideIcon;
  featured?: boolean;
}

const OPTIONS: ModeOption[] = [
  {
    mode: 'multi',
    title: 'With others',
    caption: 'Scoring, betting games, match play',
    tags: ['Nassau', 'Skins', 'Wolf', '+ AI games'],
    icon: Users,
    featured: true,
  },
  {
    mode: 'solo',
    title: 'Solo',
    caption: 'Track just your stats — no bets, no teams',
    tags: [],
    icon: Target,
  },
];

const today = () =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

/**
 * The first step of New Round — "How do you want to play today?".
 * Forest hero headline + two choice rows (With Others = multi, Solo).
 * Triggers `hapticLight()` on tap and calls `onSelect` so the page decides what to do.
 */
export function NewRoundModeStep({ onSelect }: NewRoundModeStepProps) {
  return (
    <motion.div
      key="mode"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={fdSpring}
      className="pt-2"
    >
      <HeroCard
        eyebrow={today()}
        title="How do you want to play today?"
        body="Pick a mode. You can set up the course, players and games next."
      />

      <div className="mt-3.5 space-y-2">
        {OPTIONS.map((opt, i) => {
          const Icon = opt.icon;
          return (
            <motion.button
              key={opt.mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...fdSpring, delay: 0.05 + i * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { hapticLight(); onSelect(opt.mode); }}
              className={cn(
                'w-full bg-card rounded-[20px] border px-4 py-4 flex items-center gap-4 text-left min-h-[88px]',
                opt.featured ? 'border-primary/30' : 'border-border'
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0',
                  opt.featured ? 'bg-primary' : 'bg-muted'
                )}
              >
                <Icon className={cn('w-[22px] h-[22px]', opt.featured ? 'text-gold' : 'text-foreground')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[17px] font-bold tracking-[-0.01em] text-foreground">{opt.title}</p>
                <p className="text-[13px] text-muted-foreground leading-snug mt-0.5">{opt.caption}</p>
                {opt.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {opt.tags.map(tag => (
                      <span key={tag} className="text-[12px] font-semibold text-foreground bg-muted rounded-full px-2.5 py-1">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
