import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Users, Plus, BarChart3, User } from 'lucide-react';
import { hapticLight } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/friends', icon: Users, label: 'Friends' },
  { to: '/new-round', icon: Plus, label: 'New', isCenter: true },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
  { to: '/profile', icon: User, label: 'Profile' },
];

// Routes where bottom nav should be hidden
const HIDDEN_ROUTES = ['/new-round', '/auth'];

export function BottomNav() {
  const location = useLocation();
  
  // Check if we should hide the nav
  const shouldHide = HIDDEN_ROUTES.some(route => location.pathname === route) ||
    location.pathname.startsWith('/round/');
  
  if (shouldHide) return null;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background">
      {/* Gradient fade above nav */}
      <div className="h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      
      <div className="bg-background border-t border-border pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const active = isActive(item.to);
            
            if (item.isCenter) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => hapticLight()}
                  className="flex flex-col items-center justify-center -mt-6"
                >
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center"
                  >
                    <Plus className="w-7 h-7 text-primary-foreground" strokeWidth={2.5} />
                  </motion.div>
                </Link>
              );
            }
            
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => hapticLight()}
                className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px]"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "relative p-2 rounded-xl transition-colors",
                    active ? "bg-primary/10" : ""
                  )}
                >
                  <item.icon 
                    className={cn(
                      "w-5 h-5 transition-colors",
                      active ? "text-primary" : "text-muted-foreground"
                    )} 
                    strokeWidth={active ? 2.5 : 2}
                  />
                </motion.div>
                <span className={cn(
                  "text-[10px] font-semibold uppercase tracking-widest transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
