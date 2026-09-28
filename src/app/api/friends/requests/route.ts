import { friendCardSelect, toFriendCard } from "@/lib/api/dto";
import { ok, requireAuth, serverError, unauthorized } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/friends/requests —— 我收到的好友申请（待处理，需登录）
 */
export async function GET(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();

    const requests = await prisma.friendRequest.findMany({
      where: { addresseeId: session.user.id, status: "PENDING" },
      include: { requester: { select: friendCardSelect.select } },
      orderBy: { createdAt: "desc" },
    });

    return ok({
      items: requests.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        requester: toFriendCard(r.requester, r.createdAt),
      })),
    });
  } catch (err) {
    return serverError(err, "GET /api/friends/requests");
  }
}
