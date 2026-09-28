import { friendAcceptSchema } from "@/lib/api/schemas";
import { friendCardSelect, toFriendCard } from "@/lib/api/dto";
import {
  badRequest,
  fail,
  forbidden,
  notFound,
  ok,
  requireAuth,
  serverError,
  unauthorized,
  zodFail,
} from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/friends/accept —— 接受好友申请（需登录）
 * 请求体：{ requestId }
 * 事务内：申请置为 ACCEPTED → 写入 Friendship（单行，字典序排序）
 * → 同一对用户间所有 PENDING 申请一并关闭 → 给对方发 FRIEND_ACCEPTED 通知
 */
export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();
    const me = session.user.id;

    const parsed = friendAcceptSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return zodFail(parsed.error);
    const { requestId } = parsed.data;

    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) return notFound("好友申请不存在");
    if (request.addresseeId !== me) return forbidden("只能处理发给自己的申请");
    if (request.status !== "PENDING") return badRequest("该申请已处理过");

    const [a, b] = [request.requesterId, me].sort();
    const already = await prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      select: { id: true },
    });
    if (already) return fail("ALREADY_FRIENDS", "你们已经是好友了", 409);

    const friendship = await prisma.$transaction(async (tx) => {
      // 双向的待处理申请一并关闭（对方可能同时也向我发起了申请）
      await tx.friendRequest.updateMany({
        where: {
          OR: [
            { requesterId: a, addresseeId: b },
            { requesterId: b, addresseeId: a },
          ],
          status: "PENDING",
        },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
      return tx.friendship.create({ data: { userAId: a, userBId: b } });
    });

    await prisma.notification.create({
      data: { userId: request.requesterId, actorId: me, type: "FRIEND_ACCEPTED" },
    });

    const friend = await prisma.user.findUnique({
      where: { id: request.requesterId },
      select: friendCardSelect.select,
    });

    return ok(toFriendCard(friend!, friendship.createdAt), 201);
  } catch (err) {
    return serverError(err, "POST /api/friends/accept");
  }
}
