import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * 标签小药丸
 * link=true 时可点击跳转博客广场标签页；在文章卡片等 <a> 内部使用时必须传 link=false
 * （HTML 不允许 <a> 嵌套 <a>，否则触发水合错误）
 */
export function TagPill({
  name,
  link = true,
  className,
}: {
  name: string;
  link?: boolean;
  className?: string;
}) {
  const classes = cn(
    "inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors",
    link && "hover:border-brand hover:text-brand",
    className
  );

  if (!link) {
    return <span className={classes}># {name}</span>;
  }

  return (
    <Link href={`/explore?tag=${encodeURIComponent(name)}`} className={classes}>
      # {name}
    </Link>
  );
}
