import { badRequest, notFound, ok, requireAuth, serverError, unauthorized } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/friends/[id] —— 删除好友（需登录）
 * 路径参数 [id] 为「对方的用户 ID」；
 * Friendship 单行存储，双向查找到后整行删除
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();
    const me = session.user.id;

    if (params.id === me) return badRequest("不能删除自己");

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userAId: me, userBId: params.id },
          { userAId: params.id, userBId: me },
        ],
      },
      select: { id: true },
    });
    if (!friendship) return notFound("好友关系不存在");

    await prisma.friendship.delete({ where: { id: friendship.id } });

    return ok({ friendId: params.id });
  } catch (err) {
    return serverError(err, "DELETE /api/friends/[id]");
  }
}
