"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";

import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import type { CommentDto } from "@/types/api";

/**
 * 评论区：两层嵌套（顶层评论 + 回复）
 * 提交后本地插入树，不整页刷新
 */
export function CommentSection({
  postId,
  initialComments,
  meId,
  meName,
  meImage,
}: {
  postId: string;
  initialComments: CommentDto[];
  meId: string | null;
  meName?: string | null;
  meImage?: string | null;
}) {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<CommentDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);

  async function submit() {
    setError(null);
    if (!content.trim()) return setError("评论内容不能为空");
    setSubmitting(true);
    try {
      const created = await api<CommentDto>(`/api/posts/${postId}/comment`, {
        method: "POST",
        body: { content: content.trim(), parentId: replyTo?.id },
      });

      if (replyTo) {
        // 插入到父评论的 replies
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo.id ? { ...c, replies: [...(c.replies ?? []), created] } : c
          )
        );
      } else {
        setComments((prev) => [...prev, { ...created, replies: [] }]);
      }
      setContent("");
      setReplyTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "评论失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-16 border-t border-border pt-10">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <MessageCircle className="h-4 w-4" /> 评论 {total > 0 && `· ${total}`}
      </h2>

      {/* 发表框 */}
      {meId ? (
        <div className="mt-6">
          {replyTo && (
            <p className="mb-2 text-xs text-muted-foreground">
              回复 @{replyTo.author.username ?? replyTo.author.name}{" "}
              <button className="text-brand hover:underline" onClick={() => setReplyTo(null)}>
                取消
              </button>
            </p>
          )}
          <div className="flex gap-3">
            <UserAvatar name={meName ?? "我"} image={meImage} size="md" />
            <div className="flex-1 space-y-3">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={replyTo ? `回复 @${replyTo.author.name ?? "作者"}…` : "写下你的评论…"}
                className="min-h-[72px]"
              />
              <div className="flex items-center justify-between">
                {error ? (
                  <p className="text-xs text-red-400">{error}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">支持 Markdown 语法</p>
                )}
                <Button size="sm" onClick={submit} disabled={submitting || !content.trim()}>
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {submitting ? "发布中…" : "发布"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-6 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Link href="/login" className="text-foreground underline underline-offset-4">
            登录
          </Link>
          后参与评论
        </p>
      )}

      {/* 评论列表 */}
      <div className="mt-10 space-y-8">
        {comments.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">还没有评论，来抢沙发</p>
        )}
        {comments.map((c) => (
          <div key={c.id}>
            <CommentRow comment={c} onReply={() => setReplyTo(c)} />
            <div className="ml-11 mt-4 space-y-4 border-l border-border pl-5">
              {(c.replies ?? []).map((r) => (
                <CommentRow key={r.id} comment={r} onReply={() => setReplyTo(c)} small />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CommentRow({
  comment,
  onReply,
  small = false,
}: {
  comment: CommentDto;
  onReply: () => void;
  small?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <UserAvatar
        name={comment.author.name ?? comment.author.username ?? "?"}
        image={comment.author.image}
        size={small ? "sm" : "md"}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {comment.author.name ?? comment.author.username}
          </span>
          {" · "}
          {comment.createdAt.slice(0, 10)}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
          {comment.content}
        </p>
        {!small && (
          <button
            onClick={onReply}
            className="mt-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            回复
          </button>
        )}
      </div>
    </div>
  );
}
