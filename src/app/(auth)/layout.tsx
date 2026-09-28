import { Logo } from "@/components/layout/Logo";

/**
 * 认证布局：页面顶部 JueBlog Logo + 居中卡片
 * 根布局只提供 body 外壳，这里不渲染主站 Header/Footer
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Logo className="mb-10 text-2xl" />
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
