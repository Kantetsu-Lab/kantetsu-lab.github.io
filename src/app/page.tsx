import Link from "next/link";
import Reveal from "@/components/Reveal";
import ProjectCard from "@/components/ProjectCard";
import AboutSection from "@/components/AboutSection";
import { getFeaturedProjects, getProjects, getWorkouts } from "@/lib/content";
import { recentStats } from "@/lib/stats";

export default function Home() {
  const featured = getFeaturedProjects();
  const projects = getProjects();
  const workouts = getWorkouts();
  const stats = recentStats(workouts);

  const facts = [
    { label: "公開作品", value: `${projects.length}`, unit: "点" },
    { label: "運動記録", value: `${workouts.length}`, unit: "件" },
    { label: "主要工具", value: "Claude Code", unit: "" },
    { label: "稼働開始", value: "2026.07", unit: "—" },
  ];

  return (
    <div>
      {/* ヒーロー */}
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 py-32 text-center md:py-44">
        <Reveal>
          <h1 className="text-5xl font-semibold tracking-tight md:text-7xl">
            つくる。走る。
            <br />
            <span className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-500 bg-clip-text text-transparent">
              記録する。
            </span>
          </h1>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted md:text-xl">
            AI を使ったものづくりと、日々のトレーニング。
            <br className="hidden md:block" />
            その両方をここに残していきます。
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-8 flex items-center gap-6">
            <Link
              href="/projects/"
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85"
            >
              作品を見る
            </Link>
            <Link
              href="/fitness/"
              className="text-sm font-medium text-accent hover:underline"
            >
              運動記録を見る →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* 数値ストリップ */}
      <section className="border-y border-border-soft">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-y-8 px-6 py-12 md:grid-cols-4">
          {facts.map((f, i) => (
            <Reveal key={f.label} delay={i * 0.08}>
              <div className="text-center">
                <p className="text-xs text-muted">{f.label}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
                  {f.value}
                  {f.unit && (
                    <span className="ml-0.5 text-sm font-medium text-muted">
                      {f.unit}
                    </span>
                  )}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 注目プロジェクト */}
      <section className="mx-auto max-w-5xl px-6 pb-28">
        <Reveal>
          <p className="text-sm font-medium text-accent">Projects</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            AI でつくったもの
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((project, i) => (
            <Reveal key={project.id} delay={i * 0.1}>
              <ProjectCard project={project} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* 自己紹介 */}
      <AboutSection />

      {/* 運動サマリー */}
      <section className="border-t border-border-soft bg-card">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <Reveal>
            <p className="text-sm font-medium text-accent">Fitness</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              直近30日のトレーニング
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { value: `${stats.count}`, unit: "回", label: "ワークアウト" },
              {
                value: `${Math.floor(stats.totalDuration / 60)}`,
                unit: `時間${stats.totalDuration % 60 > 0 ? ` ${stats.totalDuration % 60}分` : ""}`,
                label: "合計時間",
              },
              { value: `${stats.totalDistance}`, unit: "km", label: "移動距離" },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 0.1}>
                <div className="text-center">
                  <p className="text-4xl font-semibold tracking-tight md:text-6xl">
                    {s.value}
                    <span className="ml-1 text-lg font-medium text-muted md:text-2xl">
                      {s.unit}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-muted">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.3}>
            <div className="mt-12 text-center">
              <Link
                href="/fitness/"
                className="text-sm font-medium text-accent hover:underline"
              >
                すべての記録とグラフを見る →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
