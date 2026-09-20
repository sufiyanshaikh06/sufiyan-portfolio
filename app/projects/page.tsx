import type { Metadata } from 'next';
import { getPublishedProjects, getSeoEntryForRoute } from '@/lib/content';
import { ProjectCard } from '@/components/content/ProjectCard';

export const dynamic = 'error';
export const revalidate = false;

export function generateMetadata(): Metadata {
  const seo = getSeoEntryForRoute('/projects');
  const title = seo?.title ?? 'Projects | Sufiyan Shaikh';
  const description =
    seo?.description ??
    'Published software projects by Sufiyan Shaikh, including full-stack, AI, and IoT systems.';
  return {
    title,
    description,
    alternates: { canonical: '/projects' },
    openGraph: { title, description, url: '/projects', type: 'website' },
  };
}

export default function ProjectsPage() {
  const projects = getPublishedProjects();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 flex flex-col items-center p-4 sm:p-12 relative overflow-x-hidden w-full max-w-full outline-none"
    >
      {/* Background Geometric Grid Pattern */}
      <div className="absolute inset-0 bg-geometric-pattern opacity-20 pointer-events-none -z-10" />

      <div className="z-10 w-full max-w-4xl flex flex-col gap-8">
        {/* Page heading */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <span className="text-neon-cyan">◈</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">Projects</h1>
        </div>

        <ol className="flex flex-col gap-6 list-none">
          {projects.map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
