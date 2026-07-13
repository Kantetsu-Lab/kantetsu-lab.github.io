import projectsJson from "../../content/projects.json";
import workoutsJson from "../../content/workouts.json";

export type Project = {
  id: string;
  name: string;
  slug: string;
  description: string;
  tags: string[];
  date: string | null;
  featured: boolean;
  githubUrl: string | null;
  demoUrl: string | null;
  cover: string | null;
  body: string;
};

export type Workout = {
  id: string;
  name: string;
  date: string;
  type: string;
  duration: number | null;
  distance: number | null;
  memo: string;
};

export function getProjects(): Project[] {
  return projectsJson as Project[];
}

export function getFeaturedProjects(): Project[] {
  const projects = getProjects();
  const featured = projects.filter((p) => p.featured);
  return (featured.length > 0 ? featured : projects).slice(0, 3);
}

export function getProject(slug: string): Project | undefined {
  return getProjects().find((p) => p.slug === slug);
}

export function getWorkouts(): Workout[] {
  return (workoutsJson as Workout[])
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function formatDate(date: string | null): string {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}
