import { notFound, ok, serverError } from "@/lib/api/response";
import { postCardInclude, toPostCard } from "@/lib/api/dto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** 活动热力图跨度：15 周 */
const HEATMAP_DAYS = 105;

/**
 * GET /api/users/[username] —— 个人主页聚合数据（公开）
 * 返回资料卡 + 统计（公开文章数 / 好友数）+ 最新公开文章（≤10 篇）
 * + 最近 15 周的创作活动热力图数据
 */
export async function GET(req: Request, { params }: { params: { username: string } }) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { username: params.username },
      include: {
        user: {
          select: {
            name: true,
            image: true,
            _count: { select: { posts: true } },
          },
        },
      },
    });
    if (!profile) return notFound("用户不存在");

    const since = new Date(Date.now() - HEATMAP_DAYS * 24 * 60 * 60 * 1000);

    const [posts, publicPostCount, friendCount, activityRows] = await Promise.all([
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
    ]);

    // 按日聚合 → 固定 105 天序列（老数据补零）
    const countByDate = new Map<string, number>();
    for (const row of activityRows) {
      if (!row.publishedAt) continue;
      const date = row.publishedAt.toISOString().slice(0, 10);
      countByDate.set(date, (countByDate.get(date) ?? 0) + 1);
    }
    const activity = Array.from({ length: HEATMAP_DAYS }, (_, i) => {
      const date = new Date(Date.now() - (HEATMAP_DAYS - 1 - i) * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      return { date, count: countByDate.get(date) ?? 0 };
    });

    return ok({
      username: profile.username,
      name: profile.user.name,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      website: profile.website,
      github: profile.github,
      twitter: profile.twitter,
      location: profile.location,
      stats: { posts: publicPostCount, friends: friendCount },
      activity,
      posts: posts.map(toPostCard),
    });
  } catch (err) {
    return serverError(err, "GET /api/users/[username]");
  }
}
