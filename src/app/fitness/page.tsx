import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import WorkoutCharts from "@/components/WorkoutCharts";
import { getWorkouts, formatDate } from "@/lib/content";
import { weeklySeries, typeBreakdown, recentStats } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Fitness",
  description: "日々の運動記録。ランニング、筋トレ、その他のトレーニングログ。",
};

const TYPE_BADGE: Record<string, string> = {
  ランニング: "bg-rose-500/10 text-rose-500",
  筋トレ: "bg-blue-500/10 text-blue-500",
  ウォーキング: "bg-green-500/10 text-green-600",
  サイクリング: "bg-orange-500/10 text-orange-500",
  水泳: "bg-purple-500/10 text-purple-500",
  その他: "bg-gray-500/10 text-gray-500",
};

export default function FitnessPage() {
  const workouts = getWorkouts();
  const stats = recentStats(workouts);
  const weekly = weeklySeries(workouts);
  const types = typeBreakdown(workouts);

  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      <Reveal>
        <p className="font-pixel text-sm font-bold tracking-widest text-accent">FITNESS</p>
        <h1 className="font-pixel mt-2 text-3xl font-bold tracking-tight md:text-5xl">
          運動記録
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          日々のトレーニングログ。続けることがいちばんの成果。
        </p>
      </Reveal>

      {/* サマリーカード */}
      <Reveal delay={0.1}>
        <div className="mt-12 grid grid-cols-3 gap-4 md:gap-6">
          {[
            { value: `${stats.count}`, unit: "回", label: "直近30日" },
            {
              value: `${Math.floor(stats.totalDuration / 60)}h${stats.totalDuration % 60 > 0 ? ` ${stats.totalDuration % 60}m` : ""}`,
              unit: "",
              label: "合計時間",
            },
            { value: `${stats.totalDistance}`, unit: "km", label: "移動距離" },
          ].map((s) => (
            <div key={s.label} className="pop-card p-6 text-center md:p-8">
              <p className="text-3xl font-semibold tracking-tight md:text-4xl">
                {s.value}
                {s.unit && (
                  <span className="ml-1 text-base font-medium text-muted">
                    {s.unit}
                  </span>
                )}
              </p>
              <p className="mt-2 text-xs text-muted md:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* グラフ */}
      <Reveal delay={0.15} className="mt-6">
        <WorkoutCharts weekly={weekly} types={types} />
      </Reveal>

      {/* 活動ログ */}
      <Reveal delay={0.2}>
        <h2 className="font-pixel mt-16 text-2xl font-bold tracking-tight">
          アクティビティ
        </h2>
      </Reveal>
      <div className="mt-6 space-y-3">
        {workouts.map((w, i) => (
          <Reveal key={w.id} delay={Math.min(i * 0.04, 0.3)}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pop-card rounded-2xl px-6 py-4">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${TYPE_BADGE[w.type] ?? TYPE_BADGE["その他"]}`}
              >
                {w.type}
              </span>
              <span className="font-medium">{w.name}</span>
              <span className="text-sm text-muted">{formatDate(w.date)}</span>
              <span className="ml-auto flex items-center gap-4 text-sm text-muted">
                {w.duration != null && <span>{w.duration}分</span>}
                {w.distance != null && <span>{w.distance}km</span>}
              </span>
              {w.memo && (
                <p className="w-full text-sm text-muted">{w.memo}</p>
              )}
            </div>
          </Reveal>
        ))}
      </div>
      {workouts.length === 0 && (
        <p className="mt-12 text-muted">
          まだ記録がありません。Notion の Workouts データベースに追加してください。
        </p>
      )}
    </div>
  );
}
