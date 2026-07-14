import Link from "next/link";
import Image from "next/image";
import type { Project } from "@/lib/content";
import { formatDate } from "@/lib/content";

const TAG_COLORS = [
  "var(--accent)",
  "var(--pop-blue)",
  "var(--pop-green)",
  "var(--pop-pink)",
];

export default function ProjectCard({
  project,
  number,
}: {
  project: Project;
  number?: number;
}) {
  return (
    <Link
      href={`/projects/${project.slug}/`}
      className="pop-card pop-card-hover group flex h-full flex-col overflow-hidden"
    >
      {project.cover && (
        <div
          className="relative aspect-[16/9] overflow-hidden border-b-3"
          style={{ borderBottomWidth: 3, borderColor: "var(--line)" }}
        >
          <Image
            src={project.cover}
            alt={project.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex items-center gap-3">
          {number != null && (
            <span className="font-pixel rounded-md bg-line px-1.5 py-0.5 text-xs font-bold tracking-wider text-background">
              No.{String(number).padStart(2, "0")}
            </span>
          )}
          <span className="text-xs font-bold text-muted">
            {formatDate(project.date)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {project.tags.map((tag, i) => (
            <span
              key={tag}
              className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
              style={{
                background: TAG_COLORS[i % TAG_COLORS.length],
                border: "2px solid var(--line)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <h3 className="font-pixel text-lg font-bold tracking-tight">
          {project.name}
        </h3>
        <p className="text-sm leading-relaxed text-muted">{project.description}</p>
        <div className="mt-auto flex items-center justify-end pt-2">
          <span className="text-sm font-bold text-accent transition-transform duration-300 group-hover:translate-x-1">
            詳しく見る →
          </span>
        </div>
      </div>
    </Link>
  );
}
