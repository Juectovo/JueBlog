import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * JueBlog 纯文字 Logo（占位版）
 * 常态：Jue 白字 + Blog 次要灰；hover：Blog 提亮为品牌紫
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="JueBlog 首页"
      className={cn(
        "group select-none text-lg font-semibold tracking-tight",
        className
      )}
    >
      <span className="text-foreground transition-colors group-hover:text-white">
        Jue
      </span>
      <span className="text-muted-foreground transition-colors group-hover:text-brand">
        Blog
      </span>
    </Link>
  );
}
