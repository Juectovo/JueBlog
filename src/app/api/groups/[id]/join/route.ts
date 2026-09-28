import { forbidden, notFound, ok, requireAuth, serverError, unauthorized, fail } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/groups/[id]/join —— 加入群组（需登录）
 * PUBLIC 群组直接加入（role=MEMBER，memberCount+1）；
 * PRIVATE / INVITE 仅限受邀（本版本邀请流程未开放，统一 403）
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();
    const me = session.user.id;

    const group = await prisma.group.findUnique({
      where: { id: params.id },
      select: { id: true, visibility: true, memberCount: true },
    });
    if (!group) return notFound("群组不存在");

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: me } },
      select: { id: true },
    });
    if (existing) return fail("ALREADY_MEMBER", "你已经是该群组的成员", 409);

    if (group.visibility !== "PUBLIC") {
      return forbidden("该群组仅限受邀加入");
    }

    const [, updated] = await prisma.$transaction([
      prisma.groupMember.create({
        data: { groupId: group.id, userId: me, role: "MEMBER" },
      }),
      prisma.group.update({
        where: { id: group.id },
        data: { memberCount: { increment: 1 } },
        select: { memberCount: true },
      }),
    ]);

    return ok({ joined: true, role: "MEMBER", memberCount: updated.memberCount }, 201);
  } catch (err) {
    return serverError(err, "POST /api/groups/[id]/join");
  }
}
