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
const HIDDEN_ROUTES = ['/new-round', '/auth', '/my-formats/confirm'];

export function BottomNav() {
  const location = useLocation();

  // Check if we should hide the nav
  const shouldHide = HIDDEN_ROUTES.some(route => location.pathname === route) ||
    location.pathname.startsWith('/round/') ||
    location.pathname.endsWith('/house-game/confirm');

  if (shouldHide) return null;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card"
      style={{
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        paddingBottom: '34px',
        borderTop: '1px solid rgba(0,0,0,0.06)',
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
                onClick={() => hapticLight()}
                className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[56px] px-3 py-2 touch-manipulation cursor-pointer select-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="w-14 h-14 rounded-full bg-[#F0EE3A] flex items-center justify-center shadow-[0_4px_16px_rgba(240,238,58,0.4)]"
                >
                  <item.icon
                    className="w-[22px] h-[22px] text-foreground"
                    strokeWidth={2.5}
                  />
                </motion.div>
              </Link>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => hapticLight()}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[56px] px-2 py-2 touch-manipulation cursor-pointer select-none active:scale-95 transition-transform"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="flex flex-col items-center gap-0.5 px-3 py-1">
                <item.icon
                  className={cn(
                    "w-[22px] h-[22px] transition-colors",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                  strokeWidth={active ? 2.5 : 1.75}
                />
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-[0.08em] transition-colors",
                  active ? "text-foreground" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </div>
              {active && (
                <span className="w-1 h-1 rounded-full bg-[#F0EE3A] mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
