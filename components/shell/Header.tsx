import Link from 'next/link';

export function Header() {
  return (
    <header
      role="banner"
      className="sticky top-0 z-40 w-full border-b border-white/10 bg-void-black/80 backdrop-blur-md transition-colors motion-reduce:transition-none"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-6">
        {/* Brand / Logo */}
        <Link
          href="/"
          className="group inline-flex items-center gap-1.5 font-display text-sm sm:text-base md:text-lg font-bold tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-black rounded-sm min-h-[44px]"
        >
          <span className="text-neon-cyan transition-transform group-hover:scale-110 motion-reduce:transform-none">
            ◈
          </span>
          <span>SUFIYAN SHAIKH</span>
        </Link>

        {/* Navigation Landmark */}
        <nav aria-label="Main navigation">
          <ul className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium">
            <li>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-2.5 py-2 text-gray-300 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-black rounded-sm transition-colors motion-reduce:transition-none min-h-[44px]"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="inline-flex items-center justify-center px-2.5 py-2 text-gray-300 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-black rounded-sm transition-colors motion-reduce:transition-none min-h-[44px]"
              >
                About
              </Link>
            </li>
            <li>
              <Link
                href="/projects"
                className="inline-flex items-center justify-center px-2.5 py-2 text-gray-300 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-black rounded-sm transition-colors motion-reduce:transition-none min-h-[44px]"
              >
                Projects
              </Link>
            </li>
            <li>
              <Link
                href="/skills"
                className="inline-flex items-center justify-center px-2.5 py-2 text-gray-300 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-black rounded-sm transition-colors motion-reduce:transition-none min-h-[44px]"
              >
                Skills
              </Link>
            </li>
            <li>
              <Link
                href="/experience"
                className="inline-flex items-center justify-center px-2.5 py-2 text-gray-300 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-black rounded-sm transition-colors motion-reduce:transition-none min-h-[44px]"
              >
                Experience
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/sufiyanshaikh06"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-2.5 py-2 text-gray-300 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-black rounded-sm transition-colors motion-reduce:transition-none min-h-[44px]"
                aria-label="GitHub Profile (opens in new tab)"
              >
                GitHub ↗
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
