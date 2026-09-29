"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { checkPasswordStrength } from "@/lib/validators";

/**
 * 注册页：邮箱 + 密码
 * 成功后进入「验证邮件已发送」状态，点击邮件链接完成激活
 */
export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // 客户端即时校验（服务端 register API 还有同口径的权威校验）
    if (!email.trim()) return setError("请输入邮箱");
    const pwdError = checkPasswordStrength(password);
    if (pwdError) return setError(pwdError);

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 201) {
        setDone(email.trim());
        // 开发模式（未配置邮件服务）：后端把验证链接直接返回，点击即可完成验证
        setDevVerifyUrl(data.devVerifyUrl ?? null);
        return;
      }
      setError(data.error ?? "注册失败，请稍后重试");
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle>验证邮件已发送</CardTitle>
            <CardDescription>
              我们已向 {done} 发送验证邮件，请查收并点击邮件中的链接完成激活。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground">
              验证邮件已发送至 <span className="font-medium">{done}</span>，请查收并点击邮件中的链接完成激活。
            </p>
            {devVerifyUrl && (
              <div className="mt-4 rounded-md border border-brand/40 bg-brand/5 p-3">
                <p className="text-xs text-muted-foreground">
                  开发模式（未配置邮件服务）：点击下方链接完成验证
                </p>
                <a
                  href={devVerifyUrl}
                  className="mt-2 block break-all text-xs text-brand underline underline-offset-4"
                >
                  {devVerifyUrl}
                </a>
              </div>
            )}
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              验证完成后即可使用密码或魔法链接登录。没收到？检查一下垃圾邮件箱，
              或{" "}
              <Link href="/register" className="transition-colors hover:text-foreground">
                重新注册
              </Link>
              。
            </p>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline" }), "mt-6 w-full")}
            >
              返回登录
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle>创建 JueBlog 账号</CardTitle>
          <CardDescription>
            注册后自动获得 username.jueblog.com 个人博客域名
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-xs text-red-400">{error}</p>}

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

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="8-16 位，需包含字母和数字"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                密码规则与 QQ 一致：8-16 位，需同时包含字母和数字。注册后可在「设置」中修改。
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "注册中…" : "注册"}
            </Button>

            <p className="text-center text-xs">
              <Link
                href="/login"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                已有账号？登录 →
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
