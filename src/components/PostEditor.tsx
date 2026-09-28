"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Loader2, Save, Send, Sparkles } from "lucide-react";

import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";

export type PostEditorInitial = {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  coverUrl: string | null;
  tags: string[];
  status: "DRAFT" | "PUBLIC" | "PRIVATE";
};

type Status = "DRAFT" | "PUBLIC" | "PRIVATE";

const STATUS_LABEL: Record<Status, string> = {
  DRAFT: "草稿",
  PUBLIC: "公开",
  PRIVATE: "私密",
};

/**
 * 文章编辑器：创建 / 编辑（?edit=[postId] 进入编辑模式）
 * 支持 Markdown 编辑 + 实时预览、标签、摘要、封面、三态可见性
 */
export function PostEditor({ initial }: { initial?: PostEditorInitial }) {
  const router = useRouter();
  const isEdit = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [status, setStatus] = useState<Status>(initial?.status ?? "DRAFT");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function aiSummary() {
    setAiLoading(true);
    setError(null);
    try {
      const data = await api<{ summary: string }>("/api/ai/summary", {
        method: "POST",
        body: { content },
      });
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 摘要生成失败");
    } finally {
      setAiLoading(false);
    }
  }

  function parseTags(): string[] {
    return tagsText
      .split(/[,，]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 5);
  }

  async function save() {
    setError(null);
    if (!title.trim()) return setError("标题不能为空");
    if (!content.trim()) return setError("正文不能为空");

    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        summary: summary.trim() || undefined,
        content,
        coverUrl: coverUrl.trim() || undefined,
        tags: parseTags(),
        status,
      };

      const post = isEdit
        ? await api<{ id: string }>(`/api/posts/${initial!.id}`, { method: "PATCH", body })
        : await api<{ id: string }>("/api/posts", { method: "POST", body });

      router.push(`/posts/${post.id}`);
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "保存失败，请稍后重试");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* 顶栏：返回 / 可见性 / 保存 */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={isEdit ? `/posts/${initial!.id}` : "/"}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {isEdit ? "返回文章" : "返回首页"}
        </Link>

        <div className="flex items-center gap-3">
          {/* 可见性三态 */}
          <div className="grid grid-cols-3 gap-1 rounded-md border border-border p-1">
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-sm px-2.5 py-1 text-xs transition-colors",
                  status === s
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          <Button onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : status === "PUBLIC" ? (
              <Send className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {status === "PUBLIC" ? "发布" : "保存"}
          </Button>
        </div>
      </div>

      {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

      {/* 标题 */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="输入文章标题…"
        maxLength={120}
        className="mt-8 w-full bg-transparent text-3xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50"
      />

      {/* 正文：编辑 / 预览 */}
      <Tabs defaultValue="edit" className="mt-6">
        <TabsList>
          <TabsTrigger value="edit">编辑</TabsTrigger>
          <TabsTrigger value="preview">预览</TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="用 Markdown 书写你的文章…&#10;&#10;## 二级标题&#10;**加粗**、*斜体*、`行内代码`&#10;- 列表&#10;> 引用"
            className="min-h-[52vh] resize-y border-border/60 bg-transparent font-mono text-sm leading-7 focus-visible:ring-0"
          />
        </TabsContent>
        <TabsContent value="preview">
          <div className="min-h-[52vh] rounded-md border border-border/60 px-6 py-4">
            {content.trim() ? (
              <Markdown content={content} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">
                什么都没有——先在「编辑」里写点什么吧
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 文章设置 */}
      <div className="mt-8 space-y-5 rounded-lg border border-border bg-card p-5">
        <p className="text-xs font-medium text-muted-foreground">文章设置</p>

        <label className="block space-y-2">
          <span className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">摘要</span>
            <button
              type="button"
              onClick={aiSummary}
              disabled={aiLoading || content.trim().length < 20}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-brand disabled:opacity-50"
              title="根据正文自动生成摘要（需站点配置 AI_API_KEY）"
            >
              {aiLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              AI 生成摘要
            </button>
          </span>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="列表页展示的一段话（可选，最长 200 字），也可以让 AI 帮你写"
            className="min-h-[56px]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">标签</span>
          <Input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="用逗号分隔，最多 5 个，如：随笔, nextjs"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">封面图 URL</span>
          <Input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://…（可选）"
          />
        </label>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          「公开」会进入博客广场与好友动态；「私密」仅自己可见；「草稿」随时回来继续写
        </p>
      </div>

      {/* 未保存离开提醒由浏览器默认处理；底部再次提供保存 */}
      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={save} disabled={saving} className="sm:w-auto">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          保存
        </Button>
      </div>
    </div>
  );
}
