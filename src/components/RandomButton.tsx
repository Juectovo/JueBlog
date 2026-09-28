"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dice5, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

/** 「带我随机逛逛」：随机跳到一篇公开文章 */
export function RandomButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function go() {
    setError(false);
    setLoading(true);
    try {
      const post = await api<{ id: string }>("/api/explore/random");
      router.push(`/posts/${post.id}`);
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="outline" onClick={go} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dice5 className="h-4 w-4" />}
        带我随机逛逛
      </Button>
      {error && <p className="text-xs text-muted-foreground">还没有可以逛的文章</p>}
    </div>
  );
}
