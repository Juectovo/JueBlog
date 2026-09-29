import bcrypt from "bcryptjs";
import { z } from "zod";
import { NextResponse } from "next/server";

import { badRequest, ok, requireAuth, serverError, unauthorized, zodFail } from "@/lib/api/response";
import { passwordSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: passwordSchema,
});

/**
 * POST /api/auth/change-password —— 设置 / 修改密码（需登录）
 * - 已设密码的用户：必须提供正确的 currentPassword 才能修改
 * - 从未设过密码的用户（GitHub / 魔法链接注册）：可直接设置
 */
export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) return unauthorized();
    const me = session.user.id;

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return zodFail(parsed.error);
    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: me },
      select: { passwordHash: true },
    });
    if (!user) return badRequest("用户不存在");

    if (user.passwordHash) {
      if (!currentPassword) return badRequest("请输入当前密码");
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return badRequest("当前密码不正确");
    }

    const hadPassword = Boolean(user.passwordHash);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: me }, data: { passwordHash } });

    return ok({ message: hadPassword ? "密码已修改" : "密码已设置，之后可以用邮箱 + 密码登录" });
  } catch (err) {
    return serverError(err, "POST /api/auth/change-password");
  }
}
