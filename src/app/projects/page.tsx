import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import ProjectCard from "@/components/ProjectCard";
import { getProjects } from "@/lib/content";

export const metadata: Metadata = {
  title: "Projects",
  description: "AI を活用して開発した作品の一覧。",
};

export default function ProjectsPage() {
  const projects = getProjects();

  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      <Reveal>
        <p className="text-sm font-medium text-accent">Projects</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
          AI でつくったもの
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          Claude をはじめとする AI を活用して開発した作品たちです。
        </p>
      </Reveal>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {projects.map((project, i) => (
          <Reveal key={project.id} delay={(i % 2) * 0.1}>
            <ProjectCard project={project} />
          </Reveal>
        ))}
      </div>
      {projects.length === 0 && (
        <p className="mt-12 text-muted">
          まだ作品がありません。Notion の Projects データベースに追加して
          Published にチェックを入れてください。
        </p>
      )}
    </div>
  );
}
