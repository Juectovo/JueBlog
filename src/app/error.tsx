"use client";

/**
 * 路由级错误兜底：渲染异常时显示品牌化错误页，可一键重试
 * （error.tsx 必须是 Client Component）
 */
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 上报到日志（生产环境可接 Sentry 等）
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <AlertTriangle className="h-10 w-10 text-muted-foreground/60" strokeWidth={1.5} />
      <h2 className="mt-6 text-xl font-semibold text-foreground">页面出了一点问题</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        别担心，你的数据是安全的。可以尝试重新加载本页。
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>
          <RotateCw className="mr-2 h-4 w-4" /> 重试
        </Button>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          回首页
        </Link>
      </div>
      {error.digest && (
        <p className="mt-6 font-mono text-[10px] text-muted-foreground/60">
          错误码：{error.digest}
        </p>
      )}
    </div>
  );
}
