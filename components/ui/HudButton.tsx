import Link from 'next/link';

interface HudButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  href?: string;
  target?: string;
  rel?: string;
}

export const HudButton: React.FC<HudButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  href,
  target,
  rel,
  ...props 
}) => {
  const baseStyles = "relative inline-flex items-center justify-center px-6 py-3 font-display text-sm uppercase tracking-widest transition-all duration-300 clip-hud-button active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 min-h-[44px] min-w-[44px]";
  
  const variants = {
    primary: "bg-neon-cyan text-void-black hover:bg-white hover:text-void-black hover:border-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-cyan",
    secondary: "bg-electric-violet text-white hover:bg-white hover:text-void-black hover:border-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-violet",
    outline: "bg-transparent border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-void-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-cyan",
  };

  const combinedClasses = `${baseStyles} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} target={target} rel={rel} className={combinedClasses}>
        <span className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 translate-y-[-100%] hover:translate-y-[100%] transition-transform duration-1000 ease-linear pointer-events-none motion-reduce:hidden" />
        {children}
      </Link>
    );
  }

  return (
    <button 
      className={combinedClasses}
      {...props}
    >
      <span className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 translate-y-[-100%] hover:translate-y-[100%] transition-transform duration-1000 ease-linear pointer-events-none motion-reduce:hidden" />
      {children}
    </button>
  );
};
