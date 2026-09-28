import type { GroupRole } from "@prisma/client";
import { friendCardSelect } from "@/lib/api/dto";
import { getAuthSession } from "@/lib/auth";
import { notFound, ok, serverError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ROLE_ORDER: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };

/**
 * GET /api/groups/[id] —— 群组详情（含成员名单与我的角色）
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const group = await prisma.group.findUnique({
      where: { id: params.id },
    });
    if (!group) return notFound("群组不存在");

    const session = await getAuthSession();
    const me = session?.user?.id ?? null;

    // 非公开群组仅成员可看
    let myRole: GroupRole | null = null;
    if (me) {
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId: me } },
        select: { role: true },
      });
      myRole = membership?.role ?? null;
    }
    if (group.visibility !== "PUBLIC" && !myRole) return notFound("群组不存在");

    const members = await prisma.groupMember.findMany({
      where: { groupId: group.id },
      include: { user: { select: friendCardSelect.select } },
    });

    return ok({
      ...{
        id: group.id,
        name: group.name,
        slug: group.slug,
        description: group.description,
        coverUrl: group.coverUrl,
        visibility: group.visibility,
        memberCount: group.memberCount,
        role: myRole,
        createdAt: group.createdAt.toISOString(),
      },
      members: members
        .map((m) => ({
          id: m.user.id,
          name: m.user.name,
          username: m.user.profile?.username ?? null,
          avatarUrl: m.user.profile?.avatarUrl ?? null,
          role: m.role as GroupRole,
          joinedAt: m.joinedAt.toISOString(),
        }))
        .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]),
      myRole,
    });
  } catch (err) {
    return serverError(err, "GET /api/groups/[id]");
  }
}
