"use client";

import { useMemo } from "react";
import { ListTree } from "lucide-react";

/**
 * 浮动目录（TOC）：从 Markdown 源文提取 ## / ### 标题
 * 配合 rehype-slug 生成的 id 锚点定位（xl 及以上屏幕显示）
 */
export function Toc({ content }: { content: string }) {
  const headings = useMemo(() => {
    const result: { level: 2 | 3; text: string; id: string }[] = [];
    // 与 rehype-slug 相同的 slug 规则（github-slugger 简化版）
    const used = new Map<string, number>();
    const slugify = (text: string) => {
      const base =
        text
          .toLowerCase()
          .trim()
          .replace(/[^\p{L}\p{N}\s-]/gu, "")
          .replace(/\s+/g, "-") || "heading";
      const n = used.get(base) ?? 0;
      used.set(base, n + 1);
      return n === 0 ? base : `${base}-${n}`;
    };

    let inCodeBlock = false;
    for (const line of content.split("\n")) {
      if (line.trimStart().startsWith("```")) inCodeBlock = !inCodeBlock;
      if (inCodeBlock) continue;
      const m = /^(##|###)\s+(.+?)\s*#*$/.exec(line);
      if (m) {
        const level = m[1].length as 2 | 3;
        const text = m[2].replace(/[*_`~]/g, "");
        result.push({ level, text, id: slugify(text) });
      }
    }
    return result;
  }, [content]);

  if (headings.length === 0) return null;

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="hidden w-52 shrink-0 xl:block">
      <div className="sticky top-24">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ListTree className="h-3.5 w-3.5" /> 目录
        </p>
        <ul className="space-y-1.5 border-l border-border">
          {headings.map((h, i) => (
            <li key={`${h.id}-${i}`}>
              <button
                onClick={() => scrollTo(h.id)}
                className={`block w-full text-left text-xs leading-5 text-muted-foreground transition-colors hover:text-foreground ${
                  h.level === 2 ? "pl-3" : "pl-6"
                }`}
              >
                {h.text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
