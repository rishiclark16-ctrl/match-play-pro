import { useNavigate } from 'react-router-dom';
import { Mic } from 'lucide-react';

interface WatchPartyFeedBadgeProps {
  roundId: string;
  messageCount: number;
}

export function WatchPartyFeedBadge({ roundId, messageCount }: WatchPartyFeedBadgeProps) {
  const navigate = useNavigate();

  if (messageCount <= 0) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/watch/${roundId}`);
      }}
      className="flex items-center gap-1.5 mt-1"
    >
      <Mic className="w-3.5 h-3.5 text-violet-600" />
      <span className="text-[12px] font-medium text-violet-600">Watch Party</span>
      <span className="text-[12px] text-gray-400">({messageCount} messages)</span>
    </button>
  );
}
