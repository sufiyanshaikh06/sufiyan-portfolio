import type { Metadata } from 'next';
import { getExperiences, getSeoEntryForRoute } from '@/lib/content';
import { ExperienceSection } from '@/components/content/ExperienceSection';

export const dynamic = 'error';
export const revalidate = false;

export function generateMetadata(): Metadata {
  const seo = getSeoEntryForRoute('/experience');
  const title = seo?.title ?? 'Experience | Sufiyan Shaikh';
  const description =
    seo?.description ??
    'Professional and volunteer experience of Sufiyan Shaikh in software engineering, AI, and systems development.';
  return {
    title,
    description,
    alternates: { canonical: '/experience' },
    openGraph: { title, description, url: '/experience', type: 'website' },
  };
}

export default function ExperiencePage() {
  const experiences = getExperiences();

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
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">Experience</h1>
        </div>

        {experiences.length > 0 && (
          <ExperienceSection entries={experiences} />
        )}
      </div>
    </main>
  );
}
