# JueBlog API 文档

> 基础路径：`/api`　|　认证：Cookie Session（NextAuth JWT）　|　实现：Next.js Route Handlers

## 响应封装

所有业务接口返回统一信封：

```jsonc
// 成功
{ "success": true, "data": { /* 各接口定义 */ } }
// 失败
{ "success": false, "error": { "code": "FORBIDDEN", "message": "只能编辑自己的文章" } }
```

| 错误码 | HTTP | 含义 |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | 请求参数不合法（Zod 校验） |
| `UNAUTHORIZED` | 401 | 未登录 |
| `FORBIDDEN` | 403 | 无权限（非本人 / 非成员 / 私密群组） |
| `NOT_FOUND` | 404 | 资源不存在或不可见 |
| `CONFLICT` / `ALREADY_FRIENDS` / `ALREADY_MEMBER` / `REQUEST_PENDING` | 409 | 唯一性 / 状态冲突 |
| `INTERNAL_ERROR` | 500 | 服务器错误 |

**分页约定**：查询参数 `page`（≥1，默认 1）、`pageSize`（1-50，默认 10）；分页接口返回
`{ items, page, pageSize, total }`。

---

## 文章模块

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/posts` | 可选 | 文章列表（分页） |
| POST | `/posts` | ✅ | 创建文章 |
| GET | `/posts/[id]` | 可选 | 文章详情（含两层评论区、点赞状态） |
| PATCH | `/posts/[id]` | ✅ 本人 | 编辑文章 |
| DELETE | `/posts/[id]` | ✅ 本人 | 删除文章（级联清理） |
| POST | `/posts/[id]/like` | ✅ | 点赞 / 取消点赞（切换式） |
| POST | `/posts/[id]/comment` | ✅ | 发表评论 / 回复（两层） |

**GET /posts 查询参数**

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `page` / `pageSize` | number | 分页 |
| `mine=1` | - | 只看自己的文章（需登录，可叠加 `status` 筛选，含草稿/私密） |
| `status` | DRAFT \| PUBLIC \| PRIVATE | 仅 `mine=1` 时生效 |
| `username` | string | 按作者筛选（自动限定 PUBLIC） |
| `tag` | string | 按标签名筛选 |

**POST /posts 请求体**（返回 `PostCard`，201）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| title | string (1-120) | ✅ | 标题 |
| content | string (≤50000) | ✅ | Markdown 正文 |
| status | DRAFT \| PUBLIC \| PRIVATE | - | 默认 DRAFT；非草稿写入 publishedAt |
| slug | string | - | 作者维度唯一；不传按标题自动生成（中文标题回退随机 slug） |
| summary | string (≤200) | - | 摘要 |
| coverUrl | string (URL) | - | 封面图 |
| tags | string[] (≤5) | - | 标签自动小写去空格，connectOrCreate |

**POST /posts/[id]/like 返回**：`{ liked: boolean, likeCount: number }`

**POST /posts/[id]/comment 请求体**：`{ content: string (1-1000), parentId?: string }`
（parentId 必须指向同文章的顶层评论，否则 400）；返回 `CommentDto`（201）

---

## 好友模块

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/friends` | ✅ | 我的好友列表 `FriendCard[]` |
| GET | `/friends/feed` | ✅ | 好友动态流：好友的公开文章，按发布时间倒序（分页） |
| POST | `/friends/request` | ✅ | 发送好友申请 |
| POST | `/friends/accept` | ✅ | 接受申请（写 Friendship + 双向关闭待处理申请） |
| DELETE | `/friends/[userId]` | ✅ | 删除好友（路径参数为对方用户 ID） |

**POST /friends/request 请求体**：`{ username }`（对方的博客域名用户名）
规则：不能加自己；已是好友 → `ALREADY_FRIENDS`；已有 PENDING 申请 → `REQUEST_PENDING`；曾被拒可重新发起。

**POST /friends/accept 请求体**：`{ requestId }`；仅接收人可操作；返回新建的 `FriendCard`（201）。

---

