import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GitHubProvider from "next-auth/providers/github";
import { z } from "zod";
import { fetch as undiciFetch, ProxyAgent } from "undici";

import { sendMagicLinkEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { ensureProfile } from "@/lib/profile";

/**
 * GitHub API 请求器
 * 配置 OAUTH_PROXY_URL 时优先走本地代理（国内直连时灵时不灵），
 * 代理不可用（客户端没开）时自动回退直连，两种环境都能工作。
 * 用 undici 的 ProxyAgent 作为 fetch dispatcher —— 它不依赖 Node http.Agent
 * 的类继承，不会被 webpack 打包破坏（https-proxy-agent 打包后会报
 * "this.getName is not a function"，故弃用）。
 */
const githubProxyDispatcher = process.env.OAUTH_PROXY_URL
  ? new ProxyAgent(process.env.OAUTH_PROXY_URL)
  : undefined;

async function githubFetch(url: string, init: Parameters<typeof undiciFetch>[1] = {}) {
  const dispatchers: (ProxyAgent | undefined)[] = githubProxyDispatcher
    ? [githubProxyDispatcher, undefined]
    : [undefined];

  let lastError: unknown;
  for (const dispatcher of dispatchers) {
    try {
      return await undiciFetch(url, {
        ...init,
        dispatcher,
        signal: AbortSignal.timeout(20_000),
      });
    } catch (err) {
      // 网络层失败（连接拒绝/超时）才尝试下一条链路
      lastError = err;
    }
  }
  throw lastError;
}

/** 邮箱密码登录的凭据校验 */
const credentialsSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1),
});

/**
 * JueBlog 认证配置（NextAuth v4）
 *
 * 会话策略统一为 JWT：
 * - Credentials Provider 不支持数据库会话，JWT 是三种登录方式共存的唯一解
 * - Adapter 仍然生效：负责 User / Account / VerificationToken 的持久化
 *
 * 登录成功统一跳转 /welcome，由该页读取 session.user.username 后
 * 再跳转到个人主页 /u/[username]
 */
export const authOptions: NextAuthOptions = {
  // 持久化：用户 / OAuth 绑定 / 邮箱令牌 写入 PostgreSQL
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },

  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=sent", // 魔法链接发送后的提示
    error: "/login", // 登录错误统一回登录页，由页面读取 ?error= 展示
  },

  providers: [
    // —— GitHub OAuth ——
    // 未配置环境变量时不注册该 Provider，保证本地裸启动（只测邮箱登录）不报错
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
            // 同一邮箱自动关联已有账号：GitHub 侧只取已验证邮箱（见 userinfo），
            // 注册流程也验证过邮箱所有权，自动关联安全
            allowDangerousEmailAccountLinking: true,

            // —— 自定义 token 交换：fetch + 代理，绕开 openid-client 的 HTTP 层 ——
            token: {
              request: async ({ provider, params }) => {
                const res = await githubFetch(
                  "https://github.com/login/oauth/access_token",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Accept: "application/json",
                    },
                    body: JSON.stringify({
                      client_id: provider.clientId,
                      client_secret: provider.clientSecret,
                      code: String(params.code ?? ""),
                    }),
                  }
                );
                const data = (await res.json()) as {
                  access_token?: string;
                  error?: string;
                  error_description?: string;
                };
                if (!res.ok || !data.access_token) {
                  throw new Error(
                    data.error_description ??
                      data.error ??
                      `GitHub token 交换失败（HTTP ${res.status}）`
                  );
                }
                return { tokens: data };
              },
            },

            // —— 自定义用户信息拉取：私密邮箱时从 /user/emails 补主邮箱 ——
            userinfo: {
              request: async ({ tokens }) => {
                const headers = {
                  Authorization: `Bearer ${String(tokens.access_token ?? "")}`,
                  Accept: "application/vnd.github+json",
                  "User-Agent": "JueBlog",
                };
                const [userRes, emailsRes] = await Promise.all([
                  githubFetch("https://api.github.com/user", { headers }),
                  githubFetch("https://api.github.com/user/emails", { headers }),
                ]);
                if (!userRes.ok) {
                  throw new Error(`GitHub 用户信息拉取失败（HTTP ${userRes.status}）`);
                }
                const user = (await userRes.json()) as {
                  id: number;
                  login: string;
                  name: string | null;
                  email: string | null;
                  avatar_url: string;
                };

                let email = user.email;
                if (!email && emailsRes.ok) {
                  const emails = (await emailsRes.json()) as {
                    email: string;
                    primary: boolean;
                    verified: boolean;
                  }[];
                  email =
                    emails.find((e) => e.primary && e.verified)?.email ??
                    emails.find((e) => e.verified)?.email ??
                    null;
                }

                // 直接返回归一化结构（Profile 形状），配合下方 profile() 透传
                return {
                  id: String(user.id),
                  name: user.name ?? user.login,
                  email: email ?? undefined,
                  image: user.avatar_url,
                };
              },
            },

            // userinfo.request 已返回归一化结构，这里直接映射为 User
            profile(profile) {
              const p = profile as unknown as {
                id: string;
                name?: string;
                email?: string | null;
                image?: string;
              };
              return { id: p.id, name: p.name, email: p.email, image: p.image };
            },
          }),
        ]
      : []),

    // —— 邮箱魔法链接（Resend 发信，开发模式打印到控制台）——
    EmailProvider({
      from: process.env.EMAIL_FROM ?? "JueBlog <noreply@jueblog.com>",
      maxAge: 60 * 60, // 链接 1 小时有效
      sendVerificationRequest: async ({ identifier, url }) => {
        await sendMagicLinkEmail(identifier, url);
      },
    }),

    // —— 邮箱 + 密码（bcrypt；仅限已验证邮箱的注册用户）——
    CredentialsProvider({
      name: "邮箱密码",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        // OAuth / 纯魔法链接用户没有密码：与「密码错误」返回一致，避免账号探测
        if (!user?.passwordHash) return null;

        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        // 必须先完成注册时的邮箱验证
        if (!user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // user 仅在「刚完成登录」时存在，这里做一次性的登录后处理
      if (user) {
        token.id = user.id;
        token.picture = user.image ?? token.picture;

        // 通过魔法链接登录本身即完成邮箱所有权验证
        // （emailVerified 仅存在于 AdapterUser，Credentials 返回的 User 没有该字段）
        if (
          account?.provider === "email" &&
          "emailVerified" in user &&
          !user.emailVerified
        ) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }

        // GitHub / 魔法链接首次登录时自动创建 Profile（分配 username）
        await ensureProfile({ userId: user.id, email: user.email, name: user.name });

        const profile = await prisma.profile.findUnique({
          where: { userId: user.id },
        });
        token.username = profile?.username ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        // 把数据库用户 ID 与博客域名 username 注入会话
        session.user.id = token.id ?? "";
        session.user.username = token.username ?? null;
      }
      return session;
    },

    // 防开放重定向：只允许同源绝对地址与站内相对地址
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return url;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // 非法 URL，落到默认
      }
      return baseUrl;
    },
  },
};

/** 服务端获取会话的统一入口（API 路由 / Server Components 共用） */
export function getAuthSession() {
  return getServerSession(authOptions);
}
