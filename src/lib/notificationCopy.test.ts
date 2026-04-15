import { describe, it, expect } from 'vitest';
import { notificationCopy } from './notificationCopy';

const TEE = '⛳';

describe('notificationCopy', () => {
  describe('formatting invariants', () => {
    it('every body ends with the golf emoji', () => {
      const samples = [
        notificationCopy.roundInvite('Alex Smith', 'Pebble Beach'),
        notificationCopy.friendStartedRound('Sam', 'Augusta'),
        notificationCopy.roundCompleted('Alex won 2&1', 'Pebble Beach'),
        notificationCopy.scoreEnteredForYou('Sam Jones', 4, 7),
        notificationCopy.pressTriggered('Alex', 12),
        notificationCopy.pressedBack('Sam'),
        notificationCopy.tabSettled('Sam', 15.5),
        notificationCopy.tabAddedTo('Alex', 10),
        notificationCopy.youWonBig(42),
        notificationCopy.youLostBig('Sam', 42),
        notificationCopy.holeInOne('Alex', 16),
        notificationCopy.eagleLogged('Alex', 13),
        notificationCopy.friendRequestReceived('Alex'),
        notificationCopy.friendRequestAccepted('Sam'),
        notificationCopy.groupInvite('Alex', 'Weekend Warriors'),
        notificationCopy.watchParty('Alex', 'Augusta'),
        notificationCopy.weeklyRecap(3, 25, -2),
        notificationCopy.weeklyRecap(0, 0, null),
      ];

      for (const copy of samples) {
        expect(copy.body.trim().endsWith(TEE)).toBe(true);
        expect(copy.title.length).toBeGreaterThan(0);
        expect(copy.body.length).toBeGreaterThan(0);
      }
    });

    it('uses first name only', () => {
      const copy = notificationCopy.roundInvite('Alexander Hamilton', 'TPC Sawgrass');
      expect(copy.body).toContain('Alexander');
      expect(copy.body).not.toContain('Hamilton');
    });

    it('falls back gracefully on null/empty names', () => {
      expect(notificationCopy.roundInvite(null, 'Augusta').body).toContain('A friend');
      expect(notificationCopy.scoreEnteredForYou('', 4, 1).body).toContain('Someone');
      expect(notificationCopy.friendRequestReceived(undefined).body).toContain('Someone');
    });
  });

  describe('weeklyRecap', () => {
    it('handles zero rounds', () => {
      const copy = notificationCopy.weeklyRecap(0, 0, null);
      expect(copy.body).toContain('Zero rounds');
    });

    it('pluralizes rounds', () => {
      expect(notificationCopy.weeklyRecap(1, 0, null).body).toContain('1 round,');
      expect(notificationCopy.weeklyRecap(4, 0, null).body).toContain('4 rounds,');
    });

    it('formats positive net as "up"', () => {
      expect(notificationCopy.weeklyRecap(2, 20.5, null).body).toContain('up $20.50');
    });

    it('formats negative net as "down"', () => {
      expect(notificationCopy.weeklyRecap(2, -15.25, null).body).toContain('down $15.25');
    });

    it('formats zero net as even', () => {
      expect(notificationCopy.weeklyRecap(2, 0, null).body).toContain('even on the books');
    });

    it('formats under-par best round', () => {
      expect(notificationCopy.weeklyRecap(2, 0, -3).body).toContain('best round -3 under');
    });

    it('formats even-par best round', () => {
      expect(notificationCopy.weeklyRecap(2, 0, 0).body).toContain('best round even par');
    });

    it('formats over-par best round', () => {
      expect(notificationCopy.weeklyRecap(2, 0, 5).body).toContain('best round +5');
    });

    it('omits best line when null', () => {
      const copy = notificationCopy.weeklyRecap(2, 0, null);
      expect(copy.body).not.toContain('best round');
    });
  });

  describe('money formatting', () => {
    it('youWonBig uses two decimal places', () => {
      expect(notificationCopy.youWonBig(42).body).toContain('$42.00');
      expect(notificationCopy.youWonBig(42.5).body).toContain('$42.50');
    });

    it('youLostBig uses two decimal places', () => {
      expect(notificationCopy.youLostBig('Sam', 10).body).toContain('$10.00');
    });

    it('tabSettled uses two decimal places', () => {
      expect(notificationCopy.tabSettled('Sam', 7.5).body).toContain('$7.50');
    });
  });
});
