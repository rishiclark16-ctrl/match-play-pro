import { cn } from '@/lib/utils';

interface GeometricBackgroundProps {
  variant?: 'grid' | 'minimal' | 'header';
  className?: string;
}

export function GeometricBackground({ variant = 'grid', className }: GeometricBackgroundProps) {
  if (variant === 'minimal') {
    return null;
  }

  if (variant === 'header') {
    return (
      <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary/20" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary/10" />
      </div>
    );
  }

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      <div 
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />
      <div 
        className="absolute top-0 left-0 right-0 h-48"
        style={{ background: 'radial-gradient(ellipse at top center, hsl(var(--primary) / 0.03), transparent 70%)' }}
      />
    </div>
  );
}

export function GeometricAccent({ className }: { className?: string }): null {
  return null; // Removed for cleaner design
}
