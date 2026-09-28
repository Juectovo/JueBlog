import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { emailSchema, passwordSchema } from "@/lib/validators";

/** 重置请求体校验：令牌 + 邮箱 + 新密码 */
const resetSchema = z.object({
  token: z.string().min(1, "重置链接无效"),
  email: emailSchema,
  password: passwordSchema,
});

/**
 * POST /api/auth/reset-password —— 使用重置链接设置新密码
 *
 * 由 /reset-password 页面（从邮件链接进入，携带 token & email）调用。
 * 成功后令牌作废，用户使用新密码登录。
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = resetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "重置链接无效或已过期" },
        { status: 400 }
      );
    }

    const { token, email, password } = parsed.data;

    const record = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier: email, token } },
    });

    if (!record) {
      return NextResponse.json({ error: "重置链接无效或已过期" }, { status: 400 });
    }

    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: email, token } },
      });
      return NextResponse.json({ error: "重置链接已过期，请重新申请" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "重置链接无效" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    // 令牌一次性：用完即删
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: email, token } },
    });

    return NextResponse.json({ message: "密码已重置，请使用新密码登录" });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "服务器开小差了，请稍后重试" }, { status: 500 });
  }
}
