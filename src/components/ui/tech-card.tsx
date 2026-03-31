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
      elevated: "bg-card border border-border",
      highlighted: "bg-card border border-border",
      winner: "bg-card border-2 border-gold",
    };

    const accentStyles = {
      top: "before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-foreground before:rounded-t-xl",
      left: "before:absolute before:top-0 before:bottom-0 before:left-0 before:w-[3px] before:bg-foreground",
      none: "",
    };

    return (
      <motion.div
        ref={ref}
        whileTap={hover ? { scale: 0.99 } : undefined}
        className={cn(
          "rounded-xl relative overflow-hidden",
          variants[variant],
          accentStyles[accentBar],
          hover && "cursor-pointer active:bg-muted/30 transition-colors",
          className
        )}
        {...props}
      >
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
