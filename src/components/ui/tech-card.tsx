import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface TechCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'highlighted' | 'winner';
  corners?: boolean;
  hover?: boolean;
  accentBar?: 'top' | 'left' | 'none';
}

const TechCard = React.forwardRef<HTMLDivElement, TechCardProps>(
  ({ className, children, variant = 'default', corners = false, hover = false, accentBar = 'none', ...props }, ref) => {
    const variants = {
      default: "bg-card border border-border",
      elevated: "bg-card border border-border shadow-md",
      highlighted: "bg-card border-2 border-primary/30 shadow-sm",
      winner: "bg-gradient-to-br from-gold/5 to-gold/10 border-2 border-gold/40",
    };

    const accentStyles = {
      top: "before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-primary before:rounded-t-xl",
      left: "before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-primary before:rounded-l-xl",
      none: "",
    };

    return (
      <motion.div
        ref={ref}
        whileHover={hover ? { y: -1, transition: { duration: 0.15 } } : undefined}
        whileTap={hover ? { scale: 0.995 } : undefined}
        className={cn(
          "rounded-xl relative overflow-hidden",
          variants[variant],
          accentStyles[accentBar],
          hover && "cursor-pointer hover:shadow-lg hover:border-primary/20 transition-shadow",
          className
        )}
        {...props}
      >
        {/* Corner accent brackets */}
        {corners && (
          <>
            <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-primary/40" />
            <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-primary/20" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-primary/20" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-primary/10" />
          </>
        )}
        {children}
      </motion.div>
    );
  }
);
TechCard.displayName = "TechCard";

// Header for tech cards
const TechCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-5", className)}
    {...props}
  />
));
TechCardHeader.displayName = "TechCardHeader";

// Content area
const TechCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4", className)} {...props} />
));
TechCardContent.displayName = "TechCardContent";

// Data row for displaying key-value pairs
const TechCardDataRow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { label: string; value: React.ReactNode }
>(({ className, label, value, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between py-2 border-b border-border/50 last:border-0", className)}
    {...props}
  >
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="font-semibold tabular-nums">{value}</span>
  </div>
));
TechCardDataRow.displayName = "TechCardDataRow";

// Footer with border
const TechCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-5 py-3 border-t border-border bg-muted/30", className)}
    {...props}
  />
));
TechCardFooter.displayName = "TechCardFooter";

export { TechCard, TechCardHeader, TechCardContent, TechCardDataRow, TechCardFooter };
