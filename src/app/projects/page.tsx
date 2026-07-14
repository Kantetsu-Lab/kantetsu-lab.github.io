import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import ProjectsGrid from "@/components/ProjectsGrid";
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
        <p className="font-pixel text-sm font-bold tracking-widest text-accent">PROJECTS</p>
        <h1 className="font-pixel mt-2 text-3xl font-bold tracking-tight md:text-5xl">
          AI でつくったもの
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          Claude をはじめとする AI を活用して開発した作品たちです。
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <div className="mt-12">
          <ProjectsGrid projects={projects} />
        </div>
      </Reveal>
      {projects.length === 0 && (
        <p className="mt-12 text-muted">
          まだ作品がありません。Notion の Projects データベースに追加して
          Published にチェックを入れてください。
        </p>
      )}
    </div>
  );
}
