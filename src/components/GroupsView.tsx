"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import type { GroupCard } from "@/types/api";

/**
 * 群组页视图：左侧我的群组（Discord 风格紧凑栏）+ 右侧公开群组广场
 */
export function GroupsView() {
  const [mine, setMine] = useState<GroupCard[] | null>(null);
  const [publicGroups, setPublicGroups] = useState<GroupCard[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  function load() {
    api<{ items: GroupCard[] }>("/api/groups?scope=mine")
      .then((d) => setMine(d.items))
      .catch(() => setMine([]));
    api<{ items: GroupCard[] }>("/api/groups?scope=public")
      .then((d) => setPublicGroups(d.items))
      .catch(() => setPublicGroups([]));
  }

  useEffect(load, []);

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* 左侧：我的群组（Discord 风格紧凑列表） */}
      <aside className="w-full shrink-0 lg:w-56">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">我的群组</p>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCreateOpen(true)} aria-label="创建群组">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {mine === null ? (
          <p className="py-4 text-center text-xs text-muted-foreground">加载中…</p>
        ) : mine.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            还没加入任何群组
          </p>
        ) : (
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {mine.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="flex shrink-0 items-center gap-2.5 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-xs font-semibold">
                  {g.name.charAt(0)}
                </span>
                <span className="hidden truncate lg:block">{g.name}</span>
              </Link>
            ))}
          </nav>
        )}
      </aside>

      {/* 右侧：公开群组广场 */}
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">公开群组</h2>
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> 创建群组
          </Button>
        </div>

        {publicGroups === null ? (
          <p className="py-16 text-center text-sm text-muted-foreground">加载中…</p>
        ) : publicGroups.length === 0 ? (
          <EmptyState
            icon={Users}
            title="还没有公开群组"
            description="创建第一个群组，把写相同主题的朋友圈起来。"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {publicGroups.map((g) => (
              <GroupCardItem key={g.id} group={g} />
            ))}
          </div>
        )}
      </div>

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => load()}
      />
    </div>
  );
}

function GroupCardItem({ group }: { group: GroupCard }) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="group block rounded-lg border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/40"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-sm font-semibold text-foreground">
          {group.name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{group.name}</p>
          <p className="text-xs text-muted-foreground">{group.memberCount} 位成员</p>
        </div>
      </div>
      {group.description && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {group.description}
        </p>
      )}
    </Link>
  );
}

/** 创建群组对话框 */
function CreateGroupDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name.trim()) return setError("请输入群组名");
    setLoading(true);
    try {
      const group = await api<GroupCard>("/api/groups", {
        method: "POST",
        body: { name: name.trim(), description: description.trim() || undefined, visibility },
      });
      onOpenChange(false);
      setName("");
      setDescription("");
      onCreated();
      window.location.href = `/groups/${group.id}`;
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "创建失败，请稍后重试");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setError(null);
      }}
    >
      <DialogContent>
        <DialogTitle>创建群组</DialogTitle>
        <DialogDescription>创建后你将成为群主，可以邀请朋友一起写。</DialogDescription>

        <div className="mt-6 space-y-4">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="群组名（如：写字的人）" />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="群组简介（可选）"
          />
          <div className="flex gap-2">
            {(["PUBLIC", "PRIVATE"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVisibility(v)}
                className={`flex-1 rounded-md border px-3 py-2 text-xs transition-colors ${
                  visibility === v
                    ? "border-brand/60 bg-brand/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "PUBLIC" ? "公开 · 任何人可加入" : "私密 · 仅受邀可见内容"}
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={submit} disabled={loading}>
            {loading ? "创建中…" : "创建"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
