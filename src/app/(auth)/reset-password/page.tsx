"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const invalidLink = !token || !email;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) return setError("两次输入的密码不一致");
    const pwdError = checkPasswordStrength(password);
    if (pwdError) return setError(pwdError);

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setDone(true);
        return;
      }
      setError(data.error ?? "重置失败，请稍后重试");
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>密码已重置</CardTitle>
          <CardDescription>现在可以使用新密码登录了</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login?reset=1"
            className={cn(buttonVariants(), "w-full")}
          >
            前往登录
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>设置新密码</CardTitle>
        <CardDescription>
          {invalidLink ? "链接无效" : `为 ${email} 设置新密码`}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {invalidLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              重置链接无效或已缺失参数，请重新发起找回密码流程。
            </p>
            <Link
              href="/forgot-password"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              重新找回密码
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="space-y-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="至少 8 位，包含字母和数字"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">确认新密码</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="再次输入新密码"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "提交中…" : "重置密码"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </motion.div>
  );
}
