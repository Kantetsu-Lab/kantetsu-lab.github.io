import Link from "next/link";
import Reveal from "@/components/Reveal";
import ProjectCard from "@/components/ProjectCard";
import AboutSection from "@/components/AboutSection";
import RiderScene from "@/components/RiderScene";
import Marquee from "@/components/Marquee";
import EngineBeat from "@/components/EngineBeat";
import { getFeaturedProjects, getProjects, getWorkouts } from "@/lib/content";
import { getRiderSrc, getEngineSrc } from "@/lib/character";
import { recentStats } from "@/lib/stats";

export default function Home() {
  const featured = getFeaturedProjects();
  const projects = getProjects();
  const workouts = getWorkouts();
  const stats = recentStats(workouts);
  const riderSrc = getRiderSrc();
  const engineSrc = getEngineSrc();

  const facts = [
    { label: "公開作品", value: `${projects.length}`, unit: "点", color: "var(--pop-blue)" },
    { label: "運動記録", value: `${workouts.length}`, unit: "件", color: "var(--pop-green)" },
    { label: "主要工具", value: "Claude Code", unit: "", color: "var(--pop-pink)" },
    { label: "稼働開始", value: "2026.07", unit: "—", color: "var(--accent)" },
  ];

  return (
    <div>
      {/* ヒーロー */}
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-16 pt-20 text-center md:pb-24 md:pt-28">
        <Reveal>
          <p className="font-pixel text-sm tracking-widest text-accent">
            KAITO SHIMOMURA — PORTFOLIO
          </p>
          <h1 className="font-pixel mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-6xl">
            <span className="inline-block">つくる。</span>
            <span className="inline-block">走る。</span>
            <br />
            <span className="inline-block text-accent">記録する。</span>
          </h1>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted md:text-lg">
            AI を使ったものづくりと、日々のトレーニング。
            <br className="hidden md:block" />
            エンジンが止まらないうちは、どこまでも行ける。
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-8 flex items-center gap-5">
            <Link
              href="/projects/"
              className="pop-btn rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-white"
            >
              作品を見る
            </Link>
            <Link
              href="/fitness/"
              className="pop-btn rounded-full bg-card px-6 py-2.5 text-sm font-bold"
            >
              運動記録を見る
            </Link>
          </div>
        </Reveal>
      </section>

      {/* 走行シーン */}
      <RiderScene riderSrc={riderSrc} />

      {/* マーキー */}
      <Marquee items={["つくる", "走る", "記録する", "MAKE", "RIDE", "RECORD"]} />

      {/* 数値ストリップ */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {facts.map((f, i) => (
            <Reveal key={f.label} delay={i * 0.08}>
              <div className="pop-card flex h-full flex-col items-center justify-between gap-3 p-5 text-center">
                <p
                  className="font-pixel whitespace-nowrap text-xs font-bold text-white"
                  style={{
                    background: f.color,
                    borderRadius: 999,
                    padding: "2px 10px",
                    display: "inline-block",
                    border: "2px solid var(--line)",
                  }}
                >
                  {f.label}
                </p>
                <p className="text-xl font-extrabold tracking-tight md:text-2xl">
                  {f.value}
                  {f.unit && (
                    <span className="ml-0.5 text-sm font-bold text-muted">
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
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <Reveal>
          <p className="font-pixel text-sm font-bold tracking-widest text-accent">
            01 / PROJECTS
          </p>
          <h2 className="font-pixel mt-2 text-2xl font-bold tracking-tight md:text-4xl">
            AI でつくったもの
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((project, i) => (
            <Reveal key={project.id} delay={i * 0.1}>
              <ProjectCard project={project} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* 自己紹介 */}
      <AboutSection />

      {/* 運動サマリー: エンジンの鼓動 */}
      <section
        className="border-t-3 bg-card"
        style={{ borderTopWidth: 3, borderColor: "var(--line)" }}
      >
        <div className="mx-auto max-w-5xl px-6 py-20">
          <Reveal>
            <p className="font-pixel text-sm font-bold tracking-widest text-accent">
              03 / FITNESS
            </p>
            <h2 className="font-pixel mt-2 text-2xl font-bold tracking-tight md:text-4xl">
              エンジンは毎日、鼓動する
            </h2>
          </Reveal>
          <div className="mt-10 flex flex-col items-center gap-10 md:flex-row md:justify-center md:gap-16">
            <Reveal>
              <EngineBeat engineSrc={engineSrc} size={130} />
            </Reveal>
            <div className="grid grid-cols-3 gap-8 md:gap-12">
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
                    <p className="text-3xl font-extrabold tracking-tight md:text-5xl">
                      {s.value}
                      <span className="ml-1 text-sm font-bold text-muted md:text-lg">
                        {s.unit}
                      </span>
                    </p>
                    <p className="mt-2 text-xs font-bold text-muted md:text-sm">
                      {s.label}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal delay={0.3}>
            <div className="mt-12 text-center">
              <Link
                href="/fitness/"
                className="pop-btn inline-block rounded-full bg-background px-6 py-2.5 text-sm font-bold"
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
