import Link from "next/link";

import { Navbar } from "@/components/Navbar";

/**
 * 主站布局：会话感知导航栏 + 内容区 + Footer
 * （认证页在 (auth) 路由组，使用独立的居中布局）
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>

      <footer className="mt-24 border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-10 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} JueBlog</p>
          <p className="text-xs">Write. Connect. Belong.</p>
          <Link href="/explore" className="text-xs transition-colors hover:text-foreground">
            博客广场
          </Link>
        </div>
      </footer>
    </div>
  );
}
