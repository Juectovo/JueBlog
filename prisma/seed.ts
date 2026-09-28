/**
 * JueBlog 初始数据脚本
 * 运行：pnpm db:seed（需先 pnpm prisma:push 建表）
 * 说明：示例用户未绑定 OAuth 账号，仅用于本地展示数据，不能登录
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** n 天前 */
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("🌱 Seeding JueBlog...");

  // 按依赖顺序清空旧数据，保证可重复执行
  await prisma.notification.deleteMany();
  await prisma.groupPost.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.friendRequest.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.like.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.post.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // ---------- 用户与资料 ----------
  const jue = await prisma.user.create({
    data: {
      name: "Jue",
      email: "jue@jueblog.dev",
      emailVerified: daysAgo(30),
      profile: {
        create: {
          username: "jue",
          bio: "Write. Connect. Belong. —— JueBlog 的作者，相信写作是把人连起来的方式。",
          location: "Shanghai",
          github: "https://github.com/jue",
        },
      },
    },
  });

  const alice = await prisma.user.create({
    data: {
      name: "Alice",
      email: "alice@jueblog.dev",
      emailVerified: daysAgo(20),
      profile: {
        create: {
          username: "alice",
          bio: "前端工程师，着迷于黑色界面上的一像素边框。",
          location: "Hangzhou",
          github: "https://github.com/alice",
        },
      },
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: "Bob",
      email: "bob@jueblog.dev",
      emailVerified: daysAgo(10),
      profile: {
        create: {
          username: "bob",
          bio: "独立开发者，正在做自己的小产品，顺便记录一切。",
          location: "Chengdu",
        },
      },
    },
  });

  // ---------- 标签 ----------
  const [, tagNextjs, tagDesign, tagMotion] = await Promise.all([
    prisma.tag.create({ data: { name: "随笔" } }),
    prisma.tag.create({ data: { name: "nextjs" } }),
    prisma.tag.create({ data: { name: "设计" } }),
    prisma.tag.create({ data: { name: "framer-motion" } }),
  ]);

  // ---------- 文章 ----------
  const helloPost = await prisma.post.create({
    data: {
      authorId: jue.id,
      title: "Hello JueBlog",
      slug: "hello-jueblog",
      summary: "JueBlog 的第一篇文章：为什么我要再写一个博客。",
      status: "PUBLIC",
      viewCount: 321,
      publishedAt: daysAgo(7),
      createdAt: daysAgo(7),
      content: [
        "## 为什么是 JueBlog",
        "",
        "写过几个博客，都在某个冬天荒废了。不是没东西可写，而是写了没人看。",
        "",
        "JueBlog 想解决的就是这件事：**写作不该是独白**。在这里，每个人有自己的黑色小站（`username.jueblog.com`），好友可以互访、可以成圈，文章在朋友之间流动起来。",
        "",
        "> Write. Connect. Belong.",
        "",
        "这是整个站点的全部野心：写下来，连起来，然后有了归属。",
      ].join("\n"),
      postTags: { create: [{ tagId: tagNextjs.id }] },
    },
  });

  const blackPost = await prisma.post.create({
    data: {
      authorId: jue.id,
      title: "把博客写成纯黑的三个理由",
      slug: "why-pure-black",
      summary: "#0A0A0A 不是随便选的。",
      status: "PUBLIC",
      viewCount: 218,
      publishedAt: daysAgo(5),
      createdAt: daysAgo(5),
      content: [
        "1. **OLED 时代的体贴** —— 纯黑像素不发光，深夜写作不刺眼。",
        "2. **内容即主角** —— 界面退到 #141414 和 #262626 的背景里，文字 #EDEDED 才是唯一的亮点。",
        "3. **克制的紫** —— #7C3AED 只在 hover 时出现，像黑屋里的一盏小灯。",
      ].join("\n"),
      postTags: { create: [{ tagId: tagDesign.id }] },
    },
  });

  const draftPost = await prisma.post.create({
    data: {
      authorId: jue.id,
      title: "好友系统设计手记",
      slug: "friends-design-notes",
      summary: "关于好友申请、友情链接与互访动态的草稿。",
      status: "DRAFT",
      createdAt: daysAgo(2),
      content: "TODO：好友关系要不要支持分组？友情链接墙怎么排序？",
    },
  });

  const aliceFirst = await prisma.post.create({
    data: {
      authorId: alice.id,
      title: "我的第一篇博客",
      slug: "my-first-post",
      summary: "在 JueBlog 安家的第一晚。",
      status: "PUBLIC",
      viewCount: 87,
      publishedAt: daysAgo(4),
      createdAt: daysAgo(4),
      content: [
        "注册完第一个念头是：这么黑，会不会太酷了点？",
        "",
        "但写起来才发现，黑色把所有噪点都吸掉了，只剩我和文字。",
        "",
        "以后这里会记录我的前端笔记和一些不成体系的想法。欢迎来 `alice.jueblog.com` 常坐。",
      ].join("\n"),
      postTags: { create: [{ tagId: tagNextjs.id }] },
    },
  });

  const aliceUiPost = await prisma.post.create({
    data: {
      authorId: alice.id,
      title: "黑色极简 UI 的十个细节",
      slug: "minimal-ui-details",
      summary: "从 #0A0A0A 到 1px 边框，JueBlog 风格拆解。",
      status: "PUBLIC",
      viewCount: 154,
      publishedAt: daysAgo(3),
      createdAt: daysAgo(3),
      content: [
        "- 边框永远 1px，颜色 #262626：够存在，不抢戏",
        "- 卡片 #141414 比背景 #0A0A0A 亮一档，靠明度而不是阴影分层",
        "- 圆角 8-12px，10px 是甜点位",
        "- 动效只做 150-250ms 的位移与透明度，宁少勿多",
      ].join("\n"),
      postTags: {
        create: [
          { tagId: tagDesign.id },
          { tagId: tagMotion.id },
        ],
      },
    },
  });

  const bobMotionPost = await prisma.post.create({
    data: {
      authorId: bob.id,
      title: "用 Framer Motion 做克制的微动效",
      slug: "restrained-motion",
      summary: "动效是调味料，不是主菜。",
      status: "PUBLIC",
      viewCount: 66,
      publishedAt: daysAgo(1),
      createdAt: daysAgo(1),
      content: [
        "JueBlog 的动效原则：只有 hover、进场、状态切换三种时刻需要动效。",
        "",
        "```tsx\n<motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} />\n```",
        "",
        "两像素的悬浮，已经足够让卡片「活」过来。",
      ].join("\n"),
      postTags: { create: [{ tagId: tagMotion.id }] },
    },
  });

  // ---------- 评论（含嵌套回复） ----------
  const c1 = await prisma.comment.create({
    data: {
      postId: helloPost.id,
      authorId: alice.id,
      content: "终于等到 JueBlog 上线，这个纯黑首页第一眼就很喜欢。",
      createdAt: daysAgo(6),
    },
  });
  await prisma.comment.create({
    data: {
      postId: helloPost.id,
      authorId: jue.id,
      parentId: c1.id, // 嵌套回复
      content: "欢迎！你的域名 alice.jueblog.com 已经预留好了。",
      createdAt: daysAgo(6),
    },
  });
  await prisma.comment.create({
    data: {
      postId: blackPost.id,
      authorId: bob.id,
      content: "OLED 屏幕下确实省电（笑），收藏了。",
      createdAt: daysAgo(4),
    },
  });

  // ---------- 点赞 / 收藏 ----------
  await prisma.like.createMany({
    data: [
      { userId: alice.id, postId: helloPost.id },
      { userId: bob.id, postId: helloPost.id },
      { userId: bob.id, postId: blackPost.id },
      { userId: jue.id, postId: aliceFirst.id },
    ],
  });
  await prisma.bookmark.createMany({
    data: [
      { userId: jue.id, postId: aliceUiPost.id },
      { userId: alice.id, postId: helloPost.id },
    ],
  });

  // ---------- 好友与关注 ----------
  // 好友关系约定：userAId 字典序 < userBId
  const [a, b] = [jue.id, alice.id].sort();
  await prisma.friendship.create({
    data: { userAId: a, userBId: b, createdAt: daysAgo(6) },
  });
  await prisma.friendRequest.create({
    data: {
      requesterId: bob.id,
      addresseeId: jue.id,
      status: "PENDING",
      message: "我是 bob，加个好友交换友链？",
      createdAt: daysAgo(1),
    },
  });
  await prisma.follow.createMany({
    data: [
      { followerId: bob.id, followingId: jue.id },
      { followerId: alice.id, followingId: jue.id },
    ],
  });

  // ---------- 群组 ----------
  const writers = await prisma.group.create({
    data: {
      ownerId: jue.id,
      name: "写字的人",
      slug: "writers",
      description: "认真写字的人，在这里交换文章与灵感。",
      visibility: "PUBLIC",
      createdAt: daysAgo(7),
    },
  });
  await prisma.groupMember.createMany({
    data: [
      { groupId: writers.id, userId: jue.id, role: "OWNER" },
      { groupId: writers.id, userId: alice.id, role: "MEMBER" },
      { groupId: writers.id, userId: bob.id, role: "MEMBER" },
    ],
  });
  await prisma.groupPost.createMany({
    data: [
      { groupId: writers.id, postId: helloPost.id, sharedById: jue.id, createdAt: daysAgo(7) },
      { groupId: writers.id, postId: aliceUiPost.id, sharedById: alice.id, createdAt: daysAgo(3) },
    ],
  });
  await prisma.group.update({
    where: { id: writers.id },
    data: { memberCount: 3 },
  });

  // ---------- 通知（发给 jue 的未读消息） ----------
  await prisma.notification.createMany({
    data: [
      {
        userId: jue.id,
        actorId: alice.id,
        type: "POST_COMMENT",
        postId: helloPost.id,
        commentId: c1.id,
        createdAt: daysAgo(6),
      },
      {
        userId: jue.id,
        actorId: bob.id,
        type: "POST_LIKE",
        postId: helloPost.id,
        createdAt: daysAgo(5),
      },
      {
        userId: jue.id,
        actorId: alice.id,
        type: "POST_LIKE",
        postId: helloPost.id,
        createdAt: daysAgo(5),
      },
      {
        userId: jue.id,
        actorId: bob.id,
        type: "FRIEND_REQUEST",
        createdAt: daysAgo(1),
      },
    ],
  });

  console.log("✅ Seed 完成：3 用户 / 6 文章 / 3 评论 / 1 好友 / 1 待处理申请 / 1 群组 / 4 通知");
}

main()
  .catch((e) => {
    console.error("❌ Seed 失败：", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
