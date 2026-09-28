import Link from "next/link";
import { Eye, Heart, MessageCircle } from "lucide-react";

import { TagPill } from "@/components/TagPill";
import { UserAvatar } from "@/components/UserAvatar";
import type { PostCard } from "@/types/api";

/**
 * 博客文章卡片（列表/广场/首页通用）
 * hover 时边框发亮 + 轻微上浮（CSS 过渡，克制）
 */
export function BlogCard({ post }: { post: PostCard }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="group flex h-full flex-col rounded-lg border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/40"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <UserAvatar name={post.author.name ?? post.author.username ?? "?"} image={post.author.image} size="sm" />
          <span className="transition-colors group-hover:text-foreground">
            {post.author.name ?? post.author.username}
          </span>
        </span>
        <span>·</span>
        <time>{post.publishedAt ? post.publishedAt.slice(0, 10) : "草稿"}</time>
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-white">
        {post.title}
      </h3>
      {post.summary && (
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {post.summary}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {post.tags.slice(0, 3).map((tag) => (
            <TagPill key={tag.id} name={tag.name} link={false} />
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" /> {post.likeCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" /> {post.commentCount}
          </span>
          <span className="hidden items-center gap-1 sm:inline-flex">
            <Eye className="h-3.5 w-3.5" /> {post.viewCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
