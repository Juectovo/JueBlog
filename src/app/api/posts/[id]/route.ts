import {
  fail,
  forbidden,
  notFound,
  ok,
  requireAuth,
  serverError,
  unauthorized,
  zodFail,
} from "@/lib/api/response";
import {
  commentTreeInclude,
  postCardInclude,
  toCommentTree,
  toPostCard,
} from "@/lib/api/dto";
import { postUpdateSchema } from "@/lib/api/schemas";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/posts/[id] —— 文章详情
 * - DRAFT / PRIVATE 仅作者可见（对外按 404 处理，不泄露存在性）
 * - 非作者访问公开文章时阅读数 +1
 * - 返回两层嵌套评论区 + 当前用户的点赞状态
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    const me = session?.user?.id ?? null;

    const post = await prisma.post.findFirst({
      where: { id: params.id },
      ...postCardInclude,
    });
    if (!post) return notFound("文章不存在");
    const isOwner = me === post.authorId;
    if (post.status !== "PUBLIC" && !isOwner) return notFound("文章不存在");

    const [liked, comments] = await Promise.all([
      me
        ? prisma.like.findUnique({
            where: { userId_postId: { userId: me, postId: post.id } },
            select: { id: true },
          })
        : Promise.resolve(null),
      prisma.comment.findMany({
        where: { postId: post.id, parentId: null, deletedAt: null },
        orderBy: { createdAt: "asc" },
        ...commentTreeInclude,
      }),
    ]);

    // 阅读数：非作者访问公开文章时 +1
    if (post.status === "PUBLIC" && !isOwner) {
      await prisma.post.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return ok({
      ...toPostCard(post),
      content: post.content,
      liked: Boolean(liked),
      comments: comments.map(toCommentTree),
    });
  } catch (err) {
    return serverError(err, "GET /api/posts/[id]");
  }
}

/**
 * PATCH /api/posts/[id] —— 编辑文章（仅作者）
 * 请求体为创建字段的任意子集；标签传入时整体替换；
 * 草稿首次转为 PUBLIC / PRIVATE 时写入 publishedAt
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true, slug: true, publishedAt: true },
    });
    if (!post) return notFound("文章不存在");
    if (post.authorId !== session.user.id) return forbidden("只能编辑自己的文章");

    const parsed = postUpdateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return zodFail(parsed.error);
    const data = parsed.data;

    if (data.slug && data.slug !== post.slug) {
      const exists = await prisma.post.findFirst({
        where: { authorId: post.authorId, slug: data.slug, id: { not: post.id } },
        select: { id: true },
      });
      if (exists) return fail("CONFLICT", "该 slug 已被你的其他文章使用", 409);
    }

    const updated = await prisma.post.update({
      where: { id: post.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.coverUrl !== undefined && { coverUrl: data.coverUrl }),
        ...(data.status !== undefined && {
          status: data.status,
          // 首次发布时间一旦写入不再变更
          ...(post.publishedAt === null && data.status !== "DRAFT"
            ? { publishedAt: new Date() }
            : {}),
        }),
        ...(data.tags !== undefined && {
          postTags: {
            deleteMany: {},
            create: data.tags.map((name) => ({
              tag: { connectOrCreate: { where: { name }, create: { name } } },
            })),
          },
        }),
      },
      ...postCardInclude,
    });

    return ok(toPostCard(updated));
  } catch (err) {
    return serverError(err, "PATCH /api/posts/[id]");
  }
}

/**
 * DELETE /api/posts/[id] —— 删除文章（仅作者）
 * 评论区 / 点赞 / 收藏 / 标签 / 群组分享记录随级联删除
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true },
    });
    if (!post) return notFound("文章不存在");
    if (post.authorId !== session.user.id) return forbidden("只能删除自己的文章");

    await prisma.post.delete({ where: { id: post.id } });

    return ok({ id: post.id });
  } catch (err) {
    return serverError(err, "DELETE /api/posts/[id]");
  }
}
