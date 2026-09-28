import { BlogCardSkeleton } from "@/components/Loading";

/** 文章详情页加载骨架 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[720px]">
      <div className="h-8 w-3/4 animate-pulse rounded bg-card" />
      <div className="mt-5 h-4 w-1/2 animate-pulse rounded bg-card" />
      <div className="mt-12 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded bg-card"
            style={{ width: `${70 + ((i * 13) % 30)}%` }}
          />
        ))}
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <BlogCardSkeleton />
        <BlogCardSkeleton />
      </div>
    </div>
  );
}
