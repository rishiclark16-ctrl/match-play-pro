import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Trophy, Target, TrendingUp, Calendar } from 'lucide-react';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
import { GeometricBackground } from '@/components/ui/geometric-background';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Stats {
  totalRounds: number;
  completedRounds: number;
  activeRounds: number;
}

export default function Stats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalRounds: 0, completedRounds: 0, activeRounds: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      
      try {
        // Get all rounds the user is part of
        const { data: playerData } = await supabase
          .from('players')
          .select('round_id')
          .eq('profile_id', user.id);
        
        if (playerData && playerData.length > 0) {
          const roundIds = playerData.map(p => p.round_id).filter(Boolean);
          
          const { data: roundsData } = await supabase
            .from('rounds')
            .select('status')
            .in('id', roundIds);
          
          if (roundsData) {
            const completed = roundsData.filter(r => r.status === 'complete').length;
            const active = roundsData.filter(r => r.status === 'active').length;
            
            setStats({
              totalRounds: roundsData.length,
              completedRounds: completed,
              activeRounds: active,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, [user]);

  const statCards = [
    { 
      icon: Trophy, 
      label: 'Total Rounds', 
      value: stats.totalRounds,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    { 
      icon: Target, 
      label: 'Completed', 
      value: stats.completedRounds,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    { 
      icon: TrendingUp, 
      label: 'Active', 
      value: stats.activeRounds,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <div className="min-h-screen bg-background pt-safe pb-24 relative">
      <GeometricBackground />
      
      {/* Header */}
      <header className="relative z-10 px-6 pt-14 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Stats</h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Your Golf History
            </p>
          </div>
        </motion.div>
      </header>

      {/* Stats Grid */}
      <main className="relative z-10 px-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <TechCard className="h-full">
                <TechCardContent className="flex flex-col items-center justify-center py-4 text-center">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-2", stat.bgColor)}>
                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                  <span className="text-2xl font-black tabular-nums text-foreground">
                    {loading ? '-' : stat.value}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {stat.label}
                  </span>
                </TechCardContent>
              </TechCard>
            </motion.div>
          ))}
        </div>

        {/* Coming Soon Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <TechCard variant="elevated" className="mt-6">
            <TechCardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4 border border-border">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-foreground mb-2">More Stats Coming Soon</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                We're working on detailed analytics including scoring trends, handicap tracking, and more.
              </p>
            </TechCardContent>
          </TechCard>
        </motion.div>
      </main>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
