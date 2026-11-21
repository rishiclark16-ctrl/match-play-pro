import { logger } from '@/lib/logger';

export const APP_STORE_URL = 'https://apps.apple.com/app/match-golf/id6758272932';

/**
 * Invite message with the sender's friend code. Works whether or not the friend
 * has the app: they install from the App Store link, then add the code in Friends.
 * (An https deep link is not used because universal links are not configured
 * consistently across matchgolf.app / .dev / .info; see CLAUDE.md.)
 */
export function buildInviteText(senderName: string | null | undefined, friendCode: string | null | undefined): string {
  const first = senderName?.trim().split(/\s+/)[0];
  const opener = first ? `${first} wants you on MATCH` : 'Join me on MATCH';
  const lines = [
    `${opener}, the golf app that keeps score and settles the bets. ⛳`,
    '',
    `Get it: ${APP_STORE_URL}`,
  ];
  if (friendCode?.trim()) {
    lines.push(`Then add me with code ${friendCode.trim().toUpperCase()} (Social → Friends).`);
  }
  return lines.join('\n');
}

export type InviteOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/** Opens the native share sheet, falling back to the clipboard. Never throws. */
export async function shareInvite(text: string): Promise<InviteOutcome> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ text });
      return 'shared';
    }
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    logger.error('[Invite] share failed', err);
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
}
