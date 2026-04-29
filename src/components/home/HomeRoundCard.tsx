import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Round } from '@/types/golf';

interface HomeRoundCardProps {
  round: Round;
  onClick: () => void;
  onDelete?: (id: string) => Promise<void>;
  isDeleting?: boolean;
  playerCount?: number;
  currentHole?: number;
}

/**
 * "Direction B" round card used on the Home page rounds list.
 * Renders a dark card for active rounds (with a live LED + progress bar),
 * and a white card for completed/historic rounds. Solo rounds get a "Solo"
 * pill in place of game tags.
 */
export function HomeRoundCard({
  round,
  onClick,
  onDelete,
  isDeleting,
  playerCount,
  currentHole,
}: HomeRoundCardProps) {
  const isActive = round.status === 'active';
  const roundGames = (round as Round & { games?: unknown[] }).games;
  const games: string[] = Array.isArray(roundGames)
    ? roundGames.map((g: unknown) => {
        if (typeof g === 'string') return g;
        if (g && typeof g === 'object') {
          const obj = g as Record<string, unknown>;
          return String(obj.type ?? obj.name ?? '');
        }
        return '';
      })
    : [];
  // Solo round detection at the card level — a round with exactly 1 player
  // and no betting games is a solo/stats-only round.
  const isSolo = (playerCount ?? 0) === 1 && games.length === 0;

  const holesTotal = round.holes ?? 18;
  const progress = currentHole && holesTotal ? currentHole / holesTotal : 0;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(round.id);
  };

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        'rounded-2xl p-[18px] cursor-pointer relative overflow-hidden',
        isActive
          ? 'bg-[#0A0A0A] shadow-[0_4px_24px_rgba(0,0,0,0.35)]'
          : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]'
      )}
    >
      {/* Top row: course name + status pill */}
      <div className="flex items-start justify-between mb-2">
        <h3 className={cn(
          'text-[17px] tracking-[-0.03em] leading-snug flex-1 pr-3',
          isActive ? 'font-black text-white' : 'font-bold text-foreground'
        )}>
          {round.courseName}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {isActive ? (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#F0EE3A]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F0EE3A] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F0EE3A]" />
              </span>
              LIVE
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-[10px] py-1 rounded-full bg-[#F3F4F6] text-[#6B7280]">
              Done
            </span>
          )}
          {onDelete && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleDeleteClick}
              disabled={isDeleting}
              aria-label="Delete round"
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center',
                isActive
                  ? 'bg-white/10 text-white/50 active:text-white'
                  : 'bg-muted/70 text-muted-foreground active:text-destructive'
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 mb-2.5">
        {playerCount && (
          <span className={cn(
            'flex items-center gap-1 text-[12px]',
            isActive ? 'text-white/60' : 'text-[#6B7280]'
          )}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <strong className={cn('font-semibold', isActive ? 'text-white/80' : 'text-[#374151]')}>{playerCount}</strong> {playerCount === 1 ? 'player' : 'players'}
          </span>
        )}
        <span className={cn('text-[12px]', isActive ? 'text-white/60' : 'text-[#6B7280]')}>
          {round.holes} holes
        </span>
      </div>

      {/* Game tags — or "Solo" pill for solo rounds */}
      {isSolo ? (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          <span
            className={cn(
              'text-[11px] font-medium px-[9px] py-[3px] rounded-[6px] uppercase tracking-wide',
              isActive
                ? 'bg-white/10 text-white/50'
                : 'bg-[#F3F4F6] text-[#374151]'
            )}
          >
            Solo
          </span>
        </div>
      ) : games.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {games.map((g, i) => (
            <span
              key={`${g}-${i}`}
              className={cn(
                'text-[11px] font-medium px-[9px] py-[3px] rounded-[6px] uppercase tracking-wide',
                isActive
                  ? 'bg-white/10 text-white/50'
                  : 'bg-[#F3F4F6] text-[#374151]'
              )}
            >
              {g}
            </span>
          ))}
        </div>
      )}

      {/* Progress bar for live rounds */}
      {isActive && currentHole && currentHole > 0 && (
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-[4px] bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F0EE3A] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-white/60 whitespace-nowrap">
            Hole {currentHole}/{holesTotal}
          </span>
        </div>
      )}
    </motion.div>
  );
}

/** Short uppercase section label, optionally with a live indicator dot. */
export function HomeSectionLabel({ children, live }: { children: React.ReactNode; live?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-2.5">
      {live && (
        <span className="w-[6px] h-[6px] rounded-full bg-[#22C55E] shadow-[0_0_0_3px_rgba(34,197,94,0.15)] flex-shrink-0" />
      )}
      <span className="text-[11px] font-semibold text-[#888] uppercase tracking-[0.08em]">{children}</span>
    </div>
  );
}

/** App icon "napkin" mark used in the Home header. */
export function NapkinMark({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/app-icon.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className="flex-shrink-0 rounded-[10px] select-none ring-1 ring-black/5"
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
