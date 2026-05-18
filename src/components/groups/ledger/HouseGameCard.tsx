import { motion } from 'framer-motion';
import { ChevronRight, Sparkles, Pencil } from 'lucide-react';
import { hapticLight } from '@/lib/haptics';
import { summarizeConfig, buildScoringConfig } from '@/lib/houseGame/engine';
import type { HouseGame } from '@/types/houseGame';
import { ledgerSpringTransition } from './ledgerHelpers';

interface HouseGameCardProps {
  houseGame: HouseGame | null;
  isPro: boolean;
  onEdit: () => void;
  onCreate: () => void;
  onShowPaywall: () => void;
}

export function HouseGameCard({ houseGame, isPro, onEdit, onCreate, onShowPaywall }: HouseGameCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...ledgerSpringTransition, delay: 0.1 }}
      className="mt-4"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/40 mb-3 px-1">
        House Game
      </p>
      {houseGame ? (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#F0EE3A] flex-shrink-0" style={{ filter: 'drop-shadow(0 0 4px #F0EE3A88)' }} />
                <span className="text-[13px] font-black text-foreground truncate">{houseGame.name}</span>
              </div>
              {(() => {
                const config = buildScoringConfig(houseGame.activePrimitives);
                const lines = summarizeConfig(config).slice(0, 3);
                return lines.length > 0 ? (
                  <ul className="space-y-0.5">
                    {lines.map((line) => (
                      <li key={line} className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                        {line}
                      </li>
                    ))}
                    {summarizeConfig(config).length > 3 && (
                      <li className="text-[11px] text-muted-foreground/60">
                        +{summarizeConfig(config).length - 3} more rules
                      </li>
                    )}
                  </ul>
                ) : null;
              })()}
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { hapticLight(); onEdit(); }}
              className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0"
            >
              <Pencil className="w-4 h-4 text-foreground" />
            </motion.button>
          </div>
        </div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            hapticLight();
            if (!isPro) { onShowPaywall(); return; }
            onCreate();
          }}
          className="w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-[#F0EE3A] flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[#0A0A0A]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-foreground">Build Your House Game</p>
            <p className="text-[12px] text-muted-foreground">Describe your Saturday game in plain English</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[9px] font-black bg-foreground text-[#F0EE3A] px-1.5 py-0.5 rounded-md">PRO</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </motion.button>
      )}
    </motion.div>
  );
}
