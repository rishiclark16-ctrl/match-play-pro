/**
 * Central copy builder for push notifications. Keeps tone/emoji consistent and
 * makes copy easy to test without firing real APNs requests.
 *
 * Every body ends with a golf emoji ⛳ per product spec.
 */

export interface NotificationCopy {
  title: string;
  body: string;
}

const GOLF = '⛳';

function withTee(body: string): string {
  return body.trim().endsWith(GOLF) ? body : `${body} ${GOLF}`;
}

function firstName(fullName: string | null | undefined, fallback = 'Player'): string {
  if (!fullName) return fallback;
  const trimmed = fullName.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0];
}

export const notificationCopy = {
  roundInvite(inviter: string | null | undefined, courseName: string): NotificationCopy {
    return {
      title: `Tee it up ${GOLF}`,
      body: withTee(`${firstName(inviter, 'A friend')} wants you in a round at ${courseName}`),
    };
  },

  friendStartedRound(friend: string | null | undefined, courseName: string): NotificationCopy {
    return {
      title: `${firstName(friend)} is on the tee ${GOLF}`,
      body: withTee(`Round just started at ${courseName}. Pull up the live leaderboard`),
    };
  },

  roundCompleted(headline: string, courseName: string): NotificationCopy {
    return {
      title: `Match over ${GOLF}`,
      body: withTee(`${headline} at ${courseName}`),
    };
  },

  scoreEnteredForYou(scorekeeper: string | null | undefined, strokes: number, hole: number): NotificationCopy {
    return {
      title: `Score posted ${GOLF}`,
      body: withTee(`${firstName(scorekeeper, 'Someone')} put you down for a ${strokes} on #${hole}`),
    };
  },

  pressTriggered(player: string | null | undefined, hole: number): NotificationCopy {
    return {
      title: `Press is on ${GOLF}`,
      body: withTee(`${firstName(player)} pressed on #${hole}. Double or nothing 💸`),
    };
  },

  pressedBack(player: string | null | undefined): NotificationCopy {
    return {
      title: `Pressed back ${GOLF}`,
      body: withTee(`${firstName(player)} just pressed back. No mercy`),
    };
  },

  tabSettled(fromName: string | null | undefined, amount: number): NotificationCopy {
    return {
      title: `Paid up ${GOLF}`,
      body: withTee(`${firstName(fromName)} squared up for $${amount.toFixed(2)}`),
    };
  },

  tabAddedTo(player: string | null | undefined, amount: number): NotificationCopy {
    return {
      title: `Tab updated ${GOLF}`,
      body: withTee(`New $${amount.toFixed(2)} line added for ${firstName(player)}`),
    };
  },

  youWonBig(amount: number): NotificationCopy {
    return {
      title: `Payday ${GOLF}`,
      body: withTee(`You're up $${amount.toFixed(2)} this round. Collect before they conveniently forget 💸`),
    };
  },

  youLostBig(winner: string | null | undefined, amount: number): NotificationCopy {
    return {
      title: `Tab's due ${GOLF}`,
      body: withTee(`You're down $${amount.toFixed(2)} to ${firstName(winner, 'the group')}. Venmo, coward 😬`),
    };
  },

  holeInOne(player: string | null | undefined, hole: number): NotificationCopy {
    return {
      title: `ACE! ${GOLF}`,
      body: withTee(`${firstName(player)} just made a hole-in-one on #${hole}. The drinks are on them 🍻`),
    };
  },

  eagleLogged(player: string | null | undefined, hole: number): NotificationCopy {
    return {
      title: `Eagle spotted ${GOLF}`,
      body: withTee(`${firstName(player)} went -2 on #${hole}. Nice grip`),
    };
  },

  friendRequestReceived(requester: string | null | undefined): NotificationCopy {
    return {
      title: `New friend request ${GOLF}`,
      body: withTee(`${firstName(requester, 'Someone')} wants to tee it up with you`),
    };
  },

  friendRequestAccepted(accepter: string | null | undefined): NotificationCopy {
    return {
      title: `Friend request accepted ${GOLF}`,
      body: withTee(`${firstName(accepter)} is now your golf friend. Book the round`),
    };
  },

  groupInvite(inviter: string | null | undefined, groupName: string): NotificationCopy {
    return {
      title: `You're in the group ${GOLF}`,
      body: withTee(`${firstName(inviter, 'A friend')} added you to "${groupName}". Lock in the tee times`),
    };
  },

  watchParty(scorekeeper: string | null | undefined, courseName: string): NotificationCopy {
    return {
      title: `Watch party ${GOLF}`,
      body: withTee(`${firstName(scorekeeper)} is live at ${courseName}. Tap in and follow along`),
    };
  },

  /**
   * Weekly recap. `rounds` = rounds played in last 7 days. `net` = net $ across all
   * settlements (positive = won, negative = lost). `bestToPar` = best single-round
   * score relative to par (lower = better; may be negative).
   */
  weeklyRecap(rounds: number, net: number, bestToPar: number | null): NotificationCopy {
    if (rounds === 0) {
      return {
        title: `Your week on the course ${GOLF}`,
        body: withTee('Zero rounds this week. Time to tee it up'),
      };
    }

    const roundsLabel = rounds === 1 ? '1 round' : `${rounds} rounds`;

    let moneyLine: string;
    if (net > 0.01) {
      moneyLine = `up $${net.toFixed(2)}`;
    } else if (net < -0.01) {
      moneyLine = `down $${Math.abs(net).toFixed(2)}`;
    } else {
      moneyLine = 'even on the books';
    }

    let bestLine = '';
    if (bestToPar !== null) {
      if (bestToPar < 0) {
        bestLine = `, best round ${bestToPar} under`;
      } else if (bestToPar === 0) {
        bestLine = ', best round even par';
      } else {
        bestLine = `, best round +${bestToPar}`;
      }
    }

    return {
      title: `Your week on the course ${GOLF}`,
      body: withTee(`${roundsLabel}, ${moneyLine}${bestLine}`),
    };
  },
};

export type NotificationCopyBuilders = typeof notificationCopy;
