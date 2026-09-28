import { notFound, redirect } from "next/navigation";

import { SettingsForm } from "@/components/SettingsForm";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "设置" };

/**
 * 账号设置页（需登录）
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
    </div>
  );
}
