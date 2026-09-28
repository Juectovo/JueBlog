import { Prisma } from "@prisma/client";

import { postCardInclude, toPostCard } from "@/lib/api/dto";
import { postCreateSchema, postListQuerySchema } from "@/lib/api/schemas";
import {
  ok,
  requireAuth,
  serverError,
  unauthorized,
  zodFail,
  fail,
} from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

/**
 * GET /api/posts —— 文章列表（分页）
 *
 * 查询参数：
 * - page / pageSize：分页（pageSize 最大 50）
 * - mine=1：只看自己的文章（需登录，可叠加 status 筛选，含草稿/私密）
 * - username：按作者筛选（匿名场景强制只返回 PUBLIC）
 * - tag：按标签名筛选
 */
export async function GET(req: Request) {
  try {
    const parsed = postListQuerySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams)
    );
    if (!parsed.success) return zodFail(parsed.error);
    const { page, pageSize, status, tag, username, mine } = parsed.data;

    let where: Prisma.PostWhereInput;

    if (mine === "1") {
      const session = await requireAuth();
      if (!session) return unauthorized();
      where = {
        authorId: session.user.id,
        ...(status ? { status } : {}),
      };
    } else {
      // 匿名 / 公开场景：仅公开文章
      where = {
        status: "PUBLIC",
        ...(username ? { author: { profile: { username } } } : {}),
      };
    }
    if (tag) where.postTags = { some: { tag: { name: tag } } };

    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: mine === "1" ? { updatedAt: "desc" } : { publishedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        ...postCardInclude,
      }),
      prisma.post.count({ where }),
    ]);

    return ok({ items: rows.map(toPostCard), page, pageSize, total });
  } catch (err) {
    return serverError(err, "GET /api/posts");
  }
}

/**
 * POST /api/posts —— 创建文章（需登录）
 *
 * 请求体：{ title, content, status?, slug?, summary?, coverUrl?, tags? }
 * - slug 不传时按标题自动生成（中文标题自动回退为随机 slug），作者维度唯一
 * - status 为 PUBLIC / PRIVATE 时写入 publishedAt
 */
export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();

    const parsed = postCreateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return zodFail(parsed.error);
    const data = parsed.data;

    // slug：用户指定 → 查重；自动生成 → 唯一化
    let slug = data.slug;
    if (slug) {
      const exists = await prisma.post.findFirst({
        where: { authorId: session.user.id, slug },
        select: { id: true },
      });
      if (exists) return fail("CONFLICT", "该 slug 已被你自己的文章使用", 409);
    } else {
      slug = await generateUniqueSlug(data.title, async (s) =>
        Boolean(
          await prisma.post.findFirst({
            where: { authorId: session.user.id, slug: s },
            select: { id: true },
          })
        )
      );
    }

    const post = await prisma.post.create({
      data: {
        authorId: session.user.id,
        title: data.title,
        slug,
        summary: data.summary,
        content: data.content,
        coverUrl: data.coverUrl,
        status: data.status,
        publishedAt: data.status === "DRAFT" ? null : new Date(),
        postTags: {
          create: data.tags.map((name) => ({
            tag: { connectOrCreate: { where: { name }, create: { name } } },
          })),
        },
      },
      ...postCardInclude,
    });

    return ok(toPostCard(post), 201);
  } catch (err) {
    return serverError(err, "POST /api/posts");
  }
}
