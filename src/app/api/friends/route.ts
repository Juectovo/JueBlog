import { friendCardSelect, toFriendCard } from "@/lib/api/dto";
import { ok, requireAuth, serverError, unauthorized } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/friends —— 我的好友列表（需登录）
 * 返回 FriendCard[]（含 username / 头像 / 简介 / 成为好友时间）
 */
export async function GET(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();
    const me = session.user.id;

    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ userAId: me }, { userBId: me }] },
      include: {
        userA: { select: friendCardSelect.select },
        userB: { select: friendCardSelect.select },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = friendships.map((f) => {
      const friend = f.userAId === me ? f.userB : f.userA;
      return toFriendCard(friend, f.createdAt);
    });

    return ok({ items });
  } catch (err) {
    return serverError(err, "GET /api/friends");
  }
}
