import { badRequest, forbidden, notFound, ok, requireAuth, serverError, unauthorized } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/friends/requests/[id] —— 拒绝好友申请（仅接收人）
 * 申请状态置为 DECLINED（保留记录，对方可重新发起）
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();
    const me = session.user.id;

    const request = await prisma.friendRequest.findUnique({
      where: { id: params.id },
      select: { id: true, addresseeId: true, status: true },
    });
    if (!request) return notFound("好友申请不存在");
    if (request.addresseeId !== me) return forbidden("只能处理发给自己的申请");
    if (request.status !== "PENDING") return badRequest("该申请已处理过");

    await prisma.friendRequest.update({
      where: { id: request.id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });

    return ok({ id: request.id });
  } catch (err) {
    return serverError(err, "DELETE /api/friends/requests/[id]");
  }
}
