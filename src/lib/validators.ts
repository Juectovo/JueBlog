import { z } from "zod";

/**
 * JueBlog 共享校验规则
 * API 路由（服务端权威校验）与前端表单（即时反馈）共用，保证口径一致
 */

/** 邮箱：格式校验 + 规范化（去空格、转小写） */
export const emailSchema = z
  .string()
  .email("邮箱格式不正确")
  .transform((v) => v.trim().toLowerCase());

/**
 * 密码强度（对齐 QQ 标准）：8-16 位，同时包含字母和数字，不含空格
 */
export const passwordSchema = z
  .string()
  .min(8, "密码至少 8 位")
  .max(16, "密码最多 16 位")
  .regex(/^[^\s]+$/, "密码不能包含空格")
  .regex(/[a-zA-Z]/, "密码需包含字母")
  .regex(/\d/, "密码需包含数字");

/** 客户端即时校验用（返回错误文案或 null） */
export function checkPasswordStrength(password: string): string | null {
  const result = passwordSchema.safeParse(password);
  return result.success ? null : result.error.issues[0].message;
}
