"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Infinity as InfinityIcon, Loader2 } from "lucide-react";

import { api } from "@/lib/api-client";

/** 博客环：跳到 JueBlog 上的「下一家」博客 */
export function WebringLink({ username }: { username: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function go() {
    setError(false);
    setLoading(true);
    try {
      const next = await api<{ username: string }>(
        `/api/webring?current=${encodeURIComponent(username)}`
      );
      router.push(`/u/${next.username}`);
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div className="mt-14 border-t border-border pt-8 text-center">
      <button
        onClick={go}
        disabled={loading}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <InfinityIcon className="h-4 w-4" />
        )}
        博客环 · 去下一家博客
      </button>
      {error && (
        <p className="mt-2 text-xs text-muted-foreground">博客环里还没有其他博客</p>
      )}
    </div>
  );
}
