import {
  badRequest,
  fail,
  ok,
  requireAuth,
  serverError,
  unauthorized,
  zodFail,
} from "@/lib/api/response";
import { profileUpdateSchema } from "@/lib/api/schemas";
import { RESERVED_USERNAMES, ensureProfile } from "@/lib/profile";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/users/me —— 更新我的资料（仅本人）
 * 请求体：{ name?, username?, bio?, avatarUrl?, website?, github?, twitter?, location? }
 * - name 存 User，其余存 Profile；空字符串表示清空该字段
 * - username 变更需通过保留字与唯一性校验
 */
export async function PATCH(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();
    const me = session.user.id;

    const parsed = profileUpdateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return zodFail(parsed.error);
    const data = parsed.data;

    await ensureProfile({ userId: me, email: session.user.email, name: session.user.name });

    const current = await prisma.profile.findUniqueOrThrow({
      where: { userId: me },
      select: { username: true },
    });

    // username 变更校验
    if (data.username && data.username !== current.username) {
      if (RESERVED_USERNAMES.includes(data.username)) {
        return badRequest("该用户名为系统保留字");
      }
      const exists = await prisma.profile.findUnique({
        where: { username: data.username },
        select: { id: true },
      });
      if (exists) return fail("CONFLICT", "该用户名已被占用", 409);
    }

    const emptyToNull = (v: string | undefined) =>
      v === undefined ? undefined : v === "" ? null : v;

    // name 在 User 表，其余在 Profile 表，一个事务内更新
    const [updated] = await prisma.$transaction(async (tx) => {
      const user =
        data.name !== undefined
          ? await tx.user.update({
              where: { id: me },
              data: { name: data.name },
              select: { name: true },
            })
          : null;

      const profile = await tx.profile.update({
        where: { userId: me },
        data: {
          ...(data.username !== undefined && { username: data.username }),
          ...(data.bio !== undefined && { bio: data.bio }),
          ...(data.avatarUrl !== undefined && { avatarUrl: emptyToNull(data.avatarUrl) }),
          ...(data.website !== undefined && { website: emptyToNull(data.website) }),
          ...(data.github !== undefined && { github: emptyToNull(data.github) }),
          ...(data.twitter !== undefined && { twitter: emptyToNull(data.twitter) }),
          ...(data.location !== undefined && { location: emptyToNull(data.location) }),
        },
      });

      return [{ ...profile, name: user?.name ?? null }] as const;
    });

    return ok({
      id: updated.id,
      userId: updated.userId,
      username: updated.username,
      name: updated.name,
      bio: updated.bio,
      avatarUrl: updated.avatarUrl,
      website: updated.website,
      github: updated.github,
      twitter: updated.twitter,
      location: updated.location,
    });
  } catch (err) {
    return serverError(err, "PATCH /api/users/me");
  }
}
