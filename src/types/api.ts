import type { GroupRole, GroupVisibility, PostStatus } from "@prisma/client";

/**
 * JueBlog API 类型定义（文档 + 前端共享）
 * 日期字段统一为 ISO 8601 字符串（JSON 序列化后的形态）
 */

// ---------- 响应封装 ----------

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; error: { code: string; message: string } };
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

/** 分页元信息（随分页接口返回） */
export type Pagination = { page: number; pageSize: number; total: number };
export type Paginated<T> = Pagination & { items: T[] };

// ---------- 通用形状 ----------

/** 作者名片 */
export type AuthorCard = {
  id: string;
  name: string | null;
  image: string | null;
  username: string | null; // username.jueblog.com 子域部分
  avatarUrl: string | null;
};

export type TagDto = { id: string; name: string };

// ---------- 文章 ----------

/** 文章卡片（列表 / 信息流） */
export type PostCard = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  coverUrl: string | null;
  status: PostStatus;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  author: AuthorCard;
  tags: TagDto[];
  likeCount: number;
  commentCount: number;
};

/** 评论（两层：顶层评论含 replies） */
export type CommentDto = {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  author: AuthorCard;
  replies?: CommentDto[];
};

/** 文章详情 = 卡片 + 正文 + 我的点赞状态 + 评论区 */
export type PostDetail = PostCard & {
  content: string;
  liked: boolean;
  comments: CommentDto[];
};

// ---------- 好友 ----------

export type FriendCard = AuthorCard & {
  bio: string | null;
  friendsSince: string;
};

export type FriendRequestDto = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  requester: AuthorCard & { bio: string | null };
};

// ---------- 群组 ----------

export type GroupCard = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  visibility: GroupVisibility;
  memberCount: number;
  /** 我在群内的角色；未加入为 null */
  role: GroupRole | null;
  createdAt: string;
};

/** 群组文章墙条目 */
export type GroupWallItem = {
  id: string; // GroupPost 关联记录 id
  sharedBy: { id: string; name: string | null };
  sharedAt: string;
  post: PostCard;
};

// ---------- 用户 ----------

/** 个人主页聚合数据 */
export type UserProfile = {
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  website: string | null;
  github: string | null;
  twitter: string | null;
  location: string | null;
  stats: { posts: number; friends: number };
  /** 最新公开文章（≤10 篇） */
  posts: PostCard[];
};

/** 我的资料（PATCH /api/users/me 返回） */
export type MyProfile = {
  id: string;
  userId: string;
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  website: string | null;
  github: string | null;
  twitter: string | null;
  location: string | null;
};

// ---------- 第 5 步 UI 补充 ----------

/** 活动热力图单日 */
export type ActivityDay = { date: string; count: number };

/** 全局搜索结果 */
export type SearchResults = {
  posts: PostCard[];
  users: (AuthorCard & { bio: string | null })[];
};

/** 群组成员 */
export type GroupMemberDto = {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: GroupRole;
  joinedAt: string;
};

/** 群组详情 = 卡片 + 成员名单 + 我的角色 */
export type GroupDetail = GroupCard & {
  members: GroupMemberDto[];
  myRole: GroupRole | null;
};

/** 收到的好友申请 */
export type IncomingFriendRequest = {
  id: string;
  createdAt: string;
  requester: FriendCard;
};
