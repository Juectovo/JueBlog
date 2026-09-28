"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Users } from "lucide-react";

import { BlogCard } from "@/components/BlogCard";
import { EmptyState } from "@/components/EmptyState";
import { UserAvatar } from "@/components/UserAvatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";
import type { FriendCard, GroupCard, PostCard } from "@/types/api";

/**
 * 个人主页 Tab：文章（服务端已给数据）/ 好友 / 群组（切到时懒加载）
 */
export function ProfileTabs({
  username,
  posts,
  isMe,
}: {
  username: string;
  posts: PostCard[];
  isMe: boolean;
}) {
  return (
    <Tabs defaultValue="posts" className="mt-10">
      <TabsList>
        <TabsTrigger value="posts">文章 {posts.length > 0 && posts.length}</TabsTrigger>
        <TabsTrigger value="friends">好友</TabsTrigger>
        <TabsTrigger value="groups">群组</TabsTrigger>
      </TabsList>

      <TabsContent value="posts">
        {posts.length === 0 ? (
          <EmptyState
            icon={Users}
            title={isMe ? "还没有发布过文章" : "TA 还没有公开文章"}
            description={isMe ? "第一篇博客往往最难，写完就好了。" : "去博客广场逛逛别人在写什么吧。"}
            action={isMe ? { label: "写第一篇文章", href: "/write" } : { label: "逛逛博客广场", href: "/explore" }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="friends">
        <LazyList
          path={`/api/users/${username}/friends`}
          empty={{ title: "还没有好友", description: "好友是 JueBlog 的灵魂，去认识几个写东西的人吧。" }}
          render={(f: FriendCard) => (
            <Link
              key={f.id}
              href={`/u/${f.username}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/40"
            >
              <UserAvatar name={f.name ?? f.username ?? "?"} image={f.image} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{f.name ?? f.username}</p>
                <p className="truncate text-xs text-muted-foreground">@{f.username}</p>
                {f.bio && <p className="mt-1 truncate text-xs text-muted-foreground">{f.bio}</p>}
              </div>
            </Link>
          )}
        />
      </TabsContent>

      <TabsContent value="groups">
        <LazyList
          path={`/api/users/${username}/groups`}
          empty={{ title: "还没有加入群组", description: "群组是同好交流的小圈子。" }}
          render={(g: GroupCard) => (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/40"
            >
              <p className="text-sm font-medium text-foreground">{g.name}</p>
              {g.description && (
                <p className="mt-1 truncate text-xs text-muted-foreground">{g.description}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{g.memberCount} 位成员</p>
            </Link>
          )}
        />
      </TabsContent>
    </Tabs>
  );
}

/** 懒加载列表：挂载后请求一次 */
function LazyList<T>({
  path,
  render,
  empty,
}: {
  path: string;
  render: (item: T) => React.ReactNode;
  empty: { title: string; description: string };
}) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ items: T[] }>(path)
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (error) {
    return <EmptyState icon={Users} title={empty.title} description={empty.description} />;
  }
  if (items === null) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (items.length === 0) {
    return <EmptyState icon={Users} title={empty.title} description={empty.description} />;
  }

  return <div className="grid gap-3 sm:grid-cols-2">{items.map(render)}</div>;
}
