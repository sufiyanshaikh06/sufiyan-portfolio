import type { ProjectCaseStudy } from '@/lib/types/content';
import { HudCard } from '@/components/ui/HudCard';
import Link from 'next/link';

interface ProjectCardProps {
  project: Readonly<ProjectCaseStudy>;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <HudCard className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-white">
          {project.title}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono uppercase tracking-wider text-gray-400">
            [ {project.category} ]
          </span>
          <span className="px-2 py-0.5 text-xs font-mono uppercase bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded">
            {project.tier}
          </span>
        </div>
      </div>

      {project.subtitle && (
        <p className="text-sm font-medium text-neon-cyan/80">{project.subtitle}</p>
      )}

      <p className="font-sans text-sm text-gray-300 leading-relaxed line-clamp-3">
        {project.description}
      </p>

      <div>
        <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">
          Technologies
        </h3>
        <ul className="flex flex-wrap gap-2" aria-label={`${project.title} technologies`}>
          {project.technologies.map((tech, i) => (
            <li
              key={`${project.slug}-tech-${i}`}
              className="px-2.5 py-1 text-xs font-mono bg-white/5 border border-white/10 rounded text-gray-300"
            >
              {tech}
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-2">
        <Link
          href={`/projects/${project.slug}`}
          className="inline-flex items-center gap-2 text-sm font-mono text-neon-cyan hover:text-white transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-neon-cyan rounded-sm min-h-[44px] px-1"
        >
          View Case Study →
        </Link>
      </div>
    </HudCard>
  );
}
