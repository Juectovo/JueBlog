# JueBlog 数据库关系图（文字版 ER 说明）

> 完整定义见 [schema.prisma](../prisma/schema.prisma)。

## 总览图

```
                       ┌──────────┐
             1:1       │          │
        User ──────────┤ Profile  │  username.jueblog.com / 社交链接 / 头像
          │            └──────────┘
          │
          ├─1:N─ Post（作者）──────────────┐
          │        │                      │
          │        ├─1:N─ Comment（评论）─┤ Comment 自关联：parent / replies 嵌套回复
          │        │
          │        ├─N:M─ Tag        经 PostTag（复合主键防重复）
          │        │
          │        ├─N:M─ User       Like（点赞，userId+postId 唯一）
          │        │                 Bookmark（收藏，userId+postId 唯一）
          │        │
          │        └─N:M─ Group      经 GroupPost（群组文章墙，记录 sharedBy）
          │
          ├─N:M─ User   FriendRequest（requester → addressee，PENDING/ACCEPTED/DECLINED）
          │             Friendship（好友，单行存储，约定 userAId < userBId）
          │             Follow（单向关注，follower → following）
          │
          ├─1:N─ Notification（接收者 user + 触发者 actor，可挂 post/comment/group）
          │
          ├─1:N─ Group（owner 群主）
          │
          └─N:M─ Group   经 GroupMember（role: OWNER / ADMIN / MEMBER）
```

## 关系清单

| 关系 | 基数 | 落点 | 说明 |
| --- | --- | --- | --- |
| User ↔ Profile | 1:1 | Profile.userId @unique | 博客门面信息，随用户级联删除 |
| User → Post | 1:N | Post.authorId | 文章归属作者 |
| Post → Comment | 1:N | Comment.postId | 评论楼层 |
| Comment → Comment | 1:N | Comment.parentId | 嵌套回复（@relation "CommentReplies"） |
| Post ↔ Tag | N:M | PostTag（复合主键） | 全局标签池 |
| User ↔ Post | N:M | Like / Bookmark | 各自 userId+postId 唯一，防重复操作 |
| User ↔ User | N:M | FriendRequest | 申请流：通过后写入 Friendship |
| User ↔ User | N:M | Friendship | 好友关系单行存储，userAId 字典序 < userBId |
| User ↔ User | N:M | Follow | 单向关注，与好友互补 |
| User → Notification | 1:N ×2 | userId / actorId | 接收者 + 触发者双关联 |
| User → Group | 1:N | Group.ownerId | 群主 |
| User ↔ Group | N:M | GroupMember | 群内角色 OWNER/ADMIN/MEMBER |
| Post ↔ Group | N:M | GroupPost | 群组文章墙，sharedById 记录分享人 |

## 设计决策

1. **冗余计数**：`Post.viewCount`、`Group.memberCount` 直接存数值，读路径（时间线、群组墙）免 `COUNT`，写路径负责维护。
2. **好友单行存储**：Friendship 用 `userAId < userBId` 约定一行表达双向关系，避免两行同步问题；查询好友列表时 `OR` 匹配两侧。
3. **评论软删除**：`Comment.deletedAt` 保留楼层结构与回复链，前端展示「已删除」；文章删除为硬删除，关联数据级联清理。
4. **群组文章墙**：文章永远属于作者个人博客，GroupPost 只是「分享进群」的关联，删群不删文，符合「个人博客为主、圈子为流」的产品逻辑。
5. **级联策略**：所有以 User 为起点的关联均为 `onDelete: Cascade`，注销用户时全链路清理，无孤儿数据。
6. **slug 策略**：`Post` 的 slug 在作者维度唯一（`@@unique([authorId, slug])`），配合 `Profile.username` 拼出 `username.jueblog.com/[slug]`；`Group.slug` 全局唯一。
