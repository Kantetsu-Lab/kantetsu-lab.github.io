import Reveal from "@/components/Reveal";
import profile from "../../content/profile.json";

type Strength = {
  rank: number;
  name: string;
  en?: string;
  description?: string;
};

export default function AboutSection() {
  const strengths = (profile.strengths ?? []) as Strength[];

  return (
    <section id="about" className="mx-auto max-w-5xl scroll-mt-16 px-6 py-24">
      <Reveal>
        <p className="text-sm font-medium text-accent">About</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          自己紹介
        </h2>
      </Reveal>

      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        {/* プロフィール */}
        <Reveal className="lg:col-span-3">
          <div className="flex h-full flex-col rounded-3xl bg-card p-8">
            <h3 className="text-2xl font-semibold tracking-tight">
              {profile.name}
            </h3>
            <p className="mt-1 text-sm font-medium text-accent">
              {profile.title}
            </p>
            <p className="mt-5 leading-relaxed text-muted">{profile.bio}</p>
            <dl className="mt-6 space-y-2 border-t border-border-soft pt-5">
              {profile.facts.map((f) => (
                <div key={f.label} className="flex gap-4 text-sm">
                  <dt className="w-20 shrink-0 text-muted">{f.label}</dt>
                  <dd className="font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
            {profile.links.length > 0 && (
              <div className="mt-auto flex gap-4 pt-6">
                {profile.links.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* ツール */}
        <Reveal delay={0.1} className="lg:col-span-2">
          <div className="flex h-full flex-col rounded-3xl bg-card p-8">
            <h3 className="text-sm font-medium text-muted">よく使う道具</h3>
            <div className="mt-5 flex flex-wrap gap-2">
              {profile.tools.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full border border-border-soft bg-background px-3.5 py-1.5 text-sm font-medium"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* 強み (ストレングスファインダー) — 空なら非表示 */}
      {strengths.length > 0 && (
        <Reveal delay={0.15}>
          <div className="mt-6 rounded-3xl bg-card p-8">
            <h3 className="text-sm font-medium text-muted">
              強み — StrengthsFinder TOP{strengths.length}
            </h3>
            <ol className="mt-6 grid gap-5 md:grid-cols-5">
              {strengths.map((s) => (
                <li key={s.rank}>
                  <p className="text-3xl font-semibold text-accent">
                    {s.rank}
                  </p>
                  <p className="mt-1 font-semibold">{s.name}</p>
                  {s.en && (
                    <p className="text-xs uppercase tracking-wide text-muted">
                      {s.en}
                    </p>
                  )}
                  {s.description && (
                    <p className="mt-2 text-xs leading-relaxed text-muted">
                      {s.description}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      )}
    </section>
  );
}
