import { slugify } from "@/lib/slug";
import { prisma } from "@/lib/prisma";

/**
 * Profile 与 username（个人博客域名 username.jueblog.com）的工具函数
 */

/** 系统保留的 username（与路由路径冲突，禁止注册） */
export const RESERVED_USERNAMES = [
  "www", "api", "admin", "app", "login", "logout", "register",
  "settings", "u", "me", "groups", "friends", "posts", "write",
  "welcome", "blog", "docs", "static", "public", "about",
];

/** username 合法性：3-24 位小写字母 / 数字 / 连字符，非保留字 */
export function isUsernameValid(username: string): boolean {
  return (
    /^[a-z0-9](?:[a-z0-9-]{1,22}[a-z0-9])?$/.test(username) &&
    !RESERVED_USERNAMES.includes(username)
  );
}

/**
 * 生成一个未被占用的 username
 * 以 base 为基础，冲突时追加随机后缀（最多尝试 5 次，兜底加时间戳）
 */
export async function generateUsername(base: string): Promise<string> {
  const root = slugify(base, 24) || "user";

  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 6)}`;
    const exists = await prisma.profile.findUnique({ where: { username: candidate } });
    if (!exists) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
}

/**
 * 确保用户拥有 Profile（没有则自动创建并分配 username）
 * 用途：注册流程、GitHub / 魔法链接首次登录（OAuth 建号时不会带资料）
 */
export async function ensureProfile(options: {
  userId: string;
  email: string | null | undefined;
  name: string | null | undefined;
}) {
  const existing = await prisma.profile.findUnique({ where: { userId: options.userId } });
  if (existing) return existing;

  const base = options.name || options.email?.split("@")[0] || "user";
  const username = await generateUsername(base);

  return prisma.profile.create({ data: { userId: options.userId, username } });
}
