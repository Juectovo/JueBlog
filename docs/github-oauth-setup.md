# GitHub OAuth App 申请步骤（JueBlog）

> 目标：拿到 `GITHUB_ID`（Client ID）与 `GITHUB_SECRET`（Client Secret），
> 填入 `.env.local` 后 JueBlog 即可使用「使用 GitHub 继续」按钮登录。

## 一、创建 OAuth App

1. 登录 GitHub，点击右上角头像 → **Settings**；
2. 左侧栏最底部点击 **Developer settings**；
3. 选择 **OAuth Apps** → 点击 **New OAuth App**（或直接访问 `https://github.com/settings/developers`）；
4. 在 **Register a new OAuth application** 表单中填写：

| 表单项 | 填写内容 | 说明 |
| --- | --- | --- |
| Application name | `JueBlog` | 用户授权页会显示这个名字 |
| Homepage URL | `http://localhost:3000` | 本地开发填这个；上线后改为 `https://jueblog.com` |
| Application description | `JueBlog — 个人博客与好友互联平台` | 选填 |
| **Authorization callback URL** | `http://localhost:3000/api/auth/callback/github` | **必须与下一节的 Callback 完全一致**，否则报 `redirect_uri_mismatch` |

5. 点击 **Register application** 完成创建。

## 二、获取密钥

1. 创建成功后进入 App 详情页，**Client ID** 就在页面上方 → 复制为 `GITHUB_ID`；
2. 点击 **Generate a new client secret**，输入 GitHub 密码确认；
3. 页面会显示一次 **Client Secret**（离开页面后不可再查看）→ 立即复制为 `GITHUB_SECRET`；
4. 写入 `F:\JueBlog\.env.local`：

```bash
GITHUB_ID="Iv1.xxxxxxxxxxxxxxxx"
GITHUB_SECRET="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

> 密钥泄露时：回到 App 详情页 → **Delete** 掉旧 secret → 重新生成即可。

## 三、本地验证

```bash
pnpm dev
# 访问 http://localhost:3000/login → 点击「使用 GitHub 继续」
# 首次会跳到 GitHub 授权页，点击 Authorize JueBlog 后回到 /welcome，
# 再自动跳转到你的个人主页 /u/[username]
```

## 四、上线（生产环境）

1. 回到同一个 OAuth App → **Edit**：
   - Homepage URL 改为 `https://jueblog.com`；
   - **Authorization callback URL** 改为 `https://jueblog.com/api/auth/callback/github`；
2. 在 Vercel 项目的 Environment Variables 中配置：
   - `NEXTAUTH_URL` = `https://jueblog.com`
   - `NEXTAUTH_SECRET` = 新生成的随机串（`openssl rand -base64 32`，不要复用本地值）
   - `GITHUB_ID` / `GITHUB_SECRET`（同上）
   - `DATABASE_URL` / `RESEND_API_KEY` / `EMAIL_FROM`
3. 重新部署生效。

## 五、常见报错

| 报错 | 原因 | 处理 |
| --- | --- | --- |
| `redirect_uri_mismatch` | Callback URL 与 GitHub 后台不一致 | 逐字符核对协议（https/http）、域名、路径 |
| 登录后 404 | 回调到了不存在的页面 | 确认 `/welcome` 路由存在（本仓库已内置） |
| `The redirect_uri is not associated...` | 用了另一个 OAuth App 的密钥 | 确认 GITHUB_ID 与 GITHUB_SECRET 来自同一个 App |
