"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Share2 } from "lucide-react";

import { BlogCard } from "@/components/BlogCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import type { GroupWallItem, PostCard } from "@/types/api";

/**
 * 群组文章墙：墙文时间线 + 「分享我的文章」对话框（成员可用）
 */
export function GroupWall({
  groupId,
  initialItems,
  canShare,
}: {
  groupId: string;
  initialItems: GroupWallItem[];
  canShare: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div>
      {canShare && (
        <div className="mb-5 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
            <Share2 className="mr-1.5 h-3.5 w-3.5" /> 分享文章到群组
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="墙上还很安静"
          description="群组成员可以把自己在 JueBlog 发表的公开文章分享到这里。"
        />
      ) : (
        <div className="space-y-6">
          {items.map((item) => (
            <div key={item.id}>
              <p className="mb-2 text-xs text-muted-foreground">
                <span className="text-foreground">{item.sharedBy.name ?? "成员"}</span> 分享于{" "}
                {item.sharedAt.slice(0, 10)}
              </p>
              <BlogCard post={item.post} />
            </div>
          ))}
        </div>
      )}

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        groupId={groupId}
        onShared={(item) => {
          setItems((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
          setShareOpen(false);
        }}
      />
    </div>
  );
}

/** 分享对话框：列出我的公开文章供选择 */
function ShareDialog({
  open,
  onOpenChange,
  groupId,
  onShared,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groupId: string;
  onShared: (item: GroupWallItem) => void;
}) {
  const router = useRouter();
  const [posts, setPosts] = useState<PostCard[] | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      api<{ items: PostCard[] }>("/api/posts?mine=1&status=PUBLIC&pageSize=50")
        .then((d) => setPosts(d.items))
        .catch(() => setPosts([]));
    }
  }, [open]);

  async function share(post: PostCard) {
    setError(null);
    setSharingId(post.id);
    try {
      const item = await api<GroupWallItem>(`/api/groups/${groupId}/share`, {
        method: "POST",
        body: { postId: post.id },
      });
      onShared(item);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "分享失败，请稍后重试");
    } finally {
      setSharingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>分享文章到群组</DialogTitle>
        <DialogDescription>选择一篇你的公开文章，它会出现在群组文章墙上</DialogDescription>

        <div className="mt-5 max-h-[45vh] space-y-2 overflow-y-auto">
          {error && <p className="text-xs text-red-400">{error}</p>}
          {posts === null ? (
            <p className="py-8 text-center text-xs text-muted-foreground">加载中…</p>
          ) : posts.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              你还没有公开文章，先去写一篇吧
            </p>
          ) : (
            posts.map((post) => (
              <button
                key={post.id}
                onClick={() => share(post)}
                disabled={sharingId !== null}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-left transition-colors hover:border-foreground/40 disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground">{post.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {post.publishedAt?.slice(0, 10)} · {post.likeCount} 赞
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {sharingId === post.id ? "分享中…" : "分享"}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
