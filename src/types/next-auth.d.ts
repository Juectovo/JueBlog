import type { DefaultSession } from "next-auth";

/**
 * NextAuth 类型扩充：把 JueBlog 的身份字段注入 Session / JWT
 */

declare module "next-auth" {
  interface Session {
    user: {
      /** 数据库用户 ID（cuid） */
      id: string;
      /** 博客域名 username.jueblog.com 的子域部分，可能尚未生成 */
      username: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string | null;
  }
}
