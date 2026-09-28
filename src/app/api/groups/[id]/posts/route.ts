import { postCardInclude, toPostCard } from "@/lib/api/dto";
import {
  forbidden,
  notFound,
  ok,
  requireAuth,
  serverError,
  unauthorized,
  zodFail,
} from "@/lib/api/response";
import { postListQuerySchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/groups/[id]/posts —— 群组文章墙（分页）
 * PUBLIC 群组任何人可看；PRIVATE / INVITE 仅成员可见（403）
 * 按分享时间倒序，条目含文章卡片 + 分享人
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const parsed = postListQuerySchema
      .pick({ page: true, pageSize: true })
      .safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) return zodFail(parsed.error);
    const { page, pageSize } = parsed.data;

    const group = await prisma.group.findUnique({
      where: { id: params.id },
      select: { id: true, visibility: true },
    });
    if (!group) return notFound("群组不存在");

    // 非公开群组校验成员身份
    if (group.visibility !== "PUBLIC") {
      const session = await requireAuth();
      if (!session) return unauthorized();
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
        select: { id: true },
      });
      if (!member) return forbidden("仅群组成员可见");
    }

    const where = { groupId: group.id };
    const [rows, total] = await Promise.all([
      prisma.groupPost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          post: postCardInclude,
          sharedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.groupPost.count({ where }),
    ]);

    return ok({
      items: rows.map((r) => ({
        id: r.id,
        sharedBy: { id: r.sharedBy.id, name: r.sharedBy.name },
        sharedAt: r.createdAt.toISOString(),
        post: toPostCard(r.post),
      })),
      page,
      pageSize,
      total,
    });
  } catch (err) {
    return serverError(err, "GET /api/groups/[id]/posts");
  }
}
