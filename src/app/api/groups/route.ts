import { groupListQuerySchema, groupCreateSchema } from "@/lib/api/schemas";
import { toGroupCard } from "@/lib/api/dto";
import {
  fail,
  ok,
  requireAuth,
  serverError,
  unauthorized,
  zodFail,
} from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

/**
 * GET /api/groups —— 群组列表
 * 查询参数 scope：
 * - mine（需登录）：我加入的群组，附我在群内的角色
 * - public（默认）：全部公开群组，按成员数倒序
 */
export async function GET(req: Request) {
  try {
    const parsed = groupListQuerySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams)
    );
    if (!parsed.success) return zodFail(parsed.error);
    const { scope } = parsed.data;

    if (scope === "mine") {
      const session = await requireAuth();
      if (!session) return unauthorized();

      const memberships = await prisma.groupMember.findMany({
        where: { userId: session.user.id },
        include: { group: true },
        orderBy: { joinedAt: "desc" },
      });

      return ok({
        items: memberships.map((m) => toGroupCard(m.group, m.role)),
      });
    }

    const groups = await prisma.group.findMany({
      where: { visibility: "PUBLIC" },
      orderBy: { memberCount: "desc" },
      take: 50,
    });

    return ok({ items: groups.map((g) => toGroupCard(g, null)) });
  } catch (err) {
    return serverError(err, "GET /api/groups");
  }
}

/**
 * POST /api/groups —— 创建群组（需登录）
 * 请求体：{ name, slug?, description?, visibility? }
 * 创建者自动成为 OWNER 成员，memberCount 初始化为 1
 */
export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();

    const parsed = groupCreateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return zodFail(parsed.error);
    const data = parsed.data;

    // slug 全局唯一（URL：/groups/[slug]）
    let slug = data.slug;
    if (slug) {
      const exists = await prisma.group.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (exists) return fail("CONFLICT", "该 slug 已被占用，请换一个", 409);
    } else {
      slug = await generateUniqueSlug(data.name, async (s) =>
        Boolean(await prisma.group.findUnique({ where: { slug: s } }))
      );
    }

    const group = await prisma.group.create({
      data: {
        ownerId: session.user.id,
        name: data.name,
        slug,
        description: data.description,
        visibility: data.visibility,
        members: { create: { userId: session.user.id, role: "OWNER" } },
        memberCount: 1,
      },
    });

    return ok(toGroupCard(group, "OWNER"), 201);
  } catch (err) {
    return serverError(err, "POST /api/groups");
  }
}
