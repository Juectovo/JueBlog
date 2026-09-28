import { postListQuerySchema } from "@/lib/api/schemas";
import { postCardInclude, toPostCard } from "@/lib/api/dto";
import { ok, requireAuth, serverError, unauthorized, zodFail } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/friends/feed —— 好友动态流（JueBlog Feed，需登录）
 * 好友 = 与我存在 Friendship 的用户；返回其公开文章，按发布时间倒序，分页
 * 查询参数：page / pageSize
 */
export async function GET(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();
    const me = session.user.id;

    const parsed = postListQuerySchema
      .pick({ page: true, pageSize: true })
      .safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) return zodFail(parsed.error);
    const { page, pageSize } = parsed.data;

    // 双向解出好友 ID 列表
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ userAId: me }, { userBId: me }] },
      select: { userAId: true, userBId: true },
    });
    const friendIds = friendships.map((f) => (f.userAId === me ? f.userBId : f.userAId));

    const where = { authorId: { in: friendIds }, status: "PUBLIC" as const };

    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        ...postCardInclude,
      }),
      prisma.post.count({ where }),
    ]);

    return ok({ items: rows.map(toPostCard), page, pageSize, total });
  } catch (err) {
    return serverError(err, "GET /api/friends/feed");
  }
}
