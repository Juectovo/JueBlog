import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Eye, PenLine } from "lucide-react";

import { CommentSection } from "@/components/CommentSection";
import { Markdown } from "@/components/Markdown";
import { PostActions } from "@/components/PostActions";
import { TagPill } from "@/components/TagPill";
import { Toc } from "@/components/Toc";
import { UserAvatar } from "@/components/UserAvatar";
import { commentTreeInclude, postCardInclude, toCommentTree, toPostCard } from "@/lib/api/dto";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * 文章详情页：居中阅读区（720px）+ 右侧浮动目录 + 互动按钮 + 评论区
 * DRAFT / PRIVATE 对非作者按 404 处理（与 API 口径一致）
 */
export async function generateMetadata({ params }: { params: { id: string } }) {
  const post = await prisma.post.findUnique({
    where: { id: params.id },
    select: { title: true, summary: true },
  });
  return { title: post?.title ?? "文章不存在" };
}

export default async function PostDetailPage({ params }: { params: { id: string } }) {
  const session = await getAuthSession();
  const me = session?.user?.id ?? null;

  const post = await prisma.post.findFirst({
    where: { id: params.id },
    ...postCardInclude,
  });
  if (!post) notFound();
  const isOwner = me === post.authorId;
  if (post.status !== "PUBLIC" && !isOwner) notFound();

  const data = toPostCard(post);

  const [liked, bookmarked, comments] = await Promise.all([
    me
      ? prisma.like.findUnique({
          where: { userId_postId: { userId: me, postId: post.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    me
      ? prisma.bookmark.findUnique({
          where: { userId_postId: { userId: me, postId: post.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.comment.findMany({
      where: { postId: post.id, parentId: null, deletedAt: null },
      orderBy: { createdAt: "asc" },
      ...commentTreeInclude,
    }),
  ]);

  // 阅读数：非作者访问公开文章时 +1
  if (post.status === "PUBLIC" && !isOwner) {
    await prisma.post.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  const authorName = data.author.name ?? data.author.username ?? "作者";

  return (
    <div className="mx-auto flex max-w-5xl gap-10">
      {/* 阅读区（最大 720px） */}
      <article className="mx-auto w-full max-w-[720px] min-w-0">
        <header>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
            {data.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <Link
              href={`/u/${data.author.username}`}
              className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
            >
              <UserAvatar name={authorName} image={data.author.image} size="sm" />
              {authorName}
            </Link>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {data.publishedAt?.slice(0, 10) ?? "未发布"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {data.viewCount} 阅读
            </span>
            {post.status !== "PUBLIC" && (
              <span className="rounded-full border border-border px-2 py-0.5">
                {post.status === "DRAFT" ? "草稿（仅自己可见）" : "私密（仅自己可见）"}
              </span>
            )}
            {isOwner && (
              <Link
                href={`/write?edit=${post.id}`}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <PenLine className="h-3 w-3" /> 编辑
              </Link>
            )}
          </div>
          {data.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {data.tags.map((tag) => (
                <TagPill key={tag.id} name={tag.name} />
              ))}
            </div>
          )}
        </header>

        <div className="mt-10">
          <Markdown content={post.content} />
        </div>

        <div className="mt-12 flex justify-center border-t border-border pt-10">
          <PostActions
            postId={post.id}
            liked={Boolean(liked)}
            bookmarked={Boolean(bookmarked)}
            likeCount={data.likeCount}
          />
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm">
          <UserAvatar name={authorName} image={data.author.image} size="md" />
          <div className="min-w-0">
            <Link
              href={`/u/${data.author.username}`}
              className="font-medium text-foreground hover:underline"
            >
              {authorName}
            </Link>
            {data.author.username && (
              <p className="text-xs text-muted-foreground">@{data.author.username}.jueblog.com</p>
            )}
          </div>
        </div>

        <CommentSection
          postId={post.id}
          initialComments={comments.map(toCommentTree)}
          meId={me}
          meName={session?.user?.name ?? null}
          meImage={session?.user?.image ?? null}
        />
      </article>

      {/* 浮动目录（xl 屏幕显示） */}
      <Toc content={post.content} />
    </div>
  );
}
