import { notFound, ok, serverError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/explore/random —— 随机逛逛：随机一篇公开文章
 */
export async function GET(req: Request) {
  try {
    const total = await prisma.post.count({ where: { status: "PUBLIC" } });
    if (!total) return notFound("还没有公开文章");

    const post = await prisma.post.findFirst({
      where: { status: "PUBLIC" },
      orderBy: { id: "asc" },
      skip: Math.floor(Math.random() * total),
      take: 1,
      select: { id: true, title: true },
    });

    return ok(post);
  } catch (err) {
    return serverError(err, "GET /api/explore/random");
  }
}
