/**
 * JueBlog API 冒烟测试
 * 用法：先 pnpm build && pnpm start（或 dev），然后
 *   SMOKE_LOG=服务器日志路径 pnpm node scripts/smoke-api.mjs [baseUrl]
 * 会在数据库中创建一个临时账号（smoke-xxx@jueblog.dev）并在结束时清理。
 */
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const base = process.argv[2] ?? "http://127.0.0.1:3000";
const logFile = process.env.SMOKE_LOG ?? "/tmp/jueblog-server-smoke.log";
const email = `smoke-${Date.now()}@jueblog.dev`;
const password = "Smoke1234";

const prisma = new PrismaClient();
const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function api(path, opts = {}, retry = 2) {
  try {
    const res = await fetch(base + path, {
      ...opts,
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader(),
        ...(opts.headers ?? {}),
      },
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const eq = pair.indexOf("=");
      jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  } catch (err) {
    // 本地服务器偶发连接抖动：自动重试
    if (retry <= 0) throw err;
    await new Promise((r) => setTimeout(r, 1000));
    return api(path, opts, retry - 1);
  }
}

let passed = 0;
let failed = 0;
function check(name, cond, extra) {
  if (cond) {
    passed++;
    console.log("✅", name);
  } else {
    failed++;
    console.log("❌", name, extra !== undefined ? JSON.stringify(extra) : "");
  }
}

async function main() {
  // ---------- 1. 公开接口（seed 数据） ----------
  const posts = await api("/api/posts?page=1&pageSize=5");
  check("GET /api/posts 列表", posts.body?.success === true && Array.isArray(posts.body.data.items));
  check("列表包含 seed 文章", (posts.body?.data?.total ?? 0) >= 5);
  const hello = posts.body.data.items.find((p) => p.slug === "hello-jueblog");
  check("找到 hello-jueblog", Boolean(hello));

  const jue = await api("/api/users/jue");
  check("GET /api/users/jue 主页数据", jue.body?.success === true && jue.body.data.username === "jue");

  const groups = await api("/api/groups?scope=public");
  check("GET /api/groups 公开列表", groups.body?.success === true && groups.body.data.items.some((g) => g.slug === "writers"));
  const writers = groups.body.data.items.find((g) => g.slug === "writers");
  const wall = await api(`/api/groups/${writers.id}/posts`);
  check("群组文章墙", wall.body?.success === true && wall.body.data.items.length >= 2);

  // ---------- 2. 未登录保护 ----------
  const guard = await api("/api/friends");
  check("未登录访问受保护接口 → 401", guard.status === 401 && guard.body?.error?.code === "UNAUTHORIZED");

  // ---------- 3. 注册 + 邮箱验证 + 密码登录 ----------
  const reg = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  check("注册临时账号", reg.status === 201, reg.body);

  await new Promise((r) => setTimeout(r, 800));
  const log = fs.readFileSync(logFile, "utf8");
  const links = log.match(/https?:\/\/[^\s"']+verify-email\?token=[a-f0-9]+&email=[^\s"']+/g) ?? [];
  const verifyUrl = [...links].reverse().find((l) => l.includes(encodeURIComponent(email)));
  check("从日志拿到验证链接", Boolean(verifyUrl));
  if (verifyUrl) {
    const v = await fetch(verifyUrl, { redirect: "manual" });
    // NextResponse.redirect 默认 307；重定向目标应为 /login?verified=1
    check("邮箱验证（重定向回登录页）", v.status === 302 || v.status === 307, v.status);
  }

  // NextAuth 自有端点不套业务信封，csrfToken 在顶层
  // 注意：credentials 的登录端点是 callback/credentials（react 客户端同款），
  // signin/credentials 对 credentials 类型只会兜底重定向回 /signin
  const csrf = await api("/api/auth/csrf");
  const login = await api("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken: csrf.body?.csrfToken ?? "",
      email,
      password,
      json: "true",
    }).toString(),
  });
  check("密码登录", login.status === 200 && !String(login.body?.url ?? "").includes("error"), login.body);
  const session = await api("/api/auth/session");
  check("会话生效", Boolean(session.body?.user?.id));

  // ---------- 4. 文章 CRUD ----------
  const created = await api("/api/posts", {
    method: "POST",
    body: JSON.stringify({
      title: "API 冒烟测试文章",
      content: "## 来自冒烟测试\n\nHello JueBlog API.",
      status: "PUBLIC",
      tags: ["测试", "API"],
    }),
  });
  check("创建文章", created.status === 201 && Boolean(created.body?.data?.id), created.body);
  const pid = created.body?.data?.id;

  const patched = await api(`/api/posts/${pid}`, {
    method: "PATCH",
    body: JSON.stringify({ summary: "冒烟测试摘要" }),
  });
  check("PATCH 自己的文章", patched.body?.data?.summary === "冒烟测试摘要", patched.body);

  const detail = await api(`/api/posts/${pid}`);
  check("文章详情含正文与标签", detail.body?.data?.content?.includes("冒烟测试") === true && detail.body.data.tags.length === 2);

  const drafts = await api("/api/posts?mine=1&status=DRAFT");
  check("mine=1 草稿筛选可用", drafts.body?.success === true && Array.isArray(drafts.body.data.items));

  // ---------- 5. 点赞 / 评论 ----------
  const like = await api(`/api/posts/${hello.id}/like`, { method: "POST" });
  check("点赞", like.body?.data?.liked === true && like.body.data.likeCount >= 1, like.body);
  const unlike = await api(`/api/posts/${hello.id}/like`, { method: "POST" });
  check("再次点击取消点赞（toggle）", unlike.body?.data?.liked === false);
  await api(`/api/posts/${hello.id}/like`, { method: "POST" }); // 赞回去

  const comment = await api(`/api/posts/${hello.id}/comment`, {
    method: "POST",
    body: JSON.stringify({ content: "冒烟测试评论" }),
  });
  check("发表评论", comment.status === 201 && Boolean(comment.body?.data?.id), comment.body);
  const reply = await api(`/api/posts/${hello.id}/comment`, {
    method: "POST",
    body: JSON.stringify({ content: "冒烟测试回复", parentId: comment.body?.data?.id }),
  });
  check("嵌套回复", reply.status === 201, reply.body);
  const badReply = await api(`/api/posts/${hello.id}/comment`, {
    method: "POST",
    body: JSON.stringify({ content: "三层不允许", parentId: reply.body?.data?.id }),
  });
  check("三层嵌套被拒绝", badReply.status === 400);

  const detail2 = await api(`/api/posts/${hello.id}`);
  check("详情页评论区可见", detail2.body?.data?.comments?.some((c) => c.id === comment.body.data.id) === true);

  // ---------- 6. 好友 ----------
  const freq = await api("/api/friends/request", {
    method: "POST",
    body: JSON.stringify({ username: "jue" }),
  });
  check("发送好友申请", freq.status === 201 || freq.status === 200, freq.body);
  const dup = await api("/api/friends/request", {
    method: "POST",
    body: JSON.stringify({ username: "jue" }),
  });
  check("重复申请被拒 409", dup.status === 409);
  const friends = await api("/api/friends");
  check("好友列表", friends.body?.success === true && Array.isArray(friends.body.data.items));
  const feed = await api("/api/friends/feed");
  check("好友 Feed（尚无好友文章）", feed.body?.success === true && feed.body.data.items.length === 0);

  // ---------- 7. 群组 ----------
  const g = await api("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name: "冒烟测试群组", visibility: "PUBLIC" }),
  });
  check("创建群组（OWNER）", g.status === 201 && g.body?.data?.role === "OWNER", g.body);
  const join = await api(`/api/groups/${writers.id}/join`, { method: "POST" });
  check("加入公开群组", join.body?.data?.joined === true, join.body);
  const myGroups = await api("/api/groups?scope=mine");
  check("我的群组（含角色）", myGroups.body.data.items.length >= 2 && myGroups.body.data.items.every((x) => x.role));

  // ---------- 8. 资料 ----------
  const me = await api("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify({ bio: "API 冒烟测试账号", location: " localhost" }),
  });
  check("更新资料", me.body?.data?.bio === "API 冒烟测试账号", me.body);
  const reserved = await api("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify({ username: "admin" }),
  });
  check("保留字用户名被拒", reserved.status === 400);

  console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
}

async function cleanup() {
  try {
    // 用户级联清理：文章 / 评论 / 点赞 / 申请 / 群组 / 相关通知一并删除
    await prisma.user.delete({ where: { email } });
    console.log("🧹 已清理冒烟测试数据（", email, "）");
  } catch {
    console.log("⚠️ 清理跳过（账号可能未创建）");
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error("冒烟测试异常：", e);
    failed++;
  })
  .finally(async () => {
    await cleanup();
    process.exit(failed ? 1 : 0);
  });
