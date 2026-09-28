import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

/**
 * Markdown 渲染（Server Component 可用）
 * 无 typography 插件，按 JueBlog 黑色规范手工映射元素样式；
 * rehype-slug 为标题注入 id，供浮动目录锚点定位
 */
export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug]}
      components={{
        h1: ({ children }) => (
          <h1 className="mt-10 mb-4 text-2xl font-semibold tracking-tight text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-10 mb-4 scroll-mt-24 text-xl font-semibold tracking-tight text-foreground">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-8 mb-3 scroll-mt-24 text-lg font-semibold text-foreground">{children}</h3>
        ),
        p: ({ children }) => <p className="my-4 leading-8 text-foreground/90">{children}</p>,
        ul: ({ children }) => <ul className="my-4 list-disc space-y-1.5 pl-6 text-foreground/90">{children}</ul>,
        ol: ({ children }) => <ol className="my-4 list-decimal space-y-1.5 pl-6 text-foreground/90">{children}</ol>,
        li: ({ children }) => <li className="leading-7">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="my-5 border-l-2 border-brand/60 pl-4 text-muted-foreground">{children}</blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-brand">
            {children}
          </a>
        ),
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        hr: () => <hr className="my-8 border-border" />,
        code: ({ className, children }) => {
          const isBlock = /language-/.test(className ?? "");
          if (isBlock) {
            return <code className={`${className ?? ""} block text-sm leading-7`}>{children}</code>;
          }
          return (
            <code className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[13px] text-foreground">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-5 overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-[13px] leading-7 text-foreground/90">
            {children}
          </pre>
        ),
        img: ({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt ?? ""} className="my-5 rounded-lg border border-border" />
        ),
        table: ({ children }) => (
          <div className="my-5 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-b border-border bg-card px-3 py-2 text-left font-medium text-foreground">{children}</th>
        ),
        td: ({ children }) => <td className="border-b border-border px-3 py-2 text-muted-foreground">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
