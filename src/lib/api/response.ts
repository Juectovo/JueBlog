import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";

/**
 * API 统一响应封装与错误处理
 *
 * 所有 Route Handlers 返回统一信封：
 *   成功：{ success: true, data: T }
 *   失败：{ success: false, error: { code, message } }
 */

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = {
  success: false;
  error: { code: string; message: string };
};

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

// ---------- 常用错误快捷函数 ----------

export const badRequest = (message: string) => fail("VALIDATION_ERROR", message, 400);

export const unauthorized = () => fail("UNAUTHORIZED", "请先登录", 401);

export const forbidden = (message = "没有权限执行此操作") => fail("FORBIDDEN", message, 403);

export const notFound = (message = "资源不存在") => fail("NOT_FOUND", message, 404);

/** zod 校验失败：取第一条 issue 的文案返回 */
export function zodFail(error: z.ZodError) {
  return badRequest(error.issues[0]?.message ?? "请求参数不合法");
}

/** 兜底错误：记录日志、识别 Prisma 唯一约束冲突，其余统一 500 */
export function serverError(err: unknown, scope: string) {
  console.error(`[${scope}]`, err);

  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  ) {
    return fail("CONFLICT", "数据已存在，请勿重复操作", 409);
  }

  return fail("INTERNAL_ERROR", "服务器开小差了，请稍后重试", 500);
}

/**
 * 统一鉴权：未登录返回 null，调用方直接 `if (!session) return unauthorized();`
 */
export async function requireAuth() {
  const session = await getAuthSession();
  if (!session?.user?.id) return null;
  return session;
}
