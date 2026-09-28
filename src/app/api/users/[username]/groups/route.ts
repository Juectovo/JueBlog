import type { GroupRole } from "@prisma/client";
import { notFound, ok, serverError } from "@/lib/api/response";
import { toGroupCard } from "@/lib/api/dto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/[username]/groups —— 某用户加入的公开群组（公开）
 * 私密/邀请群组不外显
 */
export async function GET(req: Request, { params }: { params: { username: string } }) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { username: params.username },
      select: { userId: true },
    });
    if (!profile) return notFound("用户不存在");

    const memberships = await prisma.groupMember.findMany({
      where: { userId: profile.userId, group: { visibility: "PUBLIC" } },
      include: { group: true },
      orderBy: { joinedAt: "desc" },
    });

    return ok({
      items: memberships.map((m) => toGroupCard(m.group, m.role as GroupRole)),
    });
  } catch (err) {
    return serverError(err, "GET /api/users/[username]/groups");
  }
}
