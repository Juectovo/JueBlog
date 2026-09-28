import Link from "next/link";
import { notFound } from "next/navigation";
import { Github, Globe, MapPin, Rss } from "lucide-react";

import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { ProfileTabs } from "@/components/ProfileTabs";
import { UserAvatar } from "@/components/UserAvatar";
import { WebringLink } from "@/components/WebringLink";
import { postCardInclude } from "@/lib/api/dto";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * 个人主页 /u/[username]
 * 顶部横幅 + 头像/昵称/简介 + 统计 + 创作热力图 + Tab（文章/好友/群组）+ 博客环
 */
export async function generateMetadata({ params }: { params: { username: string } }) {
  const profile = await prisma.profile.findUnique({
    where: { username: params.username },
    include: { user: { select: { name: true } } },
  });
  if (!profile) return { title: "用户不存在" };

  return {
    title: `${profile.user.name ?? params.username} 的博客`,
    alternates: {
      types: { "application/rss+xml": `/api/feed/${params.username}` },
    },
  };
}

export default async function UserProfilePage({ params }: { params: { username: string } }) {
  const [profile, session] = await Promise.all([
    prisma.profile.findUnique({
      where: { username: params.username },
      include: {
        user: { select: { name: true, image: true, createdAt: true } },
      },
    }),
    getAuthSession(),
  ]);
  if (!profile) notFound();

  const since = new Date(Date.now() - 105 * 24 * 60 * 60 * 1000);

  const [posts, publicPostCount, friendCount, activityRows, groupCount] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: profile.userId, status: "PUBLIC" },
      orderBy: { publishedAt: "desc" },
      take: 10,
      ...postCardInclude,
    }),
    prisma.post.count({ where: { authorId: profile.userId, status: "PUBLIC" } }),
    prisma.friendship.count({
      where: { OR: [{ userAId: profile.userId }, { userBId: profile.userId }] },
    }),
    prisma.post.findMany({
      where: { authorId: profile.userId, status: "PUBLIC", publishedAt: { gte: since } },
      select: { publishedAt: true },
    }),
    prisma.groupMember.count({
      where: { userId: profile.userId, group: { visibility: "PUBLIC" } },
    }),
  ]);

  // 活动热力图数据（与 API 口径一致）
  const countByDate = new Map<string, number>();
  for (const row of activityRows) {
    if (!row.publishedAt) continue;
    const date = row.publishedAt.toISOString().slice(0, 10);
    countByDate.set(date, (countByDate.get(date) ?? 0) + 1);
  }
  const activity = Array.from({ length: 105 }, (_, i) => {
    const date = new Date(Date.now() - (104 - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return { date, count: countByDate.get(date) ?? 0 };
  });

  const displayName = profile.user.name ?? profile.username;
  const isMe = session?.user?.username === profile.username;

  return (
    <div>
      {/* 顶部横幅 */}
      <div className="-mx-6 -mt-10 h-36 rounded-b-none border-b border-border bg-gradient-to-b from-card to-background sm:mx-0 sm:rounded-lg sm:border" />

      <div className="relative -mt-10 px-1 sm:px-6">
        <UserAvatar
          name={displayName}
          image={profile.avatarUrl ?? profile.user.image}
          size="xl"
          className="border-4 border-background"
        />
        <div className="mt-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{displayName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">@{profile.username}.jueblog.com</p>
          {profile.bio && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {profile.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {profile.location}
              </span>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <Globe className="h-3.5 w-3.5" /> {profile.website.replace(/^https?:\/\//, "")}
              </a>
            )}
            {profile.github && (
              <a
                href={profile.github.startsWith("http") ? profile.github : `https://github.com/${profile.github}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" /> GitHub
              </a>
            )}
            <a
              href={`/api/feed/${profile.username}`}
              title="RSS 订阅"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <Rss className="h-3.5 w-3.5" /> RSS
            </a>
            <span>加入于 {profile.user.createdAt.toISOString().slice(0, 10)}</span>
          </div>
        </div>

        {/* 统计 */}
        <div className="mt-6 flex gap-6 text-sm">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{publicPostCount}</span> 文章
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{friendCount}</span> 好友
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{groupCount}</span> 群组
          </span>
          {isMe && (
            <Link href="/settings" className="text-brand transition-opacity hover:opacity-80">
              编辑资料
            </Link>
          )}
        </div>

        {/* 创作活动热力图 */}
        <div className="mt-8">
          <ActivityHeatmap activity={activity} />
        </div>

        {/* 文章 / 好友 / 群组 Tabs */}
        <ProfileTabs
          username={profile.username}
          posts={posts.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            summary: p.summary,
            coverUrl: p.coverUrl,
            status: p.status,
            viewCount: p.viewCount,
            publishedAt: p.publishedAt?.toISOString() ?? null,
            createdAt: p.createdAt.toISOString(),
            author: {
              id: p.author.id,
              name: p.author.name,
              image: p.author.image,
              username: p.author.profile?.username ?? null,
              avatarUrl: p.author.profile?.avatarUrl ?? null,
            },
            tags: p.postTags.map((pt) => pt.tag),
            likeCount: p._count.likes,
            commentCount: p._count.comments,
          }))}
          isMe={isMe}
        />

        {/* 博客环 */}
        <WebringLink username={profile.username} />
      </div>
    </div>
  );
}
