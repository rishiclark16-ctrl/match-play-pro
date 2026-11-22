import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Users, Plus, BarChart3, User } from 'lucide-react';
import { hapticLight } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/social', icon: Users, label: 'Social' },
  { to: '/new-round', icon: Plus, label: 'New', isCenter: true },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
  { to: '/profile', icon: User, label: 'Profile' },
];

// Routes where bottom nav should be hidden
const HIDDEN_ROUTES = ['/new-round', '/auth', '/onboarding', '/my-formats/confirm'];

export function BottomNav() {
  const location = useLocation();

  // Check if we should hide the nav
  const shouldHide = HIDDEN_ROUTES.some(route => location.pathname === route) ||
    location.pathname.startsWith('/round/') ||
    location.pathname.startsWith('/watch/') ||
    location.pathname.endsWith('/house-game/confirm');

  if (shouldHide) return null;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border"
      style={{
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        paddingBottom: '34px',
      }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.to);

          if (item.isCenter) {
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label="New round"
                onClick={() => hapticLight()}
                className="flex items-center justify-center min-w-[56px] min-h-[56px] px-2 touch-manipulation cursor-pointer select-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  className="w-14 h-14 rounded-[20px] bg-gold flex items-center justify-center shadow-[0_6px_18px_rgba(20,83,45,0.18)] ring-1 ring-primary/10"
                >
                  <item.icon className="w-6 h-6 text-primary" strokeWidth={2.5} />
                </motion.div>
              </Link>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              onClick={() => hapticLight()}
              className="flex flex-col items-center justify-center gap-1 min-w-[60px] min-h-[56px] px-1 touch-manipulation cursor-pointer select-none active:scale-95 transition-transform"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span
                className={cn(
                  'flex items-center justify-center w-12 h-8 rounded-full transition-colors',
                  active ? 'bg-primary/10' : 'bg-transparent'
                )}
              >
                <item.icon
                  className={cn('w-[22px] h-[22px] transition-colors', active ? 'text-primary' : 'text-muted-foreground')}
                  strokeWidth={active ? 2.4 : 1.9}
                />
              </span>
              <span
                className={cn(
                  'text-[11px] leading-none transition-colors',
                  active ? 'font-semibold text-primary' : 'font-medium text-muted-foreground'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
