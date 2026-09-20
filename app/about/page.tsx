import type { Metadata } from 'next';
import {
  getPublishedProfile,
  getEducation,
  getCertifications,
  getAchievements,
  getSeoEntryForRoute,
} from '@/lib/content';
import { EducationSection } from '@/components/content/EducationSection';
import { CertificationSection } from '@/components/content/CertificationSection';
import { AchievementSection } from '@/components/content/AchievementSection';

export const dynamic = 'error';
export const revalidate = false;

export function generateMetadata(): Metadata {
  const seo = getSeoEntryForRoute('/about');
  const title = seo?.title ?? 'About | Sufiyan Shaikh';
  const description =
    seo?.description ??
    'Profile, education, certifications, and achievements of Sufiyan Shaikh, Computer Science student and software engineer.';
  return {
    title,
    description,
    alternates: { canonical: '/about' },
    openGraph: { title, description, url: '/about', type: 'website' },
  };
}

export default function AboutPage() {
  const profile = getPublishedProfile();
  const education = getEducation();
  const certifications = getCertifications();
  const achievements = getAchievements();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 flex flex-col items-center p-4 sm:p-12 relative overflow-x-hidden w-full max-w-full outline-none"
    >
      {/* Background Geometric Grid Pattern */}
      <div className="absolute inset-0 bg-geometric-pattern opacity-20 pointer-events-none -z-10" />

      <div className="z-10 w-full max-w-4xl flex flex-col gap-10">
        {/* Page heading */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <span className="text-neon-cyan">◈</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">About</h1>
        </div>

        {/* Profile Section */}
        <section aria-labelledby="about-profile-heading">
          <h2
            id="about-profile-heading"
            className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2"
          >
            <span className="text-neon-cyan text-sm">◈</span>
            Profile
          </h2>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {profile.avatar && (
              <div className="shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-neon-cyan/50 bg-void-black shadow-[0_0_16px_rgba(0,240,255,0.2)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.avatar.localPath}
                  width={profile.avatar.width ?? undefined}
                  height={profile.avatar.height ?? undefined}
                  alt={profile.avatar.altText}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <p className="font-display text-2xl font-bold text-white">{profile.fullName}</p>
                <p className="text-sm font-medium text-neon-cyan/80 mt-0.5">{profile.headline}</p>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">{profile.bio}</p>

              <div className="flex flex-wrap gap-3 mt-1">
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub profile (opens in new tab)"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-white/20 text-gray-300 hover:text-neon-cyan hover:border-neon-cyan transition-colors motion-reduce:transition-none rounded-sm focus-visible:ring-2 focus-visible:ring-neon-cyan min-h-[44px]"
                >
                  GitHub ↗
                </a>
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn profile (opens in new tab)"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-white/20 text-gray-300 hover:text-neon-cyan hover:border-neon-cyan transition-colors motion-reduce:transition-none rounded-sm focus-visible:ring-2 focus-visible:ring-neon-cyan min-h-[44px]"
                  >
                    LinkedIn ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Education Section — omitted when empty */}
        {education.length > 0 && (
          <section aria-labelledby="about-education-heading">
            <h2
              id="about-education-heading"
              className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2"
            >
              <span className="text-neon-cyan text-sm">◈</span>
              Education
            </h2>
            <EducationSection entries={education} />
          </section>
        )}

        {/* Certifications Section — omitted when empty */}
        {certifications.length > 0 && (
          <section aria-labelledby="about-certifications-heading">
            <h2
              id="about-certifications-heading"
              className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2"
            >
              <span className="text-neon-cyan text-sm">◈</span>
              Certifications
            </h2>
            <CertificationSection entries={certifications} />
          </section>
        )}

        {/* Achievements Section — omitted when empty */}
        {achievements.length > 0 && (
          <section aria-labelledby="about-achievements-heading">
            <h2
              id="about-achievements-heading"
              className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2"
            >
              <span className="text-neon-cyan text-sm">◈</span>
              Achievements
            </h2>
            <AchievementSection entries={achievements} />
          </section>
        )}
      </div>
    </main>
  );
}
