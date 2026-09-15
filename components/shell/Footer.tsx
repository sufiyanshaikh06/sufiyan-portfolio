export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      className="w-full border-t border-white/10 bg-void-black/90 py-8 text-center text-sm text-gray-400"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <p className="font-mono text-xs text-gray-500">
          © {currentYear} Sufiyan Shaikh. All rights reserved.
        </p>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/sufiyanshaikh06"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-gray-400 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan rounded-sm transition-colors motion-reduce:transition-none min-h-[44px] min-w-[44px] justify-center"
            aria-label="Sufiyan Shaikh on GitHub (opens in new tab)"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
