import { postCardInclude, toPostCard } from "@/lib/api/dto";
import { ok, serverError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q= —— 全局搜索（Cmd+K）
 * 返回标题/摘要匹配的公开文章 + 用户名/昵称匹配的用户（各最多 5 条）
 */
export async function GET(req: Request) {
  try {
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
    if (!q) return ok({ posts: [], users: [] });

    const [posts, profiles] = await Promise.all([
      prisma.post.findMany({
        where: {
          status: "PUBLIC",
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { summary: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { publishedAt: "desc" },
        take: 5,
        ...postCardInclude,
      }),
      prisma.profile.findMany({
        where: {
          OR: [
            { username: { contains: q.toLowerCase() } },
            { user: { name: { contains: q, mode: "insensitive" } } },
          ],
        },
        take: 5,
        select: {
          bio: true,
          user: { select: { id: true, name: true, image: true, profile: { select: { username: true, avatarUrl: true } } } },
        },
      }),
    ]);

    return ok({
      posts: posts.map(toPostCard),
      users: profiles.map((p) => ({
        ...{
          id: p.user.id,
          name: p.user.name,
          image: p.user.image,
          username: p.user.profile?.username ?? null,
          avatarUrl: p.user.profile?.avatarUrl ?? null,
        },
        bio: p.bio,
      })),
    });
  } catch (err) {
    return serverError(err, "GET /api/search");
  }
}
