import { friendCardSelect, toFriendCard } from "@/lib/api/dto";
import { notFound, ok, serverError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/[username]/friends —— 某用户的好友名片列表（公开）
 * 供个人主页「好友」Tab 使用
 */
export async function GET(req: Request, { params }: { params: { username: string } }) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { username: params.username },
      select: { userId: true },
    });
    if (!profile) return notFound("用户不存在");

    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ userAId: profile.userId }, { userBId: profile.userId }] },
      include: {
        userA: { select: friendCardSelect.select },
        userB: { select: friendCardSelect.select },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = friendships.map((f) => {
      const friend = f.userAId === profile.userId ? f.userB : f.userA;
      return toFriendCard(friend, f.createdAt);
    });

    return ok({ items });
  } catch (err) {
    return serverError(err, "GET /api/users/[username]/friends");
  }
}
