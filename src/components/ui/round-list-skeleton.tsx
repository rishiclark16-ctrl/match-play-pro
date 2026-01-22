import { Skeleton } from "@/components/ui/skeleton";
import { TechCard } from "@/components/ui/tech-card";

export function RoundListSkeleton() {
    return (
        <div className="space-y-4">
            {/* Header Skeleton */}
            <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-3 w-24" />
            </div>

            {/* Round Card Skeletons */}
            {[1, 2, 3].map((i) => (
                <TechCard key={i} className="p-4" corners>
                    <div className="flex justify-between items-start mb-4">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-8 w-16 rounded-lg" />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map((j) => (
                                <Skeleton key={j} className="w-8 h-8 rounded-full border-2 border-background" />
                            ))}
                        </div>
                        <Skeleton className="h-8 w-20 ml-auto" />
                    </div>
                </TechCard>
            ))}
        </div>
    );
}
