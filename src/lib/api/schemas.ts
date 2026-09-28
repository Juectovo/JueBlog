import { z } from "zod";

/**
 * 请求体 / 查询参数的 Zod 校验规则
 * 与前端表单共享的邮箱、密码规则在 lib/validators.ts
 */

/** 用户名（username.jueblog.com 子域）：3-24 位小写字母 / 数字 / 连字符 */
export const usernameSchema = z
  .string()
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{1,22}[a-z0-9])?$/,
    "用户名只能包含小写字母、数字和连字符（3-24 位）"
  );

// ---------- 文章 ----------

export const postCreateSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(120, "标题最长 120 字"),
  slug: z
    .string()
    .max(60)
    .regex(/^[a-z0-9-]+$/, "slug 只能包含小写字母、数字和连字符")
    .optional(),
  summary: z.string().max(200, "摘要最长 200 字").optional(),
  content: z.string().min(1, "正文不能为空").max(50_000, "正文最长 50000 字"),
  coverUrl: z.string().url("封面图必须是合法 URL").optional(),
  status: z.enum(["DRAFT", "PUBLIC", "PRIVATE"]).default("DRAFT"),
  tags: z
    .array(
      z
        .string()
        .min(1)
        .max(20)
        .transform((v) => v.trim().toLowerCase())
    )
    .max(5, "最多 5 个标签")
    .default([]),
});

export const postUpdateSchema = postCreateSchema.partial();

export const postListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(["DRAFT", "PUBLIC", "PRIVATE"]).optional(),
  tag: z.string().optional(),
  username: z.string().optional(),
  mine: z.enum(["1"]).optional(),
});

// ---------- 评论 ----------

export const commentSchema = z.object({
  content: z.string().min(1, "评论不能为空").max(1000, "评论最长 1000 字"),
  parentId: z.string().optional(),
});

// ---------- 好友 ----------

export const friendRequestSchema = z.object({ username: usernameSchema });

export const friendAcceptSchema = z.object({ requestId: z.string().min(1, "缺少 requestId") });

// ---------- 群组 ----------

export const groupCreateSchema = z.object({
  name: z.string().min(1, "群组名不能为空").max(40, "群组名最长 40 字"),
  slug: z
    .string()
    .max(40)
    .regex(/^[a-z0-9-]+$/, "slug 只能包含小写字母、数字和连字符")
    .optional(),
  description: z.string().max(200, "简介最长 200 字").optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "INVITE"]).default("PUBLIC"),
});

export const groupListQuerySchema = z.object({
  scope: z.enum(["mine", "public"]).default("public"),
});

// ---------- 个人资料 ----------

export const profileUpdateSchema = z.object({
  name: z.string().min(1, "昵称不能为空").max(30, "昵称最长 30 字").optional(),
  bio: z.string().max(200, "简介最长 200 字").optional(),
  avatarUrl: z
    .string()
    .url("头像必须是合法 URL")
    .or(z.literal(""))
    .optional(),
  website: z
    .string()
    .url("网站必须是合法 URL")
    .or(z.literal(""))
    .optional(),
  github: z.string().max(100).optional(),
  twitter: z.string().max(100).optional(),
  location: z.string().max(50).optional(),
  username: usernameSchema.optional(),
});
