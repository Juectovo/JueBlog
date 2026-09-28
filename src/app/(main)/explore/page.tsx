import Link from "next/link";

import { BlogCard } from "@/components/BlogCard";
import { EmptyState } from "@/components/EmptyState";
import { FadeIn } from "@/components/FadeIn";
import { buttonVariants } from "@/components/ui/button";
import { postCardInclude, toPostCard } from "@/lib/api/dto";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

/**
 * 博客广场：全部公开文章（分页 + 标签筛选）
 */
export default async function ExplorePage({
  searchParams,
}: {
  searchParams: { page?: string; tag?: string };
}) {
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const tag = searchParams.tag?.trim();

  const where = {
    status: "PUBLIC" as const,
    ...(tag ? { postTags: { some: { tag: { name: tag } } } } : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      ...postCardInclude,
    }),
    prisma.post.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) =>
    `/explore?page=${p}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">博客广场</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tag ? `#${tag} 下的公开文章` : "全站公开文章时间线"} · 共 {total} 篇
        </p>
        {tag && (
          <Link href="/explore" className="mt-2 inline-block text-xs text-brand hover:underline">
            清除标签筛选
          </Link>
        )}
      </div>

      {posts.length === 0 ? (
        <EmptyState
          title={tag ? "这个标签下还没有文章" : "广场还很安静"}
          description="公开文章会自动出现在这里。"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <FadeIn key={post.id} delay={Math.min(i, 8) * 0.04}>
              <BlogCard post={toPostCard(post)} />
            </FadeIn>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link
              href={pageHref(page - 1)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              上一页
            </Link>
          )}
          <span className="text-xs text-muted-foreground">
            第 {page} / {totalPages} 页
          </span>
          {page < totalPages && (
            <Link
              href={pageHref(page + 1)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              下一页
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
