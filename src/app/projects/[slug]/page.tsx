import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Reveal from "@/components/Reveal";
import { getProject, getProjects, formatDate } from "@/lib/content";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  return {
    title: project?.name ?? "Project",
    description: project?.description,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <article className="mx-auto max-w-3xl px-6 py-24">
      <Reveal>
        <Link href="/projects/" className="text-sm text-accent hover:underline">
          ← Projects に戻る
        </Link>
        <div className="mt-6 flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent"
            >
              {tag}
            </span>
          ))}
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {project.name}
        </h1>
        <p className="mt-4 text-lg text-muted">{project.description}</p>
        <div className="mt-4 flex items-center gap-5 text-sm text-muted">
          <span>{formatDate(project.date)}</span>
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              GitHub ↗
            </a>
          )}
          {project.demoUrl && (
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Demo ↗
            </a>
          )}
        </div>
      </Reveal>

      {project.cover && (
        <Reveal delay={0.1}>
          <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-3xl">
            <Image
              src={project.cover}
              alt={project.name}
              fill
              className="object-cover"
            />
          </div>
        </Reveal>
      )}

      <Reveal delay={0.15}>
        <div className="prose prose-neutral mt-12 max-w-none dark:prose-invert prose-headings:tracking-tight prose-a:text-accent">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {project.body}
          </ReactMarkdown>
        </div>
      </Reveal>
    </article>
  );
}
