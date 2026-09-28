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

/**
 * 忘记密码：提交邮箱 → /api/auth/forgot-password 发送重置邮件
 * 接口对「邮箱是否存在」返回统一文案，页面同样不做区分
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("请输入邮箱");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        setError("请求失败，请稍后重试");
        return;
      }
      setDone(true);
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle>找回密码</CardTitle>
          <CardDescription>
            输入注册邮箱，我们会发送重置链接（1 小时内有效）
          </CardDescription>
        </CardHeader>

        <CardContent>
          {done ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                如果该邮箱已注册，重置链接已发送。请查收邮件并按指引设置新密码。
              </p>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                返回登录
              </Link>
            </div>
          ) : (
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "发送中…" : "发送重置链接"}
              </Button>

              <p className="text-center text-xs">
                <Link
                  href="/login"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  ← 返回登录
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
