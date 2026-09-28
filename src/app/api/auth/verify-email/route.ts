import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/verify-email?token=...&email=...
 *
 * 注册邮箱验证激活流程：
 * 1. 校验令牌存在且未过期（VerificationToken 与魔法链接共用一张表，互不冲突）
 * 2. 写入 User.emailVerified
 * 3. 删除令牌（一次性），重定向回登录页提示
 */
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const token = searchParams.get("token");
  const identifier = searchParams.get("email");

  const fail = (reason: "invalid_token" | "token_expired") =>
    NextResponse.redirect(new URL(`/login?error=${reason}`, origin));

  if (!token || !identifier) return fail("invalid_token");

  try {
    const record = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier, token } },
    });

    if (!record) return fail("invalid_token");

    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier, token } },
      });
      return fail("token_expired");
    }

    await prisma.user.update({
      where: { email: identifier },
      data: { emailVerified: new Date() },
    });
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier, token } },
    });

    return NextResponse.redirect(new URL("/login?verified=1", origin));
  } catch (err) {
    // 邮箱对应的用户不存在等数据异常
    console.error("[verify-email]", err);
    return fail("invalid_token");
  }
}
