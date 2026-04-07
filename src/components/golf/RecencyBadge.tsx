interface RecencyBadgeProps {
  lastUpdatedAt: Date | null;
}

export function RecencyBadge({ lastUpdatedAt }: RecencyBadgeProps) {
  if (!lastUpdatedAt) return null;

  const now = Date.now();
  const diffMs = now - lastUpdatedAt.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  let text: string;
  if (diffSec < 5) {
    text = 'Just now';
  } else if (diffSec < 60) {
    text = `${diffSec}s ago`;
  } else if (diffMin < 60) {
    text = `${diffMin}m ago`;
  } else {
    text = `${diffHr}h ago`;
  }

  return (
    <span className="text-[11px] text-gray-400 leading-none">{text}</span>
  );
}
