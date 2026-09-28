import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Users } from "lucide-react";

import { GroupWall } from "@/components/GroupWall";
import { UserAvatar } from "@/components/UserAvatar";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = { OWNER: "群主", ADMIN: "管理员", MEMBER: "成员" };

/**
 * 群组详情页 /groups/[id]：群组信息 + 文章墙 + 成员侧栏
 * 非公开群组仅成员可见（404 兜底）
 */
export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const [group, session] = await Promise.all([
    prisma.group.findUnique({ where: { id: params.id } }),
    getAuthSession(),
  ]);
  if (!group) notFound();

  const me = session?.user?.id ?? null;
  const myMembership = me
    ? await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId: me } },
        select: { role: true },
      })
    : null;
  const myRole = myMembership?.role ?? null;
  const isMember = Boolean(myRole);
  if (group.visibility !== "PUBLIC" && !isMember) notFound();

  const [wall, members] = await Promise.all([
    prisma.groupPost.findMany({
      where: { groupId: group.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        post: {
          include: {
            author: { select: { id: true, name: true, image: true, profile: { select: { username: true, avatarUrl: true } } } },
            postTags: { include: { tag: { select: { id: true, name: true } } } },
            _count: { select: { likes: true, comments: true } },
          },
        },
        sharedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.groupMember.findMany({
      where: { groupId: group.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: { select: { username: true, avatarUrl: true } },
          },
        },
      },
    }),
  ]);

  const ROLE_ORDER: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
  const memberItems = members
    .map((m) => ({
      id: m.user.id,
      name: m.user.name ?? m.user.profile?.username ?? "成员",
      username: m.user.profile?.username ?? null,
      image: m.user.image,
      avatarUrl: m.user.profile?.avatarUrl ?? null,
      role: m.role as string,
      joinedAt: m.joinedAt.toISOString(),
    }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);

  const wallItems = wall.map((w) => ({
    id: w.id,
    sharedBy: { id: w.sharedBy.id, name: w.sharedBy.name },
    sharedAt: w.createdAt.toISOString(),
    post: {
      id: w.post.id,
      title: w.post.title,
      slug: w.post.slug,
      summary: w.post.summary,
      coverUrl: w.post.coverUrl,
      status: w.post.status,
      viewCount: w.post.viewCount,
      publishedAt: w.post.publishedAt?.toISOString() ?? null,
      createdAt: w.post.createdAt.toISOString(),
      author: {
        id: w.post.author.id,
        name: w.post.author.name,
        image: w.post.author.image,
        username: w.post.author.profile?.username ?? null,
        avatarUrl: w.post.author.profile?.avatarUrl ?? null,
      },
      tags: w.post.postTags.map((pt) => pt.tag),
      likeCount: w.post._count.likes,
      commentCount: w.post._count.comments,
    },
  }));

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* 主区：群组信息 + 文章墙 */}
      <div className="min-w-0 flex-1">
        <header className="mb-8">
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-foreground">
            {group.name}
            {group.visibility !== "PUBLIC" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-normal text-muted-foreground">
                <Lock className="h-3 w-3" /> 私密
              </span>
            )}
          </h1>
          {group.description && (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {group.description}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {group.memberCount} 位成员 · 创建于 {group.createdAt.toISOString().slice(0, 10)}
            {myRole && ` · 我的角色：${ROLE_LABEL[myRole]}`}
          </p>
        </header>

        <GroupWall groupId={group.id} initialItems={wallItems} canShare={isMember} />
      </div>

      {/* 右侧：成员侧栏 */}
      <aside className="w-full shrink-0 lg:w-64">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Users className="h-3.5 w-3.5" /> 成员 · {memberItems.length}
        </p>
        <div className="space-y-1">
          {memberItems.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-card"
            >
              <UserAvatar name={m.name} image={m.image ?? m.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                {m.username ? (
                  <Link href={`/u/${m.username}`} className="block truncate text-sm text-foreground hover:underline">
                    {m.name}
                  </Link>
                ) : (
                  <p className="truncate text-sm text-foreground">{m.name}</p>
                )}
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground">{ROLE_LABEL[m.role]}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
