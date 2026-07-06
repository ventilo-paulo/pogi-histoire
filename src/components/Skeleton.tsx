import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} aria-hidden />;
}

/** Skeleton in the shape of an article card used in HScroll rows */
export function ArticleCardSkeleton() {
  return (
    <div className="shrink-0 w-[280px] h-[360px] rounded-[16px] overflow-hidden bg-pogi-dark/5 relative">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <Skeleton className="h-3 w-20 bg-white/30" />
        <Skeleton className="h-5 w-3/4 bg-white/40" />
        <Skeleton className="h-3 w-full bg-white/20" />
      </div>
    </div>
  );
}

export function ArticleCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-full">
          <ArticleCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function ArticleCardSkeletonRow({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}
