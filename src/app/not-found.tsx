import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 404 页面：访问不存在的文章 / 用户 / 群组时展示
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <FileQuestion className="h-10 w-10 text-muted-foreground/60" strokeWidth={1.5} />
      <p className="mt-6 text-4xl font-semibold tracking-tight text-foreground">404</p>
      <h2 className="mt-2 text-base font-medium text-foreground">这里什么都没有</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        你访问的页面可能已被删除、设为私密，或者一开始就不存在。
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className={cn(buttonVariants())}>
          回首页
        </Link>
        <Link href="/explore" className={cn(buttonVariants({ variant: "outline" }))}>
          去博客广场逛逛
        </Link>
      </div>
    </div>
  );
}
