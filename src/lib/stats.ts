import type { Workout } from "./content";

export type WeekPoint = {
  label: string;
  distance: number;
  duration: number;
};

export type TypePoint = {
  type: string;
  count: number;
  duration: number;
};

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // 月曜始まり
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** 直近 n 週間の週次合計（距離 km・時間 分） */
export function weeklySeries(workouts: Workout[], weeks = 8): WeekPoint[] {
  const thisWeek = startOfWeek(new Date());
  const points: WeekPoint[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const inWeek = workouts.filter((w) => {
      const d = new Date(w.date);
      return d >= start && d < end;
    });

    points.push({
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      distance: round1(inWeek.reduce((s, w) => s + (w.distance ?? 0), 0)),
      duration: inWeek.reduce((s, w) => s + (w.duration ?? 0), 0),
    });
  }
  return points;
}

/** 種目別の回数・時間 */
export function typeBreakdown(workouts: Workout[]): TypePoint[] {
  const map = new Map<string, TypePoint>();
  for (const w of workouts) {
    const cur = map.get(w.type) ?? { type: w.type, count: 0, duration: 0 };
    cur.count += 1;
    cur.duration += w.duration ?? 0;
    map.set(w.type, cur);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** 直近30日のサマリー */
export function recentStats(workouts: Workout[]) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recent = workouts.filter((w) => new Date(w.date) >= cutoff);
  return {
    count: recent.length,
    totalDuration: recent.reduce((s, w) => s + (w.duration ?? 0), 0),
    totalDistance: round1(recent.reduce((s, w) => s + (w.distance ?? 0), 0)),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
