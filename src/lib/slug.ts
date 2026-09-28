/**
 * slug 生成工具（文章 URL 片段 / 群组 slug 共用）
 */

/** 规范化：小写字母 / 数字 / 连字符；中文标题会被清空，调用方需处理回退 */
export function slugify(input: string, maxLen = 40): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen);
}

/**
 * 生成不重复的 slug：以 base 为基础，被占用时追加随机后缀（最多 5 次），
 * 兜底加时间戳。isTaken 由调用方注入（不同表的查重逻辑不同）。
 */
export async function generateUniqueSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>
): Promise<string> {
  const root = slugify(base) || `post-${Date.now().toString(36)}`;

  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 6)}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
}
