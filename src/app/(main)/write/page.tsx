import { notFound, redirect } from "next/navigation";

import { PostEditor, type PostEditorInitial } from "@/components/PostEditor";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "写作" };

/**
 * 写作页 /write（需登录，middleware 保护）
 * - /write           创建新文章
 * - /write?edit=[id] 编辑自己的文章（非作者 404）
 */
export default async function WritePage({
  searchParams,
}: {
  searchParams: { edit?: string };
}) {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");
  const me = session.user.id;

  let initial: PostEditorInitial | undefined;

  if (searchParams.edit) {
    const post = await prisma.post.findUnique({
      where: { id: searchParams.edit },
      include: { postTags: { include: { tag: { select: { name: true } } } } },
    });
    if (!post || post.authorId !== me) notFound();

    initial = {
      id: post.id,
      title: post.title,
      summary: post.summary,
      content: post.content,
      coverUrl: post.coverUrl,
      tags: post.postTags.map((pt) => pt.tag.name),
      status: post.status,
    };
  }

  return <PostEditor initial={initial} />;
}
