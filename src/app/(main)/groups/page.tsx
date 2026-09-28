import { GroupsView } from "@/components/GroupsView";

export const dynamic = "force-dynamic";

export const metadata = { title: "群组" };

/**
 * 群组页：我的群组侧栏 + 公开群组广场（公开浏览无需登录，创建/加入需登录）
 */
export default function GroupsPage() {
  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">群组</h1>
      <GroupsView />
    </div>
  );
}
