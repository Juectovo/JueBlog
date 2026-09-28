"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Github } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** NextAuth 错误码 → 中文提示 */
const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "邮箱或密码不正确",
  EMAIL_NOT_VERIFIED: "请先通过邮件验证邮箱，再使用密码登录",
  EmailSignin: "邮件发送失败，请检查邮箱地址",
  OAuthAccountNotLinked: "该邮箱已绑定其他登录方式，请先用对应方式登录",
  Verification: "验证链接无效或已过期，请重新发起登录",
  OAuthSignin: "GitHub 登录发起失败，请重试",
  OAuthCallback: "GitHub 回调失败，请重试",
  Callback: "登录回调失败，请重试",
  AccessDenied: "登录被拒绝",
  invalid_token: "链接无效，请重新操作",
  token_expired: "链接已过期，请重新操作",
};

type LoginMode = "magic" | "password";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<LoginMode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL 回跳带来的流程提示（注册验证 / 密码重置 / 魔法链接已发送）
  const errorCode = searchParams.get("error");
  const urlError = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? "登录失败，请重试")
    : null;
  const notice =
    searchParams.get("verified") === "1"
      ? "邮箱验证成功，现在可以登录了"
      : searchParams.get("verify") === "sent"
        ? "验证邮件已发送，请查收后点击链接完成登录"
        : searchParams.get("reset") === "1"
          ? "密码已重置，请使用新密码登录"
          : null;

  /** GitHub OAuth：整页跳转，成功后经 /welcome 进入个人主页 */
  async function handleGitHub() {
    setError(null);
    setLoading(true);
    await signIn("github", { callbackUrl: "/welcome" });
  }

  /** 魔法链接：发送后 NextAuth 跳到 verifyRequest（/login?verify=sent） */
  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("请输入邮箱");

    setLoading(true);
    await signIn("email", { email: email.trim(), callbackUrl: "/welcome" });
    setLoading(false);
  }

  /** 邮箱 + 密码：无刷新登录，成功后进入 /welcome 再跳个人主页 */
  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError("请输入邮箱和密码");

    setLoading(true);
    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    setLoading(false);

    if (res?.error) {
      setError(ERROR_MESSAGES[res.error] ?? "登录失败，请重试");
      return;
    }
    router.push("/welcome");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card>
        <CardHeader className="text-center">
          <CardTitle>登录 JueBlog</CardTitle>
          <CardDescription>写下来，连起来，然后有了归属。</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {notice && (
            <p className="rounded-md border border-border bg-background px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {notice}
            </p>
          )}
          {urlError && <p className="text-xs text-red-400">{urlError}</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGitHub}
            disabled={loading}
          >
            <Github className="h-4 w-4" /> 使用 GitHub 继续
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            或
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* 登录方式切换 */}
          <div className="grid grid-cols-2 gap-1 rounded-md border border-border p-1">
            {(
              [
                ["magic", "魔法链接"],
                ["password", "密码登录"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
                className={`rounded-sm px-3 py-1.5 text-xs transition-colors ${
                  mode === value
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "magic" ? (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "发送中…" : "发送魔法链接"}
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                我们会向你的邮箱发送一封含登录链接的邮件，链接 1 小时内有效。
              </p>
              <p className="text-center text-xs">
                <Link
                  href="/register"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  还没有账号？注册 →
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handlePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password-email">邮箱</Label>
                <Input
                  id="password-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "登录中…" : "登录"}
              </Button>
              <div className="flex justify-between text-xs">
                <Link
                  href="/forgot-password"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  忘记密码？
                </Link>
                <Link
                  href="/register"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  注册账号 →
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
