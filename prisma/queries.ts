/**
 * JueBlog 常用查询示例（第 2 步产出）
 *
 * 本文件是「类型检查过的参考实现」：API 层（第 4 步）的 Route Handlers
 * 将按这些模式封装查询。函数接收 PrismaClient 实例，文件本身不执行。
 */

import type { PrismaClient } from "@prisma/client";

/** 作者卡片的公共 select：列表页展示用 */
const authorCard = {
  select: {
    id: true,
    name: true,
    image: true,
    profile: { select: { username: true, avatarUrl: true } },
  },
} as const;

/** 文章卡片的公共 include：作者 + 标签 + 计数 */
const postCard = {
  include: {
    author: authorCard,
    postTags: { include: { tag: true } },
    _count: { select: { likes: true, comments: true } },
  },
} as const;

/**
 * 示例 1：好友的最新文章流
 * 好友 = 与我存在 Friendship 的用户；只取公开文章，按发布时间倒序
 */
export async function getFriendFeed(prisma: PrismaClient, meId: string, take = 20) {
  // 先取好友 ID 列表（Friendship 单行存储，双向匹配）
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: meId }, { userBId: meId }] },
    select: { userAId: true, userBId: true },
  });
  const friendIds = friendships.map((f) => (f.userAId === meId ? f.userBId : f.userAId));

  return prisma.post.findMany({
    where: { authorId: { in: friendIds }, status: "PUBLIC" },
    orderBy: { publishedAt: "desc" },
    take,
    ...postCard,
  });
}

/**
 * 示例 2：群组文章墙
 * 按 slug 取群组，返回分享时间线的文章卡片 + 分享人
 */
export async function getGroupWall(prisma: PrismaClient, groupSlug: string, take = 50) {
  return prisma.groupPost.findMany({
    where: { group: { slug: groupSlug } },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      post: postCard,
      sharedBy: { select: { id: true, name: true } },
    },
  });
}

/**
 * 示例 3：文章详情（含两层嵌套评论）
 * URL 解析：username.jueblog.com/[slug] → 按 username + slug 定位公开文章
 */
export async function getPostDetail(prisma: PrismaClient, username: string, slug: string) {
  return prisma.post.findFirst({
    where: {
      slug,
      status: "PUBLIC",
      author: { profile: { username } },
    },
    include: {
      author: authorCard,
      postTags: { include: { tag: true } },
      comments: {
        // 顶层评论在前端拼装楼层；回复嵌在 replies 里
        where: { parentId: null, deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          author: authorCard,
          replies: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" },
            include: { author: authorCard },
          },
        },
      },
      _count: { select: { likes: true, bookmarks: true } },
    },
  });
}

/**
 * 示例 4：个人博客首页（username.jueblog.com 的落点）
 * 返回资料 + 该用户的公开文章时间线
 */
export async function getBlogHome(prisma: PrismaClient, username: string) {
  return prisma.profile.findUnique({
    where: { username },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          posts: {
            where: { status: "PUBLIC" },
            orderBy: { publishedAt: "desc" },
            select: {
              id: true,
              title: true,
              slug: true,
              summary: true,
              viewCount: true,
              publishedAt: true,
              _count: { select: { likes: true, comments: true } },
            },
          },
        },
      },
    },
  });
}

/**
 * 示例 5：好友申请收件箱
 * 我收到的待处理申请，附申请人的完整名片
 */
export async function getFriendRequestInbox(prisma: PrismaClient, meId: string) {
  return prisma.friendRequest.findMany({
    where: { addresseeId: meId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          image: true,
          profile: { select: { username: true, bio: true, avatarUrl: true } },
        },
      },
    },
  });
}
