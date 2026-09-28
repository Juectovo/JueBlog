import { badRequest, notFound, ok, requireAuth, serverError, unauthorized, zodFail } from "@/lib/api/response";
import { authorCardSelect, toAuthorCard } from "@/lib/api/dto";
import { commentSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/posts/[id]/comment —— 发表评论（需登录）
 * 请求体：{ content, parentId? }
 * - parentId 指向顶层评论时为「回复」，仅支持两层嵌套
 * - 评论他人文章 → POST_COMMENT 通知；回复他人评论 → COMMENT_REPLY 通知
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();
    const me = session.user.id;

    const parsed = commentSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return zodFail(parsed.error);
    const { content, parentId } = parsed.data;

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, authorId: true },
    });
    if (!post || (post.status !== "PUBLIC" && post.authorId !== me)) {
      return notFound("文章不存在");
    }

    // 校验父评论：必须属于同一篇文章、未删除、且本身是顶层评论（两层结构）
    if (parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: parentId, postId: post.id, deletedAt: null },
        select: { id: true, authorId: true, parentId: true },
      });
      if (!parent) return badRequest("回复的评论不存在或已删除");
      if (parent.parentId) return badRequest("仅支持两层评论，请直接回复顶层评论");

      const comment = await prisma.comment.create({
        data: { postId: post.id, authorId: me, content, parentId: parent.id },
        include: { author: { select: authorCardSelect.select } },
      });

      if (parent.authorId !== me) {
        await prisma.notification.create({
          data: {
            userId: parent.authorId,
            actorId: me,
            type: "COMMENT_REPLY",
            postId: post.id,
            commentId: comment.id,
          },
        });
      }

      return ok(
        {
          id: comment.id,
          content: comment.content,
          parentId: comment.parentId,
          createdAt: comment.createdAt.toISOString(),
          author: toAuthorCard(comment.author),
        },
        201
      );
    }

    const comment = await prisma.comment.create({
      data: { postId: post.id, authorId: me, content },
      include: { author: { select: authorCardSelect.select } },
    });

    if (post.authorId !== me) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          actorId: me,
          type: "POST_COMMENT",
          postId: post.id,
          commentId: comment.id,
        },
      });
    }

    return ok(
      {
        id: comment.id,
        content: comment.content,
        parentId: comment.parentId,
        createdAt: comment.createdAt.toISOString(),
        author: toAuthorCard(comment.author),
      },
      201
    );
  } catch (err) {
    return serverError(err, "POST /api/posts/[id]/comment");
  }
}
