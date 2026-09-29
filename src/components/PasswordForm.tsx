"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkPasswordStrength } from "@/lib/validators";
import { api } from "@/lib/api-client";

/**
 * 设置 / 修改密码
 * - 已设过密码：需输入当前密码
 * - 未设过密码（GitHub / 魔法链接用户）：直接设置
 */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    setMessage(null);
    if (hasPassword && !current) return setMessage({ ok: false, text: "请输入当前密码" });
    const strengthError = checkPasswordStrength(next);
    if (strengthError) return setMessage({ ok: false, text: strengthError });
    if (next !== confirm) return setMessage({ ok: false, text: "两次输入的密码不一致" });

    setLoading(true);
    try {
      await api<{ message: string }>("/api/auth/change-password", {
        method: "POST",
        body: { currentPassword: hasPassword ? current : undefined, newPassword: next },
      });
      setMessage({ ok: true, text: hasPassword ? "密码已修改" : "密码已设置，之后可以用邮箱 + 密码登录" });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "操作失败" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {hasPassword && (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">当前密码</span>
          <Input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>
      )}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">
          {hasPassword ? "新密码" : "设置密码"}
        </span>
        <Input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="8-16 位，需包含字母和数字"
          autoComplete="new-password"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-foreground">确认新密码</span>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="再次输入新密码"
          autoComplete="new-password"
        />
      </label>

      <div className="flex items-center gap-4">
        <Button onClick={submit} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="mr-2 h-4 w-4" />
          )}
          {hasPassword ? "修改密码" : "设置密码"}
        </Button>
        {message && (
          <p className={`text-xs ${message.ok ? "text-brand" : "text-red-400"}`}>{message.text}</p>
        )}
      </div>
    </div>
  );
}
