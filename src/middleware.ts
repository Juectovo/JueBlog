import { withAuth } from "next-auth/middleware";

/**
 * 路由保护中间件（Edge Runtime）
 * 注意：这里不能引入 authOptions / prisma（含 Node 专用依赖），
 * withAuth 默认走 JWT 校验，与 lib/auth.ts 的会话策略一致。
 */

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  // 写作后台 / 好友页 / 账号设置需要登录；后续新增受保护页面时在此追加
  matcher: ["/write/:path*", "/settings/:path*", "/friends"],
};
