import * as React from 'react';

/**
 * AppBackground - Precision Tech grid background
 * Provides consistent visual branding across all pages.
 */
export function AppBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Subtle grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      
      {/* Top gradient accent */}
      <div 
        className="absolute top-0 left-0 right-0 h-80"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--primary) / 0.04) 0%, transparent 100%)',
        }}
      />
      
      {/* Corner accents */}
      <div className="absolute top-6 left-6 w-12 h-12 border-l-2 border-t-2 border-primary/20" />
      <div className="absolute top-6 right-6 w-12 h-12 border-r-2 border-t-2 border-primary/10" />
      
      {/* Data line */}
      <div className="absolute top-32 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}
