"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Heart } from "lucide-react";

import { ApiError, api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * 文章互动按钮：点赞（带计数）/ 收藏 —— 乐观更新，失败回滚
 */
export function PostActions({
  postId,
  liked,
  bookmarked,
  likeCount,
}: {
  postId: string;
  liked: boolean;
  bookmarked: boolean;
  likeCount: number;
}) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(liked);
  const [count, setCount] = useState(likeCount);
  const [isBookmarked, setIsBookmarked] = useState(bookmarked);
  const [busy, setBusy] = useState(false);

  function guard401(err: unknown, revert: () => void) {
    if (err instanceof ApiError && err.status === 401) {
      router.push("/login");
      return;
    }
    revert();
  }

  async function toggleLike() {
    const prev = { liked: isLiked, count };
    setIsLiked(!prev.liked);
    setCount(prev.count + (prev.liked ? -1 : 1));
    setBusy(true);
    try {
      const data = await api<{ liked: boolean; likeCount: number }>(`/api/posts/${postId}/like`, {
        method: "POST",
      });
      setIsLiked(data.liked);
      setCount(data.likeCount);
    } catch (err) {
      guard401(err, () => {
        setIsLiked(prev.liked);
        setCount(prev.count);
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggleBookmark() {
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    setBusy(true);
    try {
      const data = await api<{ bookmarked: boolean }>(`/api/posts/${postId}/bookmark`, {
        method: "POST",
      });
      setIsBookmarked(data.bookmarked);
    } catch (err) {
      guard401(err, () => setIsBookmarked(prev));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggleLike}
        disabled={busy}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm transition-all",
          isLiked
            ? "border-brand/60 bg-brand/10 text-brand"
            : "text-muted-foreground hover:border-foreground/40 hover:text-foreground"
        )}
      >
        <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
        {count > 0 && count}
      </button>

      <button
        onClick={toggleBookmark}
        disabled={busy}
        aria-label="收藏"
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border transition-all",
          isBookmarked
            ? "border-foreground/60 bg-card text-foreground"
            : "text-muted-foreground hover:border-foreground/40 hover:text-foreground"
        )}
      >
        <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
      </button>
    </div>
  );
}
