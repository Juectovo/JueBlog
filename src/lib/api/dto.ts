import { Prisma, type GroupRole } from "@prisma/client";

import type {
  AuthorCard,
  CommentDto,
  FriendCard,
  GroupCard,
  PostCard,
} from "@/types/api";

/**
 * Prisma 查询形状与 API DTO 的映射层
 * API 不直接暴露数据库行：日期统一转 ISO 字符串、计数展平、嵌套 profile 展平
 */

// ---------- 查询形状 ----------

export const authorCardSelect = Prisma.validator<Prisma.UserArgs>()({
  select: {
    id: true,
    name: true,
    image: true,
    profile: { select: { username: true, avatarUrl: true } },
  },
});

export const friendCardSelect = Prisma.validator<Prisma.UserArgs>()({
  select: {
    id: true,
    name: true,
    image: true,
    profile: { select: { username: true, avatarUrl: true, bio: true } },
  },
});

export const postCardInclude = Prisma.validator<Prisma.PostArgs>()({
  include: {
    author: { select: authorCardSelect.select },
    postTags: { include: { tag: { select: { id: true, name: true } } } },
    _count: { select: { likes: true, comments: true } },
  },
});

export type PostCardRow = Prisma.PostGetPayload<typeof postCardInclude>;

export const commentTreeInclude = Prisma.validator<Prisma.CommentArgs>()({
  include: {
    author: { select: authorCardSelect.select },
    replies: {
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { author: { select: authorCardSelect.select } },
    },
  },
});

export type CommentRow = Prisma.CommentGetPayload<typeof commentTreeInclude>;
export type ReplyRow = CommentRow["replies"][number];

// ---------- 映射函数 ----------

type AuthorRow = {
  id: string;
  name: string | null;
  image: string | null;
  profile: { username: string; avatarUrl: string | null } | null;
};

export function toAuthorCard(user: AuthorRow): AuthorCard {
  return {
    id: user.id,
    name: user.name,
    image: user.image,
    username: user.profile?.username ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
  };
}

export function toPostCard(post: PostCardRow): PostCard {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    coverUrl: post.coverUrl,
    status: post.status,
    viewCount: post.viewCount,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    author: toAuthorCard(post.author),
    tags: post.postTags.map((pt) => pt.tag),
    likeCount: post._count.likes,
    commentCount: post._count.comments,
  };
}

export function toCommentTree(c: CommentRow): CommentDto {
  return {
    id: c.id,
    content: c.content,
    parentId: c.parentId,
    createdAt: c.createdAt.toISOString(),
    author: toAuthorCard(c.author),
    replies: c.replies.map((r) => ({
      id: r.id,
      content: r.content,
      parentId: r.parentId,
      createdAt: r.createdAt.toISOString(),
      author: toAuthorCard(r.author),
    })),
  };
}

type FriendRow = {
  id: string;
  name: string | null;
  image: string | null;
  profile: { username: string; avatarUrl: string | null; bio: string | null } | null;
};

export function toFriendCard(user: FriendRow, friendsSince: Date): FriendCard {
  return {
    ...toAuthorCard(user),
    bio: user.profile?.bio ?? null,
    friendsSince: friendsSince.toISOString(),
  };
}

export function toGroupCard(
  group: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    coverUrl: string | null;
    visibility: string;
    memberCount: number;
    createdAt: Date;
  },
  role: GroupRole | null
): GroupCard {
  return {
    id: group.id,
    name: group.name,
    slug: group.slug,
    description: group.description,
    coverUrl: group.coverUrl,
    visibility: group.visibility as GroupCard["visibility"],
    memberCount: group.memberCount,
    role,
    createdAt: group.createdAt.toISOString(),
  };
}
