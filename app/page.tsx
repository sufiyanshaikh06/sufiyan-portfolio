import { HudButton } from "@/components/ui/HudButton";
import { HudCard } from "@/components/ui/HudCard";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-geometric-pattern opacity-20 pointer-events-none -z-10" />

      <div className="z-10 flex flex-col items-center gap-8 max-w-4xl text-center">
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tighter text-white">
          SUFIYAN <span className="text-neon-cyan text-glow-cyan">SHAIKH</span>
        </h1>
        
        <p className="font-sans text-xl text-gray-400 max-w-2xl">
          Computer Science Student | Aspiring AI/ML Engineer | Building Intelligent Software and Connected Systems
        </p>

        <div className="flex gap-4 mt-4">
          <HudButton variant="primary">Explore Works</HudButton>
          <HudButton variant="outline">Contact Me</HudButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 w-full text-left">
          <HudCard>
            <h3 className="font-display text-xl text-neon-cyan mb-2">Featured Project</h3>
            <p className="font-sans text-gray-300 text-sm">Integrum - Smart Student Success Platform</p>
          </HudCard>
          <HudCard>
            <h3 className="font-display text-xl text-electric-violet mb-2 text-glow-violet">Current Focus</h3>
            <p className="font-sans text-gray-300 text-sm">Machine Learning, LLMs, and high-performance web systems.</p>
          </HudCard>
        </div>
      </div>
    </main>
  );
}
