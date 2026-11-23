import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Globe, Lock, ChevronRight } from 'lucide-react';
import { usePersonalGameFormats } from '@/hooks/usePersonalGameFormats';
import { buildConfig, summarizeScoringConfig } from '@/engine/HouseGameEngine';
import { Switch } from '@/components/ui/switch';
import { HeroCard, HeroTile, SetupHeader } from '@/components/golf/setupUi';
import { hapticLight } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export default function MyFormatsList() {
  const navigate = useNavigate();
  const { formats, loading, togglePublic } = usePersonalGameFormats();
  const build = () => { hapticLight(); navigate('/my-formats/new'); };
  const publicCount = formats.filter(f => f.isPublic).length;

  return (
    <div className="h-screen flex flex-col bg-background">
      <SetupHeader
        onBack={() => navigate(-1)}
        caption="AI Games"
        title="My Formats"
        right={
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={build}
            aria-label="Build a new format"
            className="w-11 h-11 rounded-[14px] bg-primary flex items-center justify-center flex-shrink-0"
          >
            <Plus className="w-5 h-5 text-white" />
          </motion.button>
        }
      />

      <main className="flex-1 overflow-y-auto px-5 pt-2 pb-nav">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent"
            />
          </div>
        ) : (
          <>
            <HeroCard
              eyebrow={<span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-gold" /> AI Game Builder</span>}
              title={formats.length === 0 ? 'No formats yet' : 'Your games, ready to load'}
              body={formats.length === 0
                ? 'Describe your Saturday game in plain English and AI builds the ruleset.'
                : 'Load any of these in the Games step when you start a round.'}
            >
              {formats.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <HeroTile hot value={formats.length} label={formats.length === 1 ? 'Format' : 'Formats'} />
                  <HeroTile value={publicCount} label="Shared with groups" />
                </div>
              )}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={build}
                className="mt-4 w-full h-[56px] rounded-[20px] bg-gold text-primary text-[16px] font-bold flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                {formats.length === 0 ? 'Build Your First Format' : 'Build a new format'}
              </motion.button>
            </HeroCard>

            {formats.length > 0 && (
              <p className="text-[13px] font-semibold text-muted-foreground mt-6 mb-2 px-1">Saved formats</p>
            )}
            <AnimatePresence>
              {formats.map((fmt, i) => {
                const summary = summarizeScoringConfig(buildConfig(fmt.activePrimitives), 2).join(' · ');
                return (
                  <motion.div
                    key={fmt.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
                    className="bg-card rounded-[20px] border border-border mb-2 overflow-hidden"
                  >
                    <motion.button
                      whileTap={{ scale: 0.99 }}
                      onClick={() => { hapticLight(); navigate(`/my-formats/${fmt.id}/edit`); }}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      <div className="w-11 h-11 rounded-[14px] bg-gold-muted flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[16px] text-foreground truncate">{fmt.name}</p>
                        <p className="text-[13px] text-muted-foreground truncate mt-0.5">{summary || fmt.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </motion.button>
                    <div className="flex items-center justify-between gap-3 px-4 min-h-[52px] border-t border-border">
                      <div className="flex items-center gap-2">
                        {fmt.isPublic
                          ? <Globe className="w-4 h-4 text-primary" />
                          : <Lock className="w-4 h-4 text-muted-foreground" />}
                        <span className={cn('text-[13px] font-semibold', fmt.isPublic ? 'text-primary' : 'text-muted-foreground')}>
                          {fmt.isPublic ? 'Visible to group members' : 'Private'}
                        </span>
                      </div>
                      <Switch
                        checked={fmt.isPublic ?? false}
                        aria-label={`Share ${fmt.name} with groups`}
                        onCheckedChange={(v) => { hapticLight(); togglePublic(fmt.id, v); }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        )}
      </main>
    </div>
  );
}
