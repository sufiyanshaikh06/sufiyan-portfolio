import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getProjectBySlug, getPublishedProjectSlugs } from '@/lib/content';
import { HudCard } from '@/components/ui/HudCard';

export const dynamic = 'error';
export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  const slugs = getPublishedProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }

  const title = `${project.title} — Case Study`;
  const description = project.description;
  const canonicalUrl = `/projects/${project.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'article',
    },
  };
}

export default async function ProjectCaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 flex flex-col items-center p-4 sm:p-12 relative overflow-x-hidden w-full max-w-full outline-none"
    >
      {/* Background Geometric Grid Pattern */}
      <div className="absolute inset-0 bg-geometric-pattern opacity-20 pointer-events-none -z-10" />

      <article className="max-w-4xl w-full flex flex-col gap-8">
        {/* Navigation Breadcrumb / Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-mono text-neon-cyan hover:text-white transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-neon-cyan rounded-sm p-1 min-h-[44px]"
          >
            <span>←</span>
            <span>Return to Portfolio Overview</span>
          </Link>
        </div>

        {/* Header Block */}
        <header className="flex flex-col gap-3 border-b border-white/10 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-neon-cyan">
              [ Case Study // {project.category} ]
            </span>
            <span className="px-2.5 py-0.5 text-xs font-mono uppercase bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded">
              Tier: {project.tier}
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
            {project.title}
          </h1>

          {project.subtitle && (
            <p className="font-sans text-xl sm:text-2xl text-gray-400">
              {project.subtitle}
            </p>
          )}
        </header>

        {/* Featured Image */}
        {project.featuredAsset && (
          <div className="w-full aspect-video rounded-lg overflow-hidden border border-emissive-border/50 bg-card-slate shadow-[0_0_30px_rgba(0,240,255,0.15)] relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.featuredAsset.localPath}
              width={project.featuredAsset.width}
              height={project.featuredAsset.height}
              alt={project.featuredAsset.altText}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        )}

        {/* Executive Summary Card */}
        <HudCard>
          <h2 className="font-display text-xl font-bold text-neon-cyan mb-3 flex items-center gap-2">
            <span>◈</span>
            <span>Project Summary & Verified Architecture</span>
          </h2>
          <p className="font-sans text-base sm:text-lg text-gray-200 leading-relaxed">
            {project.description}
          </p>

          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-3">
              Core Technology Stack
            </h3>
            <ul className="flex flex-wrap gap-2" aria-label="Core technology stack">
              {project.technologies.map((tech) => (
                <li
                  key={tech}
                  className="px-3 py-1 text-xs font-mono bg-white/5 border border-white/10 rounded text-gray-200"
                >
                  {tech}
                </li>
              ))}
            </ul>
          </div>
        </HudCard>

        {/* Structured Sections */}
        <section aria-labelledby="detailed-sections-heading" className="flex flex-col gap-6">
          <h2 id="detailed-sections-heading" className="sr-only">
            Case Study Sections
          </h2>

          {project.sections.map((section) => (
            <HudCard key={section.id} className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-neon-cyan text-sm">#{section.displayOrder}</span>
                  <span>{section.title}</span>
                </h3>
              </div>

              <div className="font-sans text-gray-300 leading-relaxed text-base space-y-4">
                <p>{section.content}</p>
              </div>

              {section.media && section.media.length > 0 && (
                <div className="grid grid-cols-1 gap-4 mt-2">
                  {section.media.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded border border-white/10 overflow-hidden bg-void-black/60"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.localPath}
                        width={item.width}
                        height={item.height}
                        alt={item.altText}
                        className="w-full h-auto object-contain"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
            </HudCard>
          ))}
        </section>

        {/* External Links (Conditional) */}
        {(project.demoUrl || project.githubUrl) && (
          <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 font-display text-sm uppercase tracking-widest bg-neon-cyan text-void-black hover:bg-white transition-colors rounded clip-hud-button min-h-[44px]"
              >
                Launch Live Demo ↗
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 font-display text-sm uppercase tracking-widest border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-void-black transition-colors rounded clip-hud-button min-h-[44px]"
              >
                View Repository ↗
              </a>
            )}
          </div>
        )}

        {/* Back Link Footer */}
        <div className="pt-8 border-t border-white/10 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-mono text-gray-400 hover:text-neon-cyan transition-colors min-h-[44px] px-4"
          >
            <span>← Back to Home</span>
          </Link>
        </div>
      </article>
    </main>
  );
}
