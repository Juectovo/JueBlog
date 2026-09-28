import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BlogCard } from "@/components/BlogCard";
import { EmptyState } from "@/components/EmptyState";
import { FadeIn } from "@/components/FadeIn";
import { RandomButton } from "@/components/RandomButton";
import { buttonVariants } from "@/components/ui/button";
import { postCardInclude, toPostCard } from "@/lib/api/dto";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * 首页：Hero + 精选文章卡片网格 + 随机逛逛
 */
export default async function HomePage() {
  const featured = await prisma.post.findMany({
    where: { status: "PUBLIC" },
    orderBy: { publishedAt: "desc" },
    take: 6,
    ...postCardInclude,
  });

  return (
    <div>
      {/* Hero 区 */}
      <section className="flex flex-col items-center py-20 text-center sm:py-28">
        <h1 className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
          JueBlog
        </h1>
        <p className="mt-6 text-base text-muted-foreground sm:text-lg">
          Write. Connect. Belong.
        </p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          每个人都有自己的黑色小站，好友互访、成圈交流，让文章在朋友之间流动起来。
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/explore"
            className={cn(buttonVariants({ size: "lg" }), "group px-8")}
          >
            进入博客广场
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <RandomButton />
        </div>
      </section>

      {/* 精选文章 */}
      <section className="mt-8">
        <FadeIn>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">最新文章</h2>
            <Link
              href="/explore"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              查看全部 →
            </Link>
          </div>
        </FadeIn>

        {featured.length === 0 ? (
          <EmptyState
            title="还没有公开文章"
            description="成为第一个在 JueBlog 发布文章的人。"
            action={{ label: "去写第一篇", href: "/explore" }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((post, i) => (
              <FadeIn key={post.id} delay={i * 0.05}>
                <BlogCard post={toPostCard(post)} />
              </FadeIn>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
