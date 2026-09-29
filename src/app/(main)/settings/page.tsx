import { notFound, redirect } from "next/navigation";

import { PasswordForm } from "@/components/PasswordForm";
import { SettingsForm } from "@/components/SettingsForm";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "设置" };

/**
 * 账号设置页（需登录）：资料编辑 + 密码管理
 */
export default async function SettingsPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });
  if (!user?.profile) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">设置</h1>

      <section className="mb-12">
        <h2 className="mb-4 text-base font-semibold text-foreground">个人资料</h2>
        <SettingsForm
          profile={{
            id: user.profile.id,
            userId: user.id,
            username: user.profile.username,
            name: user.name,
            bio: user.profile.bio,
            avatarUrl: user.profile.avatarUrl,
            website: user.profile.website,
            github: user.profile.github,
            twitter: user.profile.twitter,
            location: user.profile.location,
          }}
        />
      </section>

      <section className="border-t border-border pt-10">
        <h2 className="mb-2 text-base font-semibold text-foreground">
          {user.passwordHash ? "修改密码" : "设置密码"}
        </h2>
        <p className="mb-6 text-xs text-muted-foreground">
          设置后可使用「邮箱 + 密码」登录（密码规则与 QQ 一致：8-16 位，需包含字母和数字）
        </p>
        <PasswordForm hasPassword={Boolean(user.passwordHash)} />
      </section>
    </div>
  );
}
