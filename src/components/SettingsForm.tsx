"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import type { MyProfile } from "@/types/api";

/**
 * 账号设置页：编辑昵称 / 用户名 / 简介 / 头像链接 / 社交链接
 */
export function SettingsForm({ profile }: { profile: MyProfile }) {
  const [form, setForm] = useState({
    name: profile.name ?? "",
    username: profile.username,
    bio: profile.bio ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    website: profile.website ?? "",
    github: profile.github ?? "",
    twitter: profile.twitter ?? "",
    location: profile.location ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    setMessage(null);
    setLoading(true);
    try {
      const updated = await api<MyProfile>("/api/users/me", { method: "PATCH", body: form });
      setForm({
        name: updated.name ?? "",
        username: updated.username,
        bio: updated.bio ?? "",
        avatarUrl: updated.avatarUrl ?? "",
        website: updated.website ?? "",
        github: updated.github ?? "",
        twitter: updated.twitter ?? "",
        location: updated.location ?? "",
      });
      setMessage({ ok: true, text: "已保存" });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "保存失败" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <UserAvatar name={form.name || profile.username} image={form.avatarUrl || null} size="lg" />
        <div>
          <p className="text-sm font-medium text-foreground">{form.name || profile.username}</p>
          <p className="text-xs text-muted-foreground">@{form.username}.jueblog.com</p>
        </div>
      </div>

      <Field label="昵称">
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="你的昵称" />
      </Field>

      <Field label="用户名" hint="博客域名的一部分：username.jueblog.com，仅小写字母/数字/连字符">
        <Input value={form.username} onChange={(e) => set("username", e.target.value)} />
      </Field>

      <Field label="简介">
        <Textarea
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          placeholder="一句话介绍自己"
          className="min-h-[64px]"
        />
      </Field>

      <Field label="头像 URL" hint="留空则显示首字母头像">
        <Input value={form.avatarUrl} onChange={(e) => set("avatarUrl", e.target.value)} placeholder="https://…" />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="个人网站">
          <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="所在地">
          <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="如：Shanghai" />
        </Field>
        <Field label="GitHub 链接">
          <Input value={form.github} onChange={(e) => set("github", e.target.value)} placeholder="https://github.com/…" />
        </Field>
        <Field label="X (Twitter) 链接">
          <Input value={form.twitter} onChange={(e) => set("twitter", e.target.value)} placeholder="https://x.com/…" />
        </Field>
      </div>

      <div className="flex items-center gap-4">
        <Button onClick={submit} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          保存
        </Button>
        {message && (
          <p className={`text-xs ${message.ok ? "text-brand" : "text-red-400"}`}>{message.text}</p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
