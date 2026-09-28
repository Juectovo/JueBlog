"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Search, User } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/UserAvatar";
import { api } from "@/lib/api-client";
import type { SearchResults } from "@/types/api";

/**
 * 全局搜索对话框（Cmd+K / Ctrl+K 唤起）
 * 文章 → 详情页；用户 → 个人主页
 */
export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>({ posts: [], users: [] });
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults({ posts: [], users: [] });
    }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) {
      setResults({ posts: [], users: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        setResults(await api<SearchResults>(`/api/search?q=${encodeURIComponent(q.trim())}`));
      } catch {
        setResults({ posts: [], users: [] });
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [q]);

  function go(path: string) {
    onOpenChange(false);
    router.push(path);
  }

  const empty = !results.posts.length && !results.users.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-24 translate-y-0 gap-0 p-0">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索文章 / 用户…"
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {loading && <p className="px-3 py-6 text-center text-xs text-muted-foreground">搜索中…</p>}

          {!loading && q.trim() && empty && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">没有找到相关内容</p>
          )}

          {results.posts.map((post) => (
            <button
              key={post.id}
              onClick={() => go(`/posts/${post.id}`)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate text-sm text-foreground">{post.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {post.author.name ?? post.author.username}
                </span>
              </span>
            </button>
          ))}

          {results.users.map((user) => (
            <button
              key={user.id}
              onClick={() => go(`/u/${user.username}`)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
            >
              <UserAvatar name={user.name ?? user.username ?? "?"} image={user.image} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm text-foreground">{user.name ?? user.username}</span>
                <span className="block truncate text-xs text-muted-foreground">@{user.username}</span>
              </span>
            </button>
          ))}

          {!q.trim() && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              输入关键词开始搜索 · <kbd className="rounded border border-border px-1">Esc</kbd> 关闭
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
