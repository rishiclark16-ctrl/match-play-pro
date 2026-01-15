import { useState, useEffect, useRef, useCallback } from 'react';
import { hapticSuccess } from '@/lib/haptics';
import { toast } from 'sonner';

const AUTO_ADVANCE_SECONDS = 20;

interface UseAutoAdvanceOptions {
  allCurrentHoleScored: boolean;
  currentHole: number;
  totalHoles: number;
  onAdvance: (nextHole: number) => void;
}

interface UseAutoAdvanceReturn {
  countdown: number | null;
  advanceToNextHole: () => void;
}

export function useAutoAdvance({
  allCurrentHoleScored,
  currentHole,
  totalHoles,
  onAdvance,
}: UseAutoAdvanceOptions): UseAutoAdvanceReturn {
  const [allScoredTimestamp, setAllScoredTimestamp] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Manual advance to next hole
  const advanceToNextHole = useCallback(() => {
    if (currentHole >= totalHoles) return;

    // Clear any pending timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(null);
    setAllScoredTimestamp(null);

    const nextHole = currentHole + 1;
    onAdvance(nextHole);
    hapticSuccess();
    toast.info(`Hole ${nextHole}`, { duration: 1500 });
  }, [currentHole, totalHoles, onAdvance]);

  // Auto-advance countdown effect
  useEffect(() => {
    // Clear timer when hole changes or conditions change
    if (!allCurrentHoleScored || currentHole >= totalHoles) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCountdown(null);
      setAllScoredTimestamp(null);
      return;
    }

    // Start countdown when all players scored
    if (allCurrentHoleScored && allScoredTimestamp === null) {
      setAllScoredTimestamp(Date.now());
      setCountdown(AUTO_ADVANCE_SECONDS);

      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            // Auto-advance
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }

            const nextHole = currentHole + 1;
            onAdvance(nextHole);
            setAllScoredTimestamp(null);
            hapticSuccess();
            toast.info(`Hole ${nextHole}`, { duration: 1500 });
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [allCurrentHoleScored, currentHole, totalHoles, allScoredTimestamp, onAdvance]);

  return {
    countdown,
    advanceToNextHole,
  };
}