## 群组模块

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/groups` | 可选 | `?scope=public`（默认，按成员数倒序）/ `?scope=mine`（需登录，含我的角色） |
| POST | `/groups` | ✅ | 创建群组（创建者自动 OWNER，memberCount=1） |
| POST | `/groups/[id]/join` | ✅ | 加入群组（仅 PUBLIC 直接加入；PRIVATE/INVITE 403） |
| GET | `/groups/[id]/posts` | 可选 | 群组文章墙（分页）；非公开群组仅成员可见 |

**POST /groups 请求体**（返回 `GroupCard`，201）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string (1-40) | ✅ | 群组名 |
| slug | string | - | 全局唯一；不传按名称生成 |
| description | string (≤200) | - | 简介 |
| visibility | PUBLIC \| PRIVATE \| INVITE | - | 默认 PUBLIC |

---

## 用户模块

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/users/[username]` | 公开 | 个人主页聚合：资料 + 统计（公开文章数/好友数）+ 最新公开文章 ≤10 篇 |
| PATCH | `/users/me` | ✅ 本人 | 更新资料 |

**PATCH /users/me 请求体**（全部可选，返回 `MyProfile`）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| name | string (1-30) | 昵称（存 User） |
| username | string | 3-24 位小写字母/数字/连字符，非保留字，全局唯一 |
| bio / location | string (≤200 / ≤50) | 简介 / 所在地 |
| avatarUrl / website | string (URL 或 "") | 传空字符串表示清空 |
| github / twitter | string (≤100) | 社交链接 |

---

## 核心类型速览

```ts
type PostCard = {
  id, title, slug, summary, coverUrl,
  status: "DRAFT" | "PUBLIC" | "PRIVATE",
  viewCount: number,
  publishedAt: string | null,   // ISO
  createdAt: string,            // ISO
  author: { id, name, image, username, avatarUrl },
  tags: { id, name }[],
  likeCount: number, commentCount: number,
};
type PostDetail = PostCard & { content: string; liked: boolean; comments: CommentDto[] };
type FriendCard = AuthorCard & { bio: string | null; friendsSince: string };
type GroupCard = { id, name, slug, description, coverUrl,
  visibility: "PUBLIC" | "PRIVATE" | "INVITE", memberCount: number,
  role: "OWNER" | "ADMIN" | "MEMBER" | null, createdAt: string };
```

完整类型见 `src/types/api.ts`（与前端共享）。

## 权限模型

1. **文章**：仅作者可编辑 / 删除；DRAFT / PRIVATE 对非作者一律 404（不泄露存在性）
2. **资料**：仅本人可改（`/users/me` 从会话取身份，无越权面）
3. **好友**：申请仅接收人可接受；删除好友无方向限制
4. **群组**：PRIVATE / INVITE 的文章墙仅成员可见；加入仅开放 PUBLIC

## 第 5 步 UI 补充端点

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/search?q=` | 公开 | 全局搜索：公开文章（标题/摘要）+ 用户（用户名/昵称），各 ≤5 条 |
| GET | `/explore/random` | 公开 | 随机一篇公开文章（首页「带我随机逛逛」） |
| POST | `/posts/[id]/bookmark` | ✅ | 收藏 / 取消收藏（切换式），返回 `{ bookmarked }` |
| GET | `/friends/requests` | ✅ | 我收到的好友申请（PENDING，含申请人名片） |
| DELETE | `/friends/requests/[id]` | ✅ | 拒绝好友申请（置为 DECLINED，仅接收人） |
| GET | `/users/[username]/friends` | 公开 | 某用户的好友名片列表（主页「好友」Tab） |
| GET | `/users/[username]/groups` | 公开 | 某用户加入的公开群组（主页「群组」Tab） |
| GET | `/users/[username]` | 公开 | （增强）新增 `activity`：最近 15 周逐日发文计数（热力图） |
| GET | `/groups/[id]` | 视可见性 | 群组详情：卡片 + 成员名单（含角色）+ 我的角色 |
| POST | `/groups/[id]/share` | ✅ 成员 | 分享公开文章到群组墙 `{ postId }`；重复 409 |

## 本地调试

> 冒烟测试脚本：`scripts/smoke-api.mjs`（31 项断言覆盖全部模块；需先 `pnpm dev`，
> 用 `SMOKE_LOG=/tmp/jueblog-dev.log pnpm exec dotenv -e .env.local -- node scripts/smoke-api.mjs http://127.0.0.1:3000` 运行，
> 结束时自动清理测试数据。注意 credentials 登录端点是 `/api/auth/callback/credentials`，
> 不是 `/signin/credentials`——后者对 credentials 类型只会兜底重定向回登录页。）
