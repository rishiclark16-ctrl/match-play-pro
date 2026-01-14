import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  /** Custom header content - will be wrapped with safe area padding */
  header?: ReactNode;
  /** Whether to hide bottom nav spacing (for pages like Scorecard, NewRound) */
  hideBottomNav?: boolean;
  /** Additional className for the root container */
  className?: string;
  /** Background element to render behind content */
  background?: ReactNode;
  /** Additional className for the main scrollable area */
  mainClassName?: string;
  /** Disable scrolling on main content */
  disableScroll?: boolean;
}

/**
 * AppLayout - Unified layout component for consistent safe area handling
 * 
 * Handles:
 * - Safe area inset at top (notch/status bar)
 * - Safe area inset at bottom (home indicator)
 * - Bottom navigation spacing when applicable
 * - Consistent scroll behavior
 * 
 * Usage:
 * ```tsx
 * <AppLayout
 *   header={<div className="px-4 pb-2">Header Content</div>}
 *   background={<GeometricBackground />}
 * >
 *   <div className="px-4">Page Content</div>
 * </AppLayout>
 * ```
 */
export function AppLayout({
  children,
  header,
  hideBottomNav = false,
  className,
  background,
  mainClassName,
  disableScroll = false,
}: AppLayoutProps) {
  return (
    <div className={cn("h-screen flex flex-col overflow-hidden bg-background relative", className)}>
      {/* Background layer */}
      {background}

      {/* Fixed Header */}
      {header && (
        <header className="flex-shrink-0 relative z-10">
          {header}
        </header>
      )}

      {/* Scrollable Content Area */}
      <main
        className={cn(
          "flex-1 min-h-0 relative z-10",
          !disableScroll && "overflow-y-auto overscroll-y-contain",
          disableScroll && "overflow-hidden",
          !hideBottomNav && "pb-nav",
          hideBottomNav && "pb-safe",
          mainClassName
        )}
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </main>
    </div>
  );
}

/**
 * Pre-styled header wrapper for common header patterns
 */
interface HeaderContentProps {
  children: ReactNode;
  className?: string;
  /** Add bottom border */
  bordered?: boolean;
  /** Add blur background */
  blur?: boolean;
}

export function HeaderContent({ children, className, bordered, blur }: HeaderContentProps) {
  return (
    <div
      className={cn(
        "px-4 pb-2",
        bordered && "border-b border-border",
        blur && "bg-background/80 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
