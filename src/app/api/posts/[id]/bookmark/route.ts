import { notFound, ok, requireAuth, serverError, unauthorized } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/posts/[id]/bookmark —— 收藏 / 取消收藏（切换式，需登录）
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();
    const me = session.user.id;

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, authorId: true },
    });
    if (!post || (post.status !== "PUBLIC" && post.authorId !== me)) {
      return notFound("文章不存在");
    }

    const existing = await prisma.bookmark.findUnique({
      where: { userId_postId: { userId: me, postId: post.id } },
      select: { id: true },
    });

    if (existing) {
      await prisma.bookmark.delete({
        where: { userId_postId: { userId: me, postId: post.id } },
      });
    } else {
      await prisma.bookmark.create({ data: { userId: me, postId: post.id } });
    }

    return ok({ bookmarked: !existing });
  } catch (err) {
    return serverError(err, "POST /api/posts/[id]/bookmark");
  }
}
