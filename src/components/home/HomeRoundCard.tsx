import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Trash2, Users, ChevronRight, Check } from 'lucide-react';
import { formatGameType } from '@/lib/formatGameType';
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
 * Round row used in the Home lists (and RoundsList). Fairway Day: white,
 * radius 20, hairline border. Live rounds carry a Forest "Live" chip and a
 * thin progress bar; finished rounds a muted "Done" chip. Solo rounds get a
 * "Solo" chip in place of game tags.
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
  // Solo round detection at the card level: a round with exactly 1 player
  // and no betting games is a solo/stats-only round.
  const isSolo = (playerCount ?? 0) === 1 && games.length === 0;

  const holesTotal = round.holes ?? 18;
  const progress = currentHole && holesTotal ? currentHole / holesTotal : 0;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(round.id);
  };

  const tags = isSolo ? ['Solo'] : games.filter(Boolean).map(formatGameType);

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="relative cursor-pointer rounded-[20px] border border-border bg-card px-4 py-3.5 select-none"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            {isActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 h-6 text-[12px] font-semibold text-primary-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-muted px-2.5 h-6 text-[12px] font-semibold text-primary">
                <Check className="h-3 w-3" strokeWidth={3} />
                Final
              </span>
            )}
            <span className="text-[12px] text-muted-foreground truncate">
              {isActive && currentHole ? `Thru ${currentHole} of ${holesTotal}` : `${holesTotal} holes`}
            </span>
          </div>
          <h3 className="text-[16px] font-semibold leading-snug tracking-[-0.01em] text-foreground truncate">
            {round.courseName}
          </h3>
          {(!!playerCount || tags.length > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {!!playerCount && (
                <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground mr-1">
                  <Users className="h-3.5 w-3.5" />
                  {playerCount} {playerCount === 1 ? 'player' : 'players'}
                </span>
              )}
              {tags.map((g, i) => (
                <span
                  key={`${g}-${i}`}
                  className="rounded-full bg-muted px-2.5 py-[3px] text-[12px] font-medium text-foreground/80"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center shrink-0 -mr-2 -my-1">
          {onDelete ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleDeleteClick}
              disabled={isDeleting}
              aria-label="Delete round"
              className="h-11 w-11 rounded-[14px] flex items-center justify-center text-muted-foreground active:bg-muted active:text-loss disabled:opacity-50"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-[17px] w-[17px]" />}
            </motion.button>
          ) : (
            <ChevronRight className="mx-3 my-3.5 h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isActive && !!currentHole && currentHole > 0 && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}

/** Sentence-case section label with optional live dot and count. */
export function HomeSectionLabel({ children, live, count }: { children: React.ReactNode; live?: boolean; count?: number }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-2">
      {live && (
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
      )}
      <span className="text-[13px] font-semibold text-muted-foreground">{children}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto text-[12px] font-semibold text-muted-foreground tabular-nums">{count}</span>
      )}
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
