import { fail, forbidden, notFound, ok, requireAuth, serverError, unauthorized, zodFail } from "@/lib/api/response";
import { postCardInclude, toPostCard } from "@/lib/api/dto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const shareSchema = z.object({ postId: z.string().min(1, "缺少 postId") });

/**
 * POST /api/groups/[id]/share —— 分享文章到群组文章墙（仅成员）
 * 请求体：{ postId }；仅 PUBLIC 文章可分享；同一文章同一群组仅一次
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();
    const me = session.user.id;

    const parsed = shareSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return zodFail(parsed.error);

    const group = await prisma.group.findUnique({
      where: { id: params.id },
      select: { id: true, visibility: true },
    });
    if (!group) return notFound("群组不存在");

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: me } },
      select: { id: true },
    });
    if (!membership) return forbidden("仅群组成员可以分享文章");

    const post = await prisma.post.findFirst({
      where: { id: parsed.data.postId, status: "PUBLIC" },
      ...postCardInclude,
    });
    if (!post) return notFound("文章不存在或不是公开文章");

    const exists = await prisma.groupPost.findUnique({
      where: { groupId_postId: { groupId: group.id, postId: post.id } },
      select: { id: true },
    });
    if (exists) return fail("ALREADY_SHARED", "这篇文章已经在群组的墙上啦", 409);

    const groupPost = await prisma.groupPost.create({
      data: { groupId: group.id, postId: post.id, sharedById: me },
    });

    return ok(
      {
        id: groupPost.id,
        sharedBy: { id: me, name: session.user.name ?? null },
        sharedAt: groupPost.createdAt.toISOString(),
        post: toPostCard(post),
      },
      201
    );
  } catch (err) {
    return serverError(err, "POST /api/groups/[id]/share");
  }
}
