import { motion } from 'framer-motion';
import { ChevronRight, Sparkles, Pencil } from 'lucide-react';
import { hapticLight } from '@/lib/haptics';
import { summarizeConfig, buildScoringConfig } from '@/lib/houseGame/engine';
import type { HouseGame } from '@/types/houseGame';
import { ledgerSpringTransition, ledgerSectionLabel } from './ledgerHelpers';

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
      className="mt-[18px]"
    >
      <p className={ledgerSectionLabel}>
        House game
      </p>
      {houseGame ? (
        <div className="rounded-[20px] border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-7 w-7 flex-shrink-0 rounded-[10px] bg-gold flex items-center justify-center"><Sparkles className="w-4 h-4 text-gold-foreground" /></span>
                <span className="text-[16px] font-semibold text-foreground truncate">{houseGame.name}</span>
              </div>
              {(() => {
                const config = buildScoringConfig(houseGame.activePrimitives);
                const lines = summarizeConfig(config).slice(0, 3);
                return lines.length > 0 ? (
                  <ul className="space-y-0.5">
                    {lines.map((line) => (
                      <li key={line} className="text-[13px] text-muted-foreground flex items-center gap-1.5">
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
              aria-label="Edit house game"
              className="-mr-1 -mt-1 h-11 w-11 rounded-[14px] bg-muted text-primary flex items-center justify-center flex-shrink-0"
            >
              <Pencil className="w-4 h-4" />
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
          className="w-full rounded-[20px] border border-border bg-card p-3.5 flex items-center gap-3 text-left"
        >
          <div className="h-11 w-11 rounded-[14px] bg-gold flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-gold-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-foreground">Build your house game</p>
            <p className="text-[13px] text-muted-foreground">Describe your Saturday game in plain English</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[11px] font-bold bg-gold text-gold-foreground px-2 py-0.5 rounded-full">Pro</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </motion.button>
      )}
    </motion.div>
  );
}
