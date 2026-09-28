import { FriendsView } from "@/components/FriendsView";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "好友" };

/**
 * 好友页（需登录，middleware 保护）
 */
export default async function FriendsPage() {
  const session = await getAuthSession();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">好友</h1>
      <FriendsView meName={session?.user?.name ?? null} meImage={session?.user?.image ?? null} />
    </div>
  );
}
