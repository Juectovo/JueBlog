import { friendRequestSchema } from "@/lib/api/schemas";
import { friendCardSelect, toAuthorCard } from "@/lib/api/dto";
import {
  badRequest,
  fail,
  notFound,
  ok,
  requireAuth,
  serverError,
  unauthorized,
  zodFail,
} from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/friends/request —— 发送好友申请（需登录）
 * 请求体：{ username }（按对方博客域名用户名定位）
 * 规则：不能加自己；已是好友 409；有待处理申请（任一方向）409；
 *      被拒过的申请复用原行重新置为 PENDING；产生 FRIEND_REQUEST 通知
 */
export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();
    const me = session.user.id;

    const parsed = friendRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return zodFail(parsed.error);
    const { username } = parsed.data;

    const profile = await prisma.profile.findUnique({
      where: { username },
      select: { userId: true },
    });
    if (!profile) return notFound("用户不存在");
    if (profile.userId === me) return badRequest("不能添加自己为好友");

    // 已是好友（ Friendship 单行存储，userAId 字典序 < userBId）
    const [a, b] = [me, profile.userId].sort();
    const friendship = await prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      select: { id: true },
    });
    if (friendship) return fail("ALREADY_FRIENDS", "你们已经是好友了", 409);

    // 是否已有历史申请（同方向）
    const existing = await prisma.friendRequest.findUnique({
      where: { requesterId_addresseeId: { requesterId: me, addresseeId: profile.userId } },
    });
    if (existing?.status === "PENDING") {
      return fail("REQUEST_PENDING", "已发送过申请，请等待对方处理", 409);
    }

    const request = existing
      ? await prisma.friendRequest.update({
          where: { id: existing.id },
          data: { status: "PENDING", respondedAt: null, createdAt: new Date() },
        })
      : await prisma.friendRequest.create({
          data: { requesterId: me, addresseeId: profile.userId },
        });

    await prisma.notification.create({
      data: { userId: profile.userId, actorId: me, type: "FRIEND_REQUEST" },
    });

    const requester = await prisma.user.findUnique({
      where: { id: me },
      select: friendCardSelect.select,
    });

    return ok(
      {
        id: request.id,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        requester: toAuthorCard(requester!),
      },
      existing ? 200 : 201
    );
  } catch (err) {
    return serverError(err, "POST /api/friends/request");
  }
}
