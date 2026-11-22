import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { HomeRoundCard } from '@/components/home/HomeRoundCard';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useAllRoundsList } from '@/hooks/useAllRoundsList';
import { hapticLight } from '@/lib/haptics';

const spring = { type: 'spring' as const, stiffness: 260, damping: 22 };

export default function RoundsList() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { items, isLoading } = useAllRoundsList();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(({ round }) => {
      if (round.courseName?.toLowerCase().includes(q)) return true;
      if (round.createdAt) {
        const d = round.createdAt;
        const candidates = [
          d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          d.toLocaleDateString('en-US', { month: 'long' }),
          `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`,
          d.getFullYear().toString(),
        ];
        if (candidates.some((c) => c.toLowerCase().includes(q))) return true;
      }
      return false;
    });
  }, [items, query]);

  const handleRoundClick = (roundId: string, status: string) => {
    hapticLight();
    if (status === 'complete') {
      navigate(`/round/${roundId}/complete`);
    } else {
      navigate(`/round/${roundId}`);
    }
  };

  const headerContent = (
    <div className="flex items-center gap-2 px-5 pb-3 pt-safe-content">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          hapticLight();
          navigate(-1);
        }}
        aria-label="Back"
        className="h-11 w-11 -ml-2 rounded-full flex items-center justify-center active:bg-muted"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </motion.button>
      <h1 className="flex-1 text-[28px] font-extrabold tracking-[-0.02em] leading-tight text-foreground">All rounds</h1>
      <span className="h-8 rounded-full bg-muted px-3 inline-flex items-center text-[13px] font-semibold text-foreground tabular-nums">
        {items.length} {items.length === 1 ? 'round' : 'rounds'}
      </span>
    </div>
  );

  return (
    <AppLayout header={headerContent} mainClassName="pb-nav">
      <div className="px-5 pt-1 pb-2 sticky top-0 z-10 bg-background">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            inputMode="search"
            placeholder="Search by course or date"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search rounds"
            className="w-full h-12 pl-11 pr-12 rounded-[20px] bg-card border border-border text-[16px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pt-2">
        {isLoading ? (
          <PageSkeleton variant="default" />
        ) : items.length === 0 ? (
          <EmptyState onCta={() => navigate('/new-round')} />
        ) : filtered.length === 0 ? (
          <NoMatchState query={query} onClear={() => setQuery('')} />
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-2 pb-6">
              {filtered.map(({ round, playerCount, currentHole }, i) => (
                <motion.div
                  key={round.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ ...spring, delay: Math.min(i * 0.02, 0.2) }}
                >
                  <HomeRoundCard
                    round={round}
                    onClick={() => handleRoundClick(round.id, round.status)}
                    playerCount={playerCount}
                    currentHole={currentHole}
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </AppLayout>
  );
}

function EmptyState({ onCta }: { onCta: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="mt-6 bg-card rounded-[20px] border border-border flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <p className="text-[18px] font-bold text-foreground">No rounds yet</p>
      <p className="text-[14px] text-muted-foreground mt-1 mb-5">Your golf history will live here.</p>
      <button
        onClick={onCta}
        className="bg-[#0F1F17] text-white rounded-[14px] h-12 px-6 font-semibold text-[15px]"
      >
        Start a round
      </button>
    </motion.div>
  );
}

function NoMatchState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="mt-8 text-center">
      <p className="text-[14px] text-muted-foreground">
        No rounds match <span className="font-bold text-foreground">"{query}"</span>
      </p>
      <button
        onClick={onClear}
        className="mt-2 h-11 px-4 text-[14px] font-semibold text-[#14532D]"
      >
        Clear search
      </button>
    </div>
  );
}
