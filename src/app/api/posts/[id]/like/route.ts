import { notFound, ok, requireAuth, serverError, unauthorized } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/posts/[id]/like —— 点赞 / 取消点赞（切换式，需登录）
 * 返回 { liked, likeCount }；点赞他人文章时产生 POST_LIKE 通知
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
    // 私密 / 草稿文章对外不可见，统一 404
    if (!post || (post.status !== "PUBLIC" && post.authorId !== me)) {
      return notFound("文章不存在");
    }

    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId: me, postId: post.id } },
      select: { id: true },
    });

    if (existing) {
      await prisma.like.delete({
        where: { userId_postId: { userId: me, postId: post.id } },
      });
    } else {
      await prisma.like.create({ data: { userId: me, postId: post.id } });
      if (post.authorId !== me) {
        await prisma.notification.create({
          data: { userId: post.authorId, actorId: me, type: "POST_LIKE", postId: post.id },
        });
      }
    }

    const likeCount = await prisma.like.count({ where: { postId: post.id } });
    return ok({ liked: !existing, likeCount });
  } catch (err) {
    return serverError(err, "POST /api/posts/[id]/like");
  }
}
