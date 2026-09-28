import { Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

/** 页面级加载指示 */
export function Loading({ label = "加载中…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="mt-3 text-xs">{label}</p>
    </div>
  );
}

/** 文章卡片骨架屏 */
export function BlogCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-3 h-5 w-4/5" />
      <Skeleton className="mt-2 h-5 w-3/5" />
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}
