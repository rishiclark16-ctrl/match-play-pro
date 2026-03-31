export function RoundListSkeleton() {
  return (
    <div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] mx-6 mb-3 px-4 py-4 flex items-center gap-3"
        >
          {/* Icon ghost */}
          <div className="w-10 h-10 rounded-xl bg-muted/60 animate-pulse flex-shrink-0" />

          {/* Text lines */}
          <div className="flex-1 min-w-0">
            <div className="h-4 w-36 rounded-lg bg-muted/60 animate-pulse mb-2" />
            <div className="h-3 w-24 rounded-lg bg-muted/40 animate-pulse" />
          </div>

          {/* Right score ghost */}
          <div className="h-6 w-12 rounded-lg bg-muted/60 animate-pulse ml-auto" />
        </div>
      ))}
    </div>
  );
}
