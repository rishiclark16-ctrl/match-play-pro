import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Sparkles, Globe, Lock, ChevronRight } from 'lucide-react';
import { usePersonalGameFormats } from '@/hooks/usePersonalGameFormats';
import { hapticLight } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export default function MyFormatsList() {
  const navigate = useNavigate();
  const { formats, loading, togglePublic } = usePersonalGameFormats();

  return (
    <div className="h-screen flex flex-col bg-[#F8F8F6]">
      {/* Header */}
      <header className="flex-shrink-0 px-6 pt-safe-content pb-3 border-b-2 border-foreground">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </motion.button>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">AI Games</p>
            <h1 className="text-[22px] font-black tracking-[-0.04em] text-foreground leading-none">My Formats</h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { hapticLight(); navigate('/my-formats/new'); }}
            className="ml-auto w-9 h-9 rounded-xl bg-foreground flex items-center justify-center"
          >
            <Plus className="w-4 h-4 text-background" />
          </motion.button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-5 pb-nav">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-6 h-6 rounded-full border-2 border-foreground border-t-transparent"
            />
          </div>
        ) : formats.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#F0EE3A]/20 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-foreground" />
            </div>
            <h2 className="text-[20px] font-black tracking-[-0.03em] mb-2">No formats yet</h2>
            <p className="text-[14px] text-muted-foreground mb-6 max-w-[260px] leading-relaxed">
              Describe your Saturday game in plain English and AI builds the ruleset.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { hapticLight(); navigate('/my-formats/new'); }}
              className="bg-foreground text-background rounded-2xl px-6 h-[48px] font-bold text-[14px] flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Build Your First Format
            </motion.button>
          </motion.div>
        ) : (
          <AnimatePresence>
            {formats.map((fmt, i) => (
              <motion.div
                key={fmt.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
                className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-border/30 p-4 mb-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F0EE3A]/15 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-[15px] text-foreground truncate">{fmt.name}</p>
                      <span className={cn(
                        'text-[9px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0',
                        fmt.isPublic
                          ? 'bg-[#22C55E]/15 text-[#22C55E]'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {fmt.isPublic ? 'PUBLIC' : 'PRIVATE'}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground truncate mt-0.5">{fmt.description}</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { hapticLight(); navigate(`/my-formats/${fmt.id}/edit`); }}
                    className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0"
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                </div>
                {/* Public toggle */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
                  <div className="flex items-center gap-1.5">
                    {fmt.isPublic
                      ? <Globe className="w-3.5 h-3.5 text-[#22C55E]" />
                      : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className="text-[11px] font-bold text-muted-foreground">
                      {fmt.isPublic ? 'Visible to group members' : 'Private'}
                    </span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { hapticLight(); togglePublic(fmt.id, !fmt.isPublic); }}
                    className={cn(
                      'w-10 h-6 rounded-full transition-colors flex-shrink-0',
                      fmt.isPublic ? 'bg-foreground' : 'bg-muted'
                    )}
                  >
                    <motion.div
                      animate={{ x: fmt.isPublic ? 16 : 2 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="w-4 h-4 rounded-full bg-white shadow-sm mt-1"
                    />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
