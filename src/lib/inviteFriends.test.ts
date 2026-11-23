import { describe, it, expect } from 'vitest';
import { buildInviteText, APP_STORE_URL } from './inviteFriends';

describe('buildInviteText', () => {
  it('uses first name, App Store link and upper-cased code', () => {
    const t = buildInviteText('Rishi Clark', 'rishi7');
    expect(t).toContain('Rishi wants you on MATCH');
    expect(t).toContain(APP_STORE_URL);
    expect(t).toContain('code RISHI7');
  });
  it('degrades gracefully without a name or code', () => {
    const t = buildInviteText(null, '');
    expect(t).toContain('Join me on MATCH');
    expect(t).not.toContain('code');
  });
});
