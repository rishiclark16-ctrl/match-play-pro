import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'subtle';
  glow?: boolean;
  hover?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, variant = 'default', glow = false, hover = false, ...props }, ref) => {
    const variants = {
      default: "bg-card/80 backdrop-blur-xl border border-border/50 shadow-lg",
      elevated: "bg-card/90 backdrop-blur-2xl border border-border/30 shadow-xl shadow-primary/5",
      subtle: "bg-card/60 backdrop-blur-md border border-border/30 shadow-md",
    };

    return (
      <motion.div
        ref={ref}
        whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
        whileTap={hover ? { scale: 0.99 } : undefined}
        className={cn(
          "rounded-2xl transition-all duration-300",
          variants[variant],
          glow && "ring-1 ring-primary/10",
          hover && "cursor-pointer hover:shadow-xl hover:border-primary/20",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
GlassCard.displayName = "GlassCard";

// Header variant for winner cards, etc.
const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
GlassCardHeader.displayName = "GlassCardHeader";

const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
GlassCardContent.displayName = "GlassCardContent";

export { GlassCard, GlassCardHeader, GlassCardContent };
