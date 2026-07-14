"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Project } from "@/lib/content";
import ProjectCard from "@/components/ProjectCard";

/** タグでフィルタできる作品グリッド。番号は日付の古い順に振る */
export default function ProjectsGrid({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState<string>("すべて");

  const numbers = useMemo(() => {
    const sorted = [...projects].sort((a, b) =>
      (a.date ?? "").localeCompare(b.date ?? "")
    );
    return new Map(sorted.map((p, i) => [p.id, i + 1]));
  }, [projects]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return ["すべて", ...set];
  }, [projects]);

  const shown =
    active === "すべて"
      ? projects
      : projects.filter((p) => p.tags.includes(active));

  return (
    <div>
      {/* フィルタタブ */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const count =
            tag === "すべて"
              ? projects.length
              : projects.filter((p) => p.tags.includes(tag)).length;
          return (
            <button
              key={tag}
              onClick={() => setActive(tag)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                active === tag
                  ? "bg-foreground text-background"
                  : "bg-card text-muted hover:text-foreground"
              }`}
            >
              {tag}
              <span className="ml-1.5 text-xs opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* カード */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {shown.map((project) => (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <ProjectCard
                project={project}
                number={numbers.get(project.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
