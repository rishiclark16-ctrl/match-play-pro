/**
 * App Store review prompt policy.
 *
 * Ask only at a happy moment (the player just finished a round up money), only once
 * they've used the app a few times, and rarely. iOS also caps the system prompt at
 * 3 per year per app, so wasting a request on a bad moment costs real reviews.
 */
import { Capacitor } from '@capacitor/core';
import { logger } from '@/lib/logger';

export const REVIEW_MIN_COMPLETED_ROUNDS = 3;
export const REVIEW_COOLDOWN_DAYS = 120;
const STORAGE_KEY = 'match_review_prompt_v1';

export interface ReviewPromptInput {
  completedRounds: number;
  netWinnings: number;
  isSoloRound: boolean;
  lastPromptedAt: number | null; // epoch ms
  now: number;                   // epoch ms
}

export function shouldAskForReview(i: ReviewPromptInput): boolean {
  if (i.isSoloRound) return false;
  if (i.completedRounds < REVIEW_MIN_COMPLETED_ROUNDS) return false;
  if (!(i.netWinnings > 0)) return false;
  if (i.lastPromptedAt !== null) {
    const days = (i.now - i.lastPromptedAt) / 86_400_000;
    if (days < REVIEW_COOLDOWN_DAYS) return false;
  }
  return true;
}

function readLastPrompted(): number | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? Number(v) || null : null;
  } catch {
    return null;
  }
}

function writeLastPrompted(at: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(at));
  } catch {
    /* storage unavailable — worst case we may ask again after reinstall */
  }
}

const ROUNDS_KEY = 'match_review_rounds_v1';

/** Records a completed round id (deduped) and returns how many this device has seen. */
export function recordCompletedRound(roundId: string): number {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(ROUNDS_KEY) || '[]');
    if (!ids.includes(roundId)) ids.push(roundId);
    localStorage.setItem(ROUNDS_KEY, JSON.stringify(ids.slice(-50)));
    return ids.length;
  } catch {
    return 0;
  }
}

/**
 * Requests the native review sheet if the policy allows. Never throws.
 * Returns true if a request was made (iOS may still choose not to show it).
 */
export async function maybeRequestReview(input: Omit<ReviewPromptInput, 'lastPromptedAt' | 'now'>): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const now = Date.now();
  if (!shouldAskForReview({ ...input, lastPromptedAt: readLastPrompted(), now })) return false;
  try {
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    writeLastPrompted(now);
    await InAppReview.requestReview();
    return true;
  } catch (err) {
    logger.error('[ReviewPrompt] requestReview failed', err);
    return false;
  }
}
