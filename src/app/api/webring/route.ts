import { notFound, ok, serverError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/webring?current=[username] —— 博客环（Webring）
 * 按创建时间顺序跳到「下一家」博客；首尾相接，环游整个 JueBlog
 */
export async function GET(req: Request) {
  try {
    const current = new URL(req.url).searchParams.get("current");

    const profiles = await prisma.profile.findMany({
      select: { username: true },
      orderBy: { createdAt: "asc" },
    });
    if (profiles.length < 2) return notFound("博客环里还没有第二家博客");

    const idx = profiles.findIndex((p) => p.username === current);
    const next = idx === -1 ? profiles[0] : profiles[(idx + 1) % profiles.length];

    return ok({ username: next.username });
  } catch (err) {
    return serverError(err, "GET /api/webring");
  }
}
