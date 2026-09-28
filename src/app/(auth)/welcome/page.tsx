"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Logo } from "@/components/layout/Logo";

/**
 * 登录成功着陆页（三种登录方式的 callbackUrl 都指向这里）
 * 读取 session.user.username 后跳转到个人主页 /u/[username]
 */
export default function WelcomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    const username = session?.user?.username;
    if (username) {
      router.replace(`/u/${username}`);
    } else if (status === "authenticated") {
      // 理论上不会发生（登录时自动创建 Profile），兜底回首页
      router.replace("/");
    }
  }, [status, session, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <Logo className="text-2xl" />
      <p className="animate-pulse text-sm text-muted-foreground">正在进入你的主页…</p>
    </div>
  );
}
