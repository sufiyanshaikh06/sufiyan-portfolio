import type { Metadata } from 'next';
import { getSkillCategories, getSeoEntryForRoute } from '@/lib/content';
import { SkillCategorySection } from '@/components/content/SkillCategorySection';

export const dynamic = 'error';
export const revalidate = false;

export function generateMetadata(): Metadata {
  const seo = getSeoEntryForRoute('/skills');
  const title = seo?.title ?? 'Skills | Sufiyan Shaikh';
  const description =
    seo?.description ??
    'Technical skills and proficiency levels of Sufiyan Shaikh across frontend, backend, AI, and systems engineering.';
  return {
    title,
    description,
    alternates: { canonical: '/skills' },
    openGraph: { title, description, url: '/skills', type: 'website' },
  };
}

export default function SkillsPage() {
  const skillCategories = getSkillCategories();

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
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">Skills</h1>
        </div>

        {skillCategories.length > 0 && (
          <div className="flex flex-col gap-6">
            {skillCategories.map((category) => (
              <SkillCategorySection key={category.name} category={category} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
