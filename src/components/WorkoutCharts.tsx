"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { WeekPoint, TypePoint } from "@/lib/stats";

const TYPE_COLORS: Record<string, string> = {
  ランニング: "#ff375f",
  筋トレ: "#0a84ff",
  ウォーキング: "#30d158",
  サイクリング: "#ff9f0a",
  水泳: "#bf5af2",
  その他: "#8e8e93",
};

export default function WorkoutCharts({
  weekly,
  types,
}: {
  weekly: WeekPoint[];
  types: TypePoint[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* 週次の運動時間 */}
      <div className="pop-card p-7 lg:col-span-3">
        <h3 className="text-sm font-medium text-muted">週ごとの運動時間（分）</h3>
        <div className="mt-6 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} barCategoryGap="30%">
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={32}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--border)" }}
                contentStyle={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
                formatter={(value) => [`${value} 分`, "運動時間"]}
              />
              <Bar dataKey="duration" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 種目の内訳 */}
      <div className="pop-card p-7 lg:col-span-2">
        <h3 className="text-sm font-medium text-muted">種目の内訳（回数）</h3>
        <div className="mt-2 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={types}
                dataKey="count"
                nameKey="type"
                innerRadius="62%"
                outerRadius="90%"
                paddingAngle={3}
                strokeWidth={0}
              >
                {types.map((t) => (
                  <Cell
                    key={t.type}
                    fill={TYPE_COLORS[t.type] ?? TYPE_COLORS["その他"]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
                formatter={(value, name) => [`${value} 回`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-4 space-y-1.5">
          {types.map((t) => (
            <li key={t.type} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  background: TYPE_COLORS[t.type] ?? TYPE_COLORS["その他"],
                }}
              />
              <span>{t.type}</span>
              <span className="ml-auto text-muted">{t.count} 回</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
