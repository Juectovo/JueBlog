"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu, PenLine, Search, Settings, User, UserPlus } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { SearchDialog } from "@/components/SearchDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_LINKS = [
  { href: "/", label: "首页" },
  { href: "/explore", label: "博客广场" },
  { href: "/friends", label: "好友" },
  { href: "/groups", label: "群组" },
] as const;

/**
 * 全局导航栏：Logo / 中部导航 / 搜索(Cmd+K) + 会话感知头像下拉
 * 登录后右上角显示头像下拉（个人主页 / 设置 / 退出），未登录显示「登录」
 */
export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cmd+K / Ctrl+K 唤起搜索
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-8">
          <Logo />
          {/* 桌面端中部导航 */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive(link.href)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* 写作入口（登录后显示） */}
          {status === "authenticated" && (
            <button
              onClick={() => router.push("/write")}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              aria-label="写文章"
            >
              <PenLine className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">写文章</span>
            </button>
          )}

          {/* 搜索按钮 */}
          <button
            onClick={() => setSearchOpen(true)}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            aria-label="搜索"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">搜索</span>
            <kbd className="hidden rounded border border-border px-1 font-mono text-[10px] sm:inline">
              ⌘K
            </kbd>
          </button>

          {/* 会话感知区域 */}
          {status === "authenticated" && session.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none ring-ring focus-visible:ring-2">
                <UserAvatar
                  name={session.user.name ?? session.user.username ?? "?"}
                  image={session.user.image}
                  size="md"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {session.user.name ?? session.user.username}
                  {session.user.username && (
                    <span className="block">@{session.user.username}</span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/write")}>
                  <PenLine className="h-4 w-4" /> 写文章
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/u/${session.user.username}`)}>
                  <User className="h-4 w-4" /> 我的主页
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="h-4 w-4" /> 设置
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="h-4 w-4" /> 退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline">
              登录
            </Link>
          )}

          {/* 移动端菜单按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="菜单"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 移动端下拉导航 */}
      {mobileOpen && (
        <nav className="border-t border-border bg-background px-6 py-3 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-md px-3 py-2 text-sm ${
                isActive(link.href) ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {status === "unauthenticated" && (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground"
            >
              <UserPlus className="h-4 w-4" /> 登录 / 注册
            </Link>
          )}
        </nav>
      )}

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
