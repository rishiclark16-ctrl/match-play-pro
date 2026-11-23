import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hapticLight } from '@/lib/haptics';
import { cn } from '@/lib/utils';

function greeting(firstName: string | null): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return firstName ? `${part}, ${firstName}` : part;
}

/**
 * The front door of the app (3.1): say the round and play.
 * `compact` sits under a live round's hero; the full card is the hero otherwise.
 */
export function HomeComposer({ firstName, compact = false }: { firstName: string | null; compact?: boolean }) {
  const navigate = useNavigate();
  const open = (mic: boolean) => {
    hapticLight();
    navigate('/play', mic ? { state: { mic: true } } : undefined);
  };

  if (compact) {
    return (
      <div className="w-full rounded-[20px] bg-card border border-border p-2 pl-4 flex items-center gap-3">
        <button onClick={() => open(false)} className="flex-1 min-w-0 text-left min-h-[48px]">
          <span className="block text-[15px] font-semibold text-foreground">New round</span>
          <span className="block text-[13px] text-muted-foreground truncate">Say the course, players and game</span>
        </button>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => open(true)} aria-label="Set up a round by voice"
          className="h-12 w-12 rounded-[16px] bg-gold text-gold-foreground flex items-center justify-center">
          <Mic className="h-5 w-5" strokeWidth={2.5} />
        </motion.button>
      </div>
    );
  }

  return (
    <section className="relative w-full overflow-hidden rounded-[28px] bg-primary text-primary-foreground p-5">
      <p className="text-[13px] font-semibold text-on-forest-muted">{greeting(firstName)}</p>
      <h2 className="mt-1.5 text-[32px] font-extrabold leading-[1.02] tracking-[-0.04em]">
        What are we<br />playing today?
      </h2>
      <p className="mt-2 text-[14px] leading-snug text-on-forest-muted">
        Say the course, who's in and the game. MATCH builds the card and you tee off.
      </p>
      <div className="mt-5 flex items-center gap-2.5">
        <button
          onClick={() => open(false)}
          className="flex-1 min-w-0 h-14 rounded-[18px] bg-white/10 px-4 text-left text-[15px] text-on-forest-muted truncate"
        >
          “Sonoma from the blues with Jack…”
        </button>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => open(true)}
          aria-label="Set up a round by voice"
          className={cn('h-14 w-14 flex-shrink-0 rounded-[18px] bg-gold text-gold-foreground flex items-center justify-center')}
        >
          <Mic className="h-6 w-6" strokeWidth={2.5} />
        </motion.button>
      </div>
      <button onClick={() => { hapticLight(); navigate('/new-round'); }} className="mt-3 h-9 text-[13px] font-semibold text-on-forest-muted underline-offset-4 hover:underline">
        or set up by hand
      </button>
    </section>
  );
}
