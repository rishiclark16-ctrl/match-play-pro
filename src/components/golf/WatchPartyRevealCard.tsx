import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { hapticSuccess } from '@/lib/haptics';

interface WatchPartyRevealCardProps {
  roundId: string;
}

interface WatchPartyStats {
  spectatorCount: number;
  messageCount: number;
  firstMessageBody: string | null;
  firstMessageAuthor: string | null;
}

export function WatchPartyRevealCard({ roundId }: WatchPartyRevealCardProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<WatchPartyStats | null>(null);
  const [showGlow, setShowGlow] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { data, error } = await supabase
        .rpc('get_watch_party_stats', { p_round_id: roundId });

      if (error || !data || !Array.isArray(data) || data.length === 0) return;

      const row = data[0] as any;
      if (Number(row.message_count) === 0) return;

      setStats({
        spectatorCount: Number(row.spectator_count),
        messageCount: Number(row.message_count),
        firstMessageBody: row.first_message_body,
        firstMessageAuthor: row.first_message_author,
      });

      hapticSuccess();
    }

    fetchStats();
  }, [roundId]);

  // Fade glow after 2 seconds
  useEffect(() => {
    if (!stats) return;
    const timer = setTimeout(() => setShowGlow(false), 2000);
    return () => clearTimeout(timer);
  }, [stats]);

  if (!stats) return null;

  const handleTap = () => {
    navigate(`/watch/${roundId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.3 }}
      onClick={handleTap}
      className={`
        mx-4 mt-4 rounded-2xl bg-white p-4 cursor-pointer
        shadow-[0_1px_3px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]
        transition-all duration-500
        ${showGlow ? 'ring-2 ring-amber-400/50 shadow-amber-100/50' : 'ring-0'}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
          <Mic className="w-4 h-4 text-violet-600" />
        </div>
        <span className="text-[15px] font-semibold text-violet-600">Watch Party</span>
      </div>

      {/* Stats */}
      <p className="text-[13px] text-gray-500 mb-3">
        {stats.spectatorCount} {stats.spectatorCount === 1 ? 'friend' : 'friends'} watched &middot; {stats.messageCount} {stats.messageCount === 1 ? 'message' : 'messages'}
      </p>

      {/* Preview quote */}
      {stats.firstMessageBody && (
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3">
          <p className="text-[13px] text-gray-700 italic line-clamp-2">
            "{stats.firstMessageBody}"
          </p>
          {stats.firstMessageAuthor && (
            <p className="text-[11px] text-gray-400 mt-1">
              — {stats.firstMessageAuthor}
            </p>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center justify-center gap-1 text-violet-600">
        <span className="text-[13px] font-semibold">Read the full chat</span>
        <ChevronRight className="w-4 h-4" />
      </div>
    </motion.div>
  );
}
