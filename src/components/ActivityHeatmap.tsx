import type { ActivityDay } from "@/types/api";

/**
 * 创作活动热力图（GitHub 风格，但数据源是博客发文记录）
 * 15 周 × 7 天；点缀紫按密度分四档
 */
export function ActivityHeatmap({ activity }: { activity: ActivityDay[] }) {
  const level = (count: number) => {
    if (count === 0) return "bg-card border-border";
    if (count === 1) return "border-transparent bg-brand/25";
    if (count <= 3) return "border-transparent bg-brand/50";
    return "border-transparent bg-brand/80";
  };

  // 按周分列（每列 7 天，从第一天起每 7 个一行一列）
  const weeks: ActivityDay[][] = [];
  for (let i = 0; i < activity.length; i += 7) {
    weeks.push(activity.slice(i, i + 7));
  }

  return (
    <div>
      <p className="mb-3 text-xs font-medium text-muted-foreground">
        创作活动 · 最近 15 周
      </p>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date} · ${day.count} 篇`}
                className={`h-[10px] w-[10px] rounded-[2px] border ${level(day.count)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        少
        <span className="h-[10px] w-[10px] rounded-[2px] border border-border bg-card" />
        <span className="h-[10px] w-[10px] rounded-[2px] border border-transparent bg-brand/25" />
        <span className="h-[10px] w-[10px] rounded-[2px] border border-transparent bg-brand/50" />
        <span className="h-[10px] w-[10px] rounded-[2px] border border-transparent bg-brand/80" />
        多
      </div>
    </div>
  );
}
