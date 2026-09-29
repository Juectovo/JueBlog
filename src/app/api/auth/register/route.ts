import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { sendVerificationEmail, getMailMode } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { generateUsername } from "@/lib/profile";
import { emailSchema, passwordSchema } from "@/lib/validators";

/** 注册请求体校验 */
const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/** 验证链接有效期（24 小时） */
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * POST /api/auth/register —— 邮箱密码注册
 *
 * 流程：校验 → 查重 → 建用户（emailVerified 置空）+ 分配 username
 *      → 生成验证令牌 → 发送验证邮件（Resend）
 * 用户点击验证链接后 emailVerified 写入时间，才能使用密码登录。
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "请求参数不合法" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "该邮箱已被注册，试试直接登录？" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name: email.split("@")[0],
        passwordHash,
        // emailVerified 保持 null，验证邮件点击后写入
      },
    });

    // 分配唯一的博客域名 username（冲突时自动加随机后缀）
    await generateUsernameAndAttach(user.id, email);

    // 生成一次性验证令牌并投递
    const token = randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
      },
    });

    const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
    const verifyUrl = `${origin}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    // 邮件发送失败必须明确告知原因（如 Resend 测试模式限制），不让用户干等一封永远不来的邮件
    try {
      await sendVerificationEmail(email, verifyUrl);
    } catch (mailErr) {
      console.error("[register] 验证邮件发送失败:", mailErr);
      return NextResponse.json(
        {
          error:
            mailErr instanceof Error
              ? `验证邮件发送失败：${mailErr.message}`
              : "验证邮件发送失败，请联系站长或稍后重试",
        },
        { status: 502 }
      );
    }

    // 开发模式（未配置 SMTP/Resend）：验证链接直接返回给前端，本地也能走通全流程
    const devVerifyUrl =
      getMailMode() === "console" && process.env.NODE_ENV !== "production" ? verifyUrl : undefined;

    return NextResponse.json(
      {
        message: "注册成功，验证邮件已发送，请查收",
        ...(devVerifyUrl ? { devVerifyUrl } : {}),
      },
      { status: 201 }
    );
  } catch (err) {
    // 并发注册同一邮箱：唯一约束兜底
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "该邮箱已被注册，试试直接登录？" }, { status: 409 });
    }

    console.error("[register]", err);
    return NextResponse.json({ error: "服务器开小差了，请稍后重试" }, { status: 500 });
  }
}

/** 创建用户后分配 username；极端并发冲突时重试数次 */
async function generateUsernameAndAttach(userId: string, email: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const username = await generateUsername(email.split("@")[0]);
      await prisma.profile.create({ data: { userId, username } });
      return;
    } catch (err) {
      const isUsernameConflict =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUsernameConflict || attempt === 2) throw err;
    }
  }
}
