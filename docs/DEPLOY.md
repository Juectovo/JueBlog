# JueBlog 部署指南（GitHub + Vercel + Supabase）

> 本地仓库已初始化并完成首次提交。按本文档操作即可上线。

## 一、推送到 GitHub

```bash
# 1. 在 GitHub 上新建空仓库（不要勾选 README / .gitignore 初始化）
#    仓库名建议：jueblog
#    https://github.com/new

# 2. 关联远程并推送
git remote add origin https://github.com/Juectovo/jueblog.git
git push -u origin main
```

> 推送时浏览器会弹出 GitHub 授权（Git Credential Manager 自动管理），或使用 Personal Access Token 作为密码。

## 二、Vercel 导入项目

1. 打开 [vercel.com](https://vercel.com) → **Add New… → Project** → 选择刚推送的 `jueblog` 仓库 → **Import**；
2. Framework Preset 会自动识别为 **Next.js**，构建命令/输出目录保持默认；
3. 先不要点 Deploy——展开 **Environment Variables**，按下表逐项添加（Production + Preview 都勾选）：

| 变量名 | 值 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | Supabase 事务池器连接串（含 `?pgbouncer=true`，端口 6543） | 与本地 `.env.local` 相同即可（同一个库） |
| `DIRECT_URL` | Supabase 会话池器连接串（端口 5432） | 供 Prisma CLI 使用 |
| `NEXTAUTH_URL` | `https://<你的域名>.vercel.app`（之后换绑自定义域名时同步改） | 生产地址，**协议和域名必须一字不差** |
| `NEXTAUTH_SECRET` | 新生成：`openssl rand -base64 32` | 生产建议与本地不同 |
| `GITHUB_ID` / `GITHUB_SECRET` | GitHub OAuth App 凭据 | 见第五节：回调地址需更新 |
| `RESEND_API_KEY` | Resend 的 API Key | 上线后邮件才能真正发出 |
| `EMAIL_FROM` | `JueBlog <noreply@jueblog.com>` | 需先在 Resend 验证发信域名 |
| `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` | 可选 | 不配则「AI 生成摘要」按钮提示未启用 |
| ~~`OAUTH_PROXY_URL`~~ | **不要配置** | 那是本地开发用的国内代理；Vercel 服务器在海外直连 GitHub，配置了反而全挂 |

4. 点 **Deploy**，约 1-2 分钟完成首次部署。

## 三、绑定自定义域名

1. Vercel 项目 → **Settings → Domains → Add**，输入 `jueblog.com`（以及 `www.jueblog.com`）；
2. 按提示到域名 DNS 服务商添加记录：
   - 根域 `A` 记录 → `76.76.21.21`；
   - `www` 的 `CNAME` → `cname.vercel-dns.com`；
3. 回到 Vercel 等待证书自动签发（几分钟）；
4. **换绑后同步修改两处**：Vercel 环境变量 `NEXTAUTH_URL` → `https://jueblog.com`，GitHub OAuth 回调（见下节），然后 **Redeploy**（环境变量修改不自动生效）。

> `username.jueblog.com` 子域方案：需要 Vercel Pro 的通配符域名（`*.jueblog.com`）+ 一段 middleware 按 Host 重写到 `/u/[username]`。当前应用使用路径形式 `/u/[username]`，子域重写列入 V2 路线图。

## 四、GitHub OAuth 回调（生产）

复用现有 OAuth App 即可（也可为生产单建一个）：

1. GitHub → Settings → Developer settings → OAuth Apps → **JueBlog → Edit**；
2. **Authorization callback URL** 改为：
   ```
   https://jueblog.com/api/auth/callback/github
   ```
   （未绑域名前先填 `https://<项目名>.vercel.app/api/auth/callback/github`）
3. Homepage URL 改为生产地址；Save。
4. 确认 Vercel 里的 `NEXTAUTH_URL` 与回调地址的域名完全一致，否则报 `redirect_uri_mismatch`。

## 五、数据库迁移方案

当前工作流采用 **`prisma db push`**（单人项目，最快）：

```bash
# 本地修改 prisma/schema.prisma 后，直接推到 Supabase（走 DIRECT_URL 会话池器）
pnpm prisma:push
```

Vercel **构建过程不碰数据库**（所有页面均为 `force-dynamic`，无构建期查询），所以迁移不需要进 CI。将来多人协作/需要回滚时，再切换到正式迁移流：

```bash
npx prisma migrate dev --name init        # 本地生成 migrations/（需配置 shadow database）
git commit && git push                     # Vercel 构建命令改为：
# "prisma migrate deploy && next build"    # 部署时自动应用未执行的迁移
```

Supabase 使用 `migrate dev` 需要一个 shadow database（Supabase 后台建一个空库，填入 `SHADOW_DATABASE_URL`）。

## 六、常见坑排查清单

| 症状 | 原因 | 解决 |
| --- | --- | --- |
| `redirect_uri_mismatch` | GitHub 回调地址与实际域名不一致 | 逐字符核对协议/域名/路径 |
| 登录后跳回登录页、`NO_SECRET` 报错 | 生产未配 `NEXTAUTH_SECRET` | Vercel 添加并 Redeploy |
| 改了环境变量没生效 | Vercel 环境变量修改不触发重部署 | Deployments → 最新一次 → **Redeploy** |
| `Can't reach database server` | 用了直连（5432/无池器）或 Supabase 项目暂停 | 运行时用 6543 事务池器 + `pgbouncer=true`；Supabase 后台确认项目 Active |
| CORS 报错 | 前后端不同域调用 API | 本项目前后端同源（Next.js 一体），不应出现；若出现说明 `NEXTAUTH_URL` 填错 |
| OAuth 回调 500 + `linkAccount` | GitHub 令牌字段与表结构不匹配 | 确认 `Account` 模型含 `refresh_token_expires_in Int?` |
| 构建时查数据库报错 | 页面在构建期被静态化 | 所有查库的 GET 页面保持 `export const dynamic = "force-dynamic"` |
| 本地正常、线上 500 | 本地 `.env.local` 里有本地专属变量（如 `OAUTH_PROXY_URL`）泄漏到 Vercel | Vercel 只保留上表所列变量 |

## 七、上线后验收清单

- [ ] 打开首页/博客广场正常渲染
- [ ] GitHub 登录 → 落地 `/u/用户名`
- [ ] 注册新账号 → 收到真实邮件（Resend）→ 激活 → 密码登录
- [ ] 写文章 → 发布 → 出现在博客广场与好友动态
- [ ] `/api/feed/用户名` 能被 RSS 阅读器订阅
- [ ] 手机浏览器访问 → 「添加到主屏幕」可安装 PWA
