"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarHeart, Check, MessageSquareText, Search, UserPlus, X } from "lucide-react";

import { BlogCard } from "@/components/BlogCard";
import { EmptyState } from "@/components/EmptyState";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";
import type { FriendCard, IncomingFriendRequest, PostCard } from "@/types/api";

/**
 * 好友页：好友卡片列表 + 动态 Feed + 收到的好友申请 + 添加好友
 */
export function FriendsView({ meName, meImage }: { meName?: string | null; meImage?: string | null }) {
  const [friends, setFriends] = useState<FriendCard[] | null>(null);
  const [requests, setRequests] = useState<IncomingFriendRequest[]>([]);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const loadFriends = useCallback(async () => {
    setFriends((await api<{ items: FriendCard[] }>("/api/friends")).items);
  }, []);

  useEffect(() => {
    loadFriends().catch(() => setFriends([]));
    api<{ items: IncomingFriendRequest[] }>("/api/friends/requests")
      .then((d) => setRequests(d.items))
      .catch(() => setRequests([]));
  }, [loadFriends]);

  const filtered = (friends ?? []).filter((f) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (f.name ?? "").toLowerCase().includes(q) ||
      (f.username ?? "").toLowerCase().includes(q) ||
      (f.bio ?? "").toLowerCase().includes(q)
    );
  });

  async function accept(id: string) {
    await api("/api/friends/accept", { method: "POST", body: { requestId: id } });
    setRequests((prev) => prev.filter((r) => r.id !== id));
    loadFriends().catch(() => {});
  }

  async function decline(id: string) {
    await api(`/api/friends/requests/${id}`, { method: "DELETE" });
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  async function removeFriend(f: FriendCard) {
    if (!window.confirm(`确定删除好友 ${f.name ?? f.username} 吗？`)) return;
    await api(`/api/friends/${f.id}`, { method: "DELETE" });
    setFriends((prev) => (prev ?? []).filter((x) => x.id !== f.id));
  }

  return (
    <div className="space-y-8">
      {/* 收到的好友申请 */}
      {requests.length > 0 && (
        <section className="rounded-lg border border-brand/40 bg-card p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <UserPlus className="h-4 w-4 text-brand" /> 收到的好友申请
          </p>
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3">
                <Link href={`/u/${r.requester.username}`} className="flex min-w-0 items-center gap-3">
                  <UserAvatar name={r.requester.name ?? "?"} image={r.requester.image} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{r.requester.name ?? r.requester.username}</p>
                    <p className="truncate text-xs text-muted-foreground">@{r.requester.username}</p>
                  </div>
                </Link>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" onClick={() => accept(r.id)}>
                    <Check className="mr-1 h-3.5 w-3.5" /> 接受
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => decline(r.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 工具行：搜索 + 添加好友 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索好友（昵称 / 用户名 / 简介）"
            className="pl-9"
          />
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="mr-1.5 h-4 w-4" /> 添加好友
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">好友 {friends ? friends.length : ""}</TabsTrigger>
          <TabsTrigger value="feed">好友动态</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {friends === null ? (
            <p className="py-16 text-center text-sm text-muted-foreground">加载中…</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title={query ? "没有匹配的好友" : "还没有好友"}
              description="通过用户名添加好友，之后就能在动态流里看到 TA 的新文章。"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((f) => (
                <div
                  key={f.id}
                  className="group relative flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/40"
                >
                  <Link href={`/u/${f.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <UserAvatar name={f.name ?? f.username ?? "?"} image={f.image} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{f.name ?? f.username}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{f.username} · {f.friendsSince.slice(0, 10)} 成为好友
                      </p>
                      {f.bio && <p className="mt-1 truncate text-xs text-muted-foreground">{f.bio}</p>}
                    </div>
                  </Link>
                  <button
                    onClick={() => removeFriend(f)}
                    aria-label="删除好友"
                    className="absolute right-3 top-3 hidden text-muted-foreground transition-colors hover:text-red-400 group-hover:block"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feed">
          <Feed />
        </TabsContent>
      </Tabs>

      <AddFriendDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

/** 好友动态流（JueBlog Feed） */
function Feed() {
  const [posts, setPosts] = useState<PostCard[] | null>(null);

  useEffect(() => {
    api<{ items: PostCard[] }>("/api/friends/feed")
      .then((d) => setPosts(d.items))
      .catch(() => setPosts([]));
  }, []);

  if (posts === null) {
    return <p className="py-16 text-center text-sm text-muted-foreground">加载中…</p>;
  }
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="好友的动态会出现在这里"
        description="当好友发布公开文章时，你会在第一时间看到。"
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {posts.map((post) => (
        <BlogCard key={post.id} post={post} />
      ))}
    </div>
  );
}

/** 添加好友对话框：按用户名申请 */
function AddFriendDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [username, setUsername] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!username.trim()) return setError("请输入对方的用户名");
    setState("loading");
    try {
      await api("/api/friends/request", {
        method: "POST",
        body: { username: username.trim() },
      });
      setState("done");
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "发送失败，请稍后重试");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setUsername("");
          setState("idle");
          setError(null);
        }
      }}
    >
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <CalendarHeart className="h-4 w-4 text-brand" /> 添加好友
        </DialogTitle>
        <DialogDescription>输入对方的 JueBlog 用户名（@后面的部分）发送申请</DialogDescription>

        {state === "done" ? (
          <p className="mt-6 text-sm text-foreground">申请已发送，等对方通过后你们就是好友啦。</p>
        ) : (
          <div className="mt-6 space-y-4">
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例如：jue"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <Button className="w-full" onClick={submit} disabled={state === "loading"}>
              {state === "loading" ? "发送中…" : "发送申请"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
