import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GeometricBackgroundProps {
  variant?: 'dots' | 'grid' | 'radial' | 'mesh';
  className?: string;
  animated?: boolean;
}

export function GeometricBackground({ 
  variant = 'radial', 
  className,
  animated = true 
}: GeometricBackgroundProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {/* Base gradient */}
      {variant === 'radial' && (
        <div className="absolute inset-0 bg-gradient-radial opacity-60" />
      )}
      
      {variant === 'mesh' && (
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
        </div>
      )}
      
      {/* Geometric patterns */}
      {variant === 'dots' && (
        <div className="absolute inset-0 geometric-dots opacity-50" />
      )}
      
      {variant === 'grid' && (
        <div className="absolute inset-0 geometric-grid opacity-30" />
      )}
      
      {/* Floating geometric shapes */}
      {animated && (
        <>
          {/* Hexagon shape */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0.1, 0.2, 0.1],
              scale: [0.8, 1, 0.8],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              duration: 20, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute top-20 right-10 w-32 h-32 border border-primary/10 rounded-3xl"
            style={{ transform: 'rotate(45deg)' }}
          />
          
          {/* Circle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.05, 0.15, 0.05],
              y: [0, -20, 0]
            }}
            transition={{ 
              duration: 15, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute bottom-40 left-10 w-24 h-24 border border-primary/10 rounded-full"
          />
          
          {/* Small diamond */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.08, 0.2, 0.08],
              rotate: [45, 135, 45]
            }}
            transition={{ 
              duration: 12, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute top-1/3 left-1/4 w-8 h-8 bg-primary/5 rounded-sm"
          />
          
          {/* Golf flag inspired shape */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.1, 0.2, 0.1],
              x: [0, 10, 0]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute top-1/2 right-1/4 w-1 h-16 bg-gradient-to-b from-primary/20 to-transparent rounded-full"
          />
        </>
      )}
    </div>
  );
}

// Simpler version for cards/sections
export function GeometricAccent({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-primary/3 rounded-full blur-3xl" />
      <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-primary/2 rounded-full blur-3xl" />
    </div>
  );
}
