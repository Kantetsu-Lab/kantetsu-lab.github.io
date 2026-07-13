import Link from "next/link";
import Image from "next/image";
import type { Project } from "@/lib/content";
import { formatDate } from "@/lib/content";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}/`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-card transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-xl"
    >
      {project.cover && (
        <div className="relative aspect-[16/9] overflow-hidden">
          <Image
            src={project.cover}
            alt={project.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-7">
        <div className="flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent"
            >
              {tag}
            </span>
          ))}
        </div>
        <h3 className="text-xl font-semibold tracking-tight">{project.name}</h3>
        <p className="text-sm leading-relaxed text-muted">{project.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs text-muted">{formatDate(project.date)}</span>
          <span className="text-sm font-medium text-accent transition-transform duration-300 group-hover:translate-x-1">
            詳しく見る →
          </span>
        </div>
      </div>
    </Link>
  );
}
