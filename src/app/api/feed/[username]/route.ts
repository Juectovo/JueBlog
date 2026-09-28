import { notFound, serverError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function xmlEscape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * GET /api/feed/[username] —— 用户的 RSS 订阅源（RSS 2.0）
 * 任何 RSS 阅读器都可订阅：username.jueblog.com 的公开文章时间线
 */
export async function GET(req: Request, { params }: { params: { username: string } }) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { username: params.username },
      include: { user: { select: { name: true } } },
    });
    if (!profile) return notFound();

    const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
    const posts = await prisma.post.findMany({
      where: { authorId: profile.userId, status: "PUBLIC" },
      orderBy: { publishedAt: "desc" },
      take: 20,
    });

    const siteUrl = `${origin}/u/${profile.username}`;
    const authorName = profile.user.name ?? profile.username;

    const items = posts
      .map((p) => {
        const url = `${origin}/posts/${p.id}`;
        const pubDate = (p.publishedAt ?? p.createdAt).toUTCString();
        return `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      ${p.summary ? `<description>${xmlEscape(p.summary)}</description>` : ""}
    </item>`;
      })
      .join("\n");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlEscape(authorName)} 的 JueBlog</title>
    <link>${siteUrl}</link>
    <description>${xmlEscape(profile.bio ?? `${authorName} 的公开文章`)} </description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

    return new Response(rss, {
      headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
    });
  } catch (err) {
    return serverError(err, "GET /api/feed/[username]");
  }
}
