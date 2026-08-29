import React from 'react';

interface HudCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowOnHover?: boolean;
}

export const HudCard: React.FC<HudCardProps> = ({ 
  children, 
  glowOnHover = true,
  className = '', 
  ...props 
}) => {
  return (
    <div 
      className={`relative bg-card-slate border border-emissive-border/50 p-6 clip-hud-corner transition-all duration-300 motion-reduce:transition-none ${
        glowOnHover ? 'hover:border-neon-cyan hover:border-glow' : ''
      } ${className}`}
      {...props}
    >
      {/* Decorative corner brackets */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-neon-cyan/70 pointer-events-none" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-neon-cyan/70 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-neon-cyan/70 pointer-events-none" />
      
      {children}
    </div>
  );
};
