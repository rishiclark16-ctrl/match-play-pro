import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    isPluginAvailable: () => false,
  },
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    requestPermissions: vi.fn(),
    checkPermissions: vi.fn(),
    register: vi.fn(),
  },
}));

const invokeMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

import { sendPushToProfiles } from './pushUtils';

describe('sendPushToProfiles', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({ data: { sent: 1, failed: 0 }, error: null });
  });

  it('no-ops on empty profileIds', async () => {
    await sendPushToProfiles({
      profileIds: [],
      title: 't',
      body: 'b',
      type: 'roundInvites',
    });
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('forwards profileIds, title, body, data, type to send-push edge function', async () => {
    await sendPushToProfiles({
      profileIds: ['a', 'b'],
      title: 'Round started ⛳',
      body: 'Tee off at Pebble',
      data: { roundId: 'r1', route: '/round/r1' },
      type: 'roundInvites',
    });
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith('send-push', {
      body: {
        profileIds: ['a', 'b'],
        title: 'Round started ⛳',
        body: 'Tee off at Pebble',
        data: { roundId: 'r1', route: '/round/r1' },
        type: 'roundInvites',
      },
    });
  });

  it('defaults data to {} when omitted', async () => {
    await sendPushToProfiles({
      profileIds: ['x'],
      title: 't',
      body: 'b',
      type: 'friendRequests',
    });
    const call = invokeMock.mock.calls[0];
    expect(call[1].body.data).toEqual({});
  });

  it('swallows edge function errors (non-critical)', async () => {
    invokeMock.mockRejectedValueOnce(new Error('network down'));
    await expect(
      sendPushToProfiles({
        profileIds: ['a'],
        title: 't',
        body: 'b',
        type: 'pressTriggered',
      }),
    ).resolves.toBeUndefined();
  });
});
