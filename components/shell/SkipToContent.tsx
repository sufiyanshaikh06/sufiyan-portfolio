export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-neon-cyan focus:text-void-black focus:font-bold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white transition-all motion-reduce:transition-none"
    >
      Skip to main content
    </a>
  );
}
