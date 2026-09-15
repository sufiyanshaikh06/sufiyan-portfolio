import { getSnapshot } from '@/lib/content';
import { HudButton } from '@/components/ui/HudButton';
import { HudCard } from '@/components/ui/HudCard';

export const dynamic = 'error';
export const revalidate = false;

export default function Home() {
  const { profile, integrum } = getSnapshot();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 flex flex-col items-center justify-center p-4 sm:p-12 relative overflow-x-hidden w-full max-w-full outline-none"
    >
      {/* Background Geometric Grid Pattern */}
      <div className="absolute inset-0 bg-geometric-pattern opacity-20 pointer-events-none -z-10" />

      <div className="z-10 flex flex-col items-center gap-10 max-w-5xl w-full text-center">
        {/* Static CSS/SVG Geometric Magic-Circle & Portrait */}
        <div className="relative flex items-center justify-center w-48 h-48 sm:w-56 sm:h-56 my-2">
          {/* Outer SVG Magic Circle Accent */}
          <svg
            className="absolute inset-0 w-full h-full text-neon-cyan/40 animate-spin motion-reduce:animate-none pointer-events-none"
            style={{ animationDuration: '30s' }}
            viewBox="0 0 200 200"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="100"
              cy="100"
              r="94"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="8 6"
            />
            <circle
              cx="100"
              cy="100"
              r="84"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 8"
            />
            <polygon
              points="100,6 104,14 96,14"
              fill="currentColor"
            />
            <polygon
              points="100,194 104,186 96,186"
              fill="currentColor"
            />
          </svg>

          {/* Inner Emissive Frame with Avatar */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-2 border-neon-cyan p-1 bg-void-black shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar.localPath}
                width={profile.avatar.width}
                height={profile.avatar.height}
                alt={profile.avatar.altText}
                className="w-full h-full object-cover rounded-full"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-card-slate flex items-center justify-center font-mono text-neon-cyan text-xs">
                [PORTRAIT]
              </div>
            )}
          </div>
        </div>

        {/* Identity & Verified Claims */}
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono tracking-wider uppercase bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded">
            <span>SYS.VERIFIED</span>
            <span>{"//"}</span>
            <span>PORTFOLIO_V1</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white">
            {profile.fullName.toUpperCase()}
          </h1>

          <p className="font-sans text-lg sm:text-xl text-neon-cyan/90 font-medium max-w-2xl">
            {profile.headline}
          </p>

          <p className="font-sans text-sm sm:text-base text-gray-400 max-w-2xl">
            {profile.bio}
          </p>
        </div>

        {/* Hero Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
          <HudButton variant="primary" href="/projects/integrum">
            Explore Integrum Case Study →
          </HudButton>
          <HudButton
            variant="outline"
            href="https://github.com/sufiyanshaikh06"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View Sufiyan Shaikh on GitHub (opens in new tab)"
          >
            GitHub Profile ↗
          </HudButton>
        </div>

        {/* Featured Project Section */}
        <section
          aria-labelledby="featured-project-heading"
          className="w-full max-w-4xl mt-8 text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              id="featured-project-heading"
              className="font-display text-xl sm:text-2xl font-bold text-white flex items-center gap-2"
            >
              <span className="text-neon-cyan">◈</span>
              <span>Featured Project</span>
            </h2>
            <span className="text-xs font-mono uppercase text-gray-500">
              [ {integrum.category} ]
            </span>
          </div>

          <HudCard className="overflow-hidden">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {integrum.featuredAsset && (
                <div className="w-full md:w-1/2 aspect-video relative rounded overflow-hidden border border-white/10 bg-void-black shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={integrum.featuredAsset.localPath}
                    width={integrum.featuredAsset.width}
                    height={integrum.featuredAsset.height}
                    alt={integrum.featuredAsset.altText}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="flex-1 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-2xl font-bold text-white">
                      {integrum.title}
                    </h3>
                    <span className="px-2 py-0.5 text-xs font-mono uppercase bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded">
                      {integrum.tier}
                    </span>
                  </div>

                  {integrum.subtitle && (
                    <p className="text-sm font-medium text-neon-cyan/80 mt-1">
                      {integrum.subtitle}
                    </p>
                  )}

                  <p className="text-sm text-gray-300 mt-3 leading-relaxed">
                    {integrum.description}
                  </p>
                </div>

                <div className="mt-6">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">
                    Technologies
                  </h4>
                  <ul className="flex flex-wrap gap-2" aria-label="Project technologies">
                    {integrum.technologies.map((tech) => (
                      <li
                        key={tech}
                        className="px-2.5 py-1 text-xs font-mono bg-white/5 border border-white/10 rounded text-gray-300"
                      >
                        {tech}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    <HudButton variant="primary" href="/projects/integrum">
                      Read Full Case Study
                    </HudButton>
                  </div>
                </div>
              </div>
            </div>
          </HudCard>
        </section>
      </div>
    </main>
  );
}
