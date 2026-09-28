import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sendPasswordResetEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validators";

/** 重置令牌有效期（1 小时） */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const forgotSchema = z.object({ email: emailSchema });

/**
 * POST /api/auth/forgot-password —— 发送密码重置邮件
 *
 * 安全约定：无论邮箱是否存在都返回 200 与统一文案，
 * 不向调用方泄露「该邮箱是否注册过」（防账号枚举）。
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = forgotSchema.safeParse(body);

    if (!parsed.success) {
      // 与成功响应同构，不泄露校验细节
      return NextResponse.json({ message: "如果该邮箱已注册，重置链接已发送" });
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    // 只给「设置了密码」的用户发重置邮件；OAuth / 魔法链接用户无需密码
    if (user?.passwordHash) {
      const token = randomBytes(32).toString("hex");
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
      const resetUrl = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      await sendPasswordResetEmail(email, resetUrl);
    } else {
      console.info(`[forgot-password] ${email} 未设置密码，跳过发送`);
    }

    return NextResponse.json({ message: "如果该邮箱已注册，重置链接已发送" });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ message: "如果该邮箱已注册，重置链接已发送" });
  }
}
