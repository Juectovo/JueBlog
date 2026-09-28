# JueBlog

黑色极简风的「个人博客 + 好友互联」平台 —— **Write. Connect. Belong.**

支持好友互访博客、群组圈子，GitHub OAuth / 邮箱魔法链接登录。

## 技术栈

Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion · Prisma + PostgreSQL (Supabase) · NextAuth.js · Resend · Vercel

## 本地启动

```bash
# 1. 安装依赖（推荐 pnpm；.npmrc 已配置 npmmirror 镜像源，国内网络可直连）
pnpm install

# 2. 配置环境变量
cp .env.example .env.local
# 填入 Supabase 数据库连接串、GitHub OAuth、Resend 密钥

# 3. 生成 Prisma Client（数据库模型在第 2 步落地后可执行 db push）
pnpm prisma:generate

# 4. 启动开发服务器
pnpm dev
# 访问 http://localhost:3000
```

## 开发顺序

技术栈骨架 → 数据库建模 → 认证 → API → UI → 部署
