// Content for the "13 betting games" carousel series (v03 onward).
// v02 Nassau has its own hand-authored composition; everything from v03
// is driven by this data file + the GameCarousel template.

export type RuleSlide = {
  kicker: string;              // e.g. "BET 1 OF 3", "RULE", "STEP 1"
  titleLines: [string, string?]; // 1-2 line headline (serif, huge)
  italicText?: string;         // optional italic body under title
  exampleCard?: {              // example card (like Nassau slide 3)
    label: string;             // "Example" / "Worked example"
    lines: string[];           // plain lines; wrap a line in _ to bold+gold
  };
  goldCallout?: string;        // solid gold card (like Nassau slide 4)
  sidebarCard?: {              // bordered dark card (like Nassau slide 5)
    label: string;
    lines: string[];           // wrap line in _ to emphasize gold+bold
  };
};

export type Hook = {
  leadItalic: string;
  midText: string;
  bigWord: string;
  pills: string[];
};

export type Cover = {
  kicker: string;              // "The Golf Bet"
  bigName: string;             // "Skins"
  tagline: string;             // "Explained in 6 slides."
};

export type GameData = {
  id: string;                  // "v03"
  slug: string;                // "skins"
  cover: Cover;
  hook: Hook;
  rules: [RuleSlide, RuleSlide, RuleSlide];
};

// -----------------------------------------------------------------
// v02 — Nassau
// -----------------------------------------------------------------
const nassau: GameData = {
  id: 'v02',
  slug: 'nassau',
  cover: {
    kicker: 'The Golf Bet',
    bigName: 'Nassau',
    tagline: 'Explained in 6 slides.',
  },
  hook: {
    leadItalic: 'Most people think Nassau is one bet.',
    midText: "It's actually",
    bigWord: 'three.',
    pills: ['Front 9', 'Back 9', 'Total 18'],
  },
  rules: [
    {
      kicker: 'Bet 1 of 3',
      titleLines: ['Win the', 'front 9.'],
      exampleCard: {
        label: 'Example',
        lines: [
          'Mike wins 4 holes.',
          'Dave wins 3. Two are tied.',
          '_Mike wins Bet 1._',
        ],
      },
    },
    {
      kicker: 'Bet 2 of 3',
      titleLines: ['Win the', 'back 9.'],
      italicText:
        "Same rules. Fresh bet.\nYour back-9 score doesn't care\nwhat you did on the front.",
      goldCallout: 'You now have 2 live bets.',
    },
    {
      kicker: 'Bet 3 of 3',
      titleLines: ['Win all', '18 holes.'],
      italicText: 'The combined 18-hole winner\ntakes Bet 3.',
      sidebarCard: {
        label: 'Plus: the press',
        lines: [
          'Losing a bet? You can',
          '_press_ — start a new side',
          'bet from that hole forward.',
        ],
      },
    },
  ],
};

// -----------------------------------------------------------------
// v03 — Skins
// -----------------------------------------------------------------
const skins: GameData = {
  id: 'v03',
  slug: 'skins',
  cover: {
    kicker: 'The Golf Bet',
    bigName: 'Skins',
    tagline: 'Explained in 6 slides.',
  },
  hook: {
    leadItalic: 'Most people think Skins is "win a hole."',
    midText: "It's actually",
    bigWord: 'outright.',
    pills: ['Win hole', 'Get skin', 'Tie? Carry'],
  },
  rules: [
    {
      kicker: 'Rule 1 of 3',
      titleLines: ['Low score', 'takes the skin.'],
      exampleCard: {
        label: 'Example',
        lines: [
          'Hole 4. Mike birdies.',
          'Dave and Paul make par.',
          '_Mike wins 1 skin._',
        ],
      },
    },
    {
      kicker: 'Rule 2 of 3',
      titleLines: ['Tie the hole,', 'no skin.'],
      italicText:
        "If two players share the low score,\nnobody wins. The skin is\ncancelled on that hole.",
      goldCallout: 'Ties kill the skin.',
    },
    {
      kicker: 'Rule 3 of 3',
      titleLines: ['Carryover.', 'Skins stack.'],
      italicText:
        'Cancelled skins roll into the next\nhole. Sometimes a single birdie\npays off the whole round.',
      sidebarCard: {
        label: 'The Hot Hand',
        lines: [
          'Holes 1-5 all tied?',
          'Hole 6 birdie pays',
          '_6 skins in one shot._',
        ],
      },
    },
  ],
};

// -----------------------------------------------------------------
// v04 — Wolf
// -----------------------------------------------------------------
const wolf: GameData = {
  id: 'v04',
  slug: 'wolf',
  cover: {
    kicker: 'The Golf Bet',
    bigName: 'Wolf',
    tagline: 'Explained in 6 slides.',
  },
  hook: {
    leadItalic: 'Most people think Wolf is random.',
    midText: "It's actually",
    bigWord: 'rotation.',
    pills: ['Tee order', 'Pick partner', 'Or go alone'],
  },
  rules: [
    {
      kicker: 'Rule 1 of 3',
      titleLines: ['Tee order', 'picks the wolf.'],
      exampleCard: {
        label: 'Example',
        lines: [
          'Hole 1: Mike is the wolf.',
          'He tees off last.',
          '_Rotation shifts each hole._',
        ],
      },
    },
    {
      kicker: 'Rule 2 of 3',
      titleLines: ['Pick a partner', 'or pass.'],
      italicText:
        "Watch a tee shot, pick that player\nas partner — or pass and watch\nthe next. Once you pass, you can't go back.",
      goldCallout: 'Skip everyone? Blind Wolf = 2×.',
    },
    {
      kicker: 'Rule 3 of 3',
      titleLines: ['Lone Wolf', 'takes them all.'],
      italicText:
        'Go alone before anyone tees off.\nWin the hole = 4 points.\nLose = they get 1 each.',
      sidebarCard: {
        label: 'Catch-up',
        lines: [
          'Holes 17-18:',
          'lowest-point player',
          '_becomes the wolf._',
        ],
      },
    },
  ],
};

// -----------------------------------------------------------------
// v05 — Vegas
// -----------------------------------------------------------------
const vegas: GameData = {
  id: 'v05',
  slug: 'vegas',
  cover: {
    kicker: 'The Golf Bet',
    bigName: 'Vegas',
    tagline: 'Explained in 6 slides.',
  },
  hook: {
    leadItalic: 'Most people think Vegas is 2v2.',
    midText: "It's actually",
    bigWord: 'digits.',
    pills: ['Pair scores', 'Low digit first', 'Diff = points'],
  },
  rules: [
    {
      kicker: 'Rule 1 of 3',
      titleLines: ['Pair each', 'team score.'],
      exampleCard: {
        label: 'Example',
        lines: [
          'Team A: 4 and 5 → "45".',
          'Team B: 5 and 6 → "56".',
          '_Team B owes 11 points._',
        ],
      },
    },
    {
      kicker: 'Rule 2 of 3',
      titleLines: ['Birdie flips', 'the loser.'],
      italicText:
        "If the losing team makes a birdie,\ntheir number flips — the bigger\ndigit goes first.",
      goldCallout: '65 becomes 56. Points shift fast.',
    },
    {
      kicker: 'Rule 3 of 3',
      titleLines: ['Eagle flips', 'AND doubles.'],
      italicText:
        "Drop an eagle on the losing team\nand their number flips,\nthen the whole pot doubles.",
      sidebarCard: {
        label: 'Ties',
        lines: [
          'Tied holes carry over.',
          'The next winning hole',
          '_pays the full stack._',
        ],
      },
    },
  ],
};

// -----------------------------------------------------------------
// v06 — Stableford
// -----------------------------------------------------------------
const stableford: GameData = {
  id: 'v06',
  slug: 'stableford',
  cover: {
    kicker: 'The Golf Bet',
    bigName: 'Stableford',
    tagline: 'Explained in 6 slides.',
  },
  hook: {
    leadItalic: 'Most golf scores count strokes.',
    midText: 'Stableford counts',
    bigWord: 'points.',
    pills: ['Par = 2', 'Birdie = 3', 'Bogey = 1'],
  },
  rules: [
    {
      kicker: 'Rule 1 of 3',
      titleLines: ['Points', 'per hole.'],
      exampleCard: {
        label: 'Standard table',
        lines: [
          'Eagle = 4 · Birdie = 3',
          'Par = 2 · Bogey = 1',
          '_Double or worse = 0._',
        ],
      },
    },
    {
      kicker: 'Rule 2 of 3',
      titleLines: ['Blow-ups', "don't bury you."],
      italicText:
        "Pick up any time. Bank zero.\nA 10 on one hole costs you\nthe same as a 7 does.",
      goldCallout: 'Pace of play fix.',
    },
    {
      kicker: 'Rule 3 of 3',
      titleLines: ['Most points', 'wins.'],
      italicText:
        'Total points after 18 = your score.\nHigher is better. Net handicaps\nwork cleanly with the point table.',
      sidebarCard: {
        label: 'Modified',
        lines: [
          'Eagle = +5, Birdie = +2,',
          'Par = 0, Bogey = -1,',
          '_Double or worse = -3._',
        ],
      },
    },
  ],
};

// -----------------------------------------------------------------
// v07 — Best Ball
// -----------------------------------------------------------------
const bestBall: GameData = {
  id: 'v07',
  slug: 'best-ball',
  cover: {
    kicker: 'The Golf Bet',
    bigName: 'Best Ball',
    tagline: 'Explained in 6 slides.',
  },
  hook: {
    leadItalic: 'Most people confuse it with scramble.',
    midText: 'Best Ball is',
    bigWord: 'own ball.',
    pills: ['Own ball', 'Team takes best', 'Per hole'],
  },
  rules: [
    {
      kicker: 'Rule 1 of 3',
      titleLines: ['Everyone', 'plays their ball.'],
      exampleCard: {
        label: 'Example',
        lines: [
          'You make 5. Partner makes 4.',
          'Team score on that hole',
          '_is 4 — the best ball._',
        ],
      },
    },
    {
      kicker: 'Rule 2 of 3',
      titleLines: ['Low man', 'sets the score.'],
      italicText:
        "Other scores on the team\nare irrelevant that hole.\nFree swings for the worse player.",
      goldCallout: 'Rip driver. No consequences.',
    },
    {
      kicker: 'Rule 3 of 3',
      titleLines: ['Net', 'handicaps.'],
      italicText:
        'Strokes apply per hole based on\nhandicap index. Plays well with\nany skill mix on the team.',
      sidebarCard: {
        label: 'Fun fact',
        lines: [
          'The Ryder Cup plays',
          'this format Friday',
          '_and Saturday mornings._',
        ],
      },
    },
  ],
};

// -----------------------------------------------------------------
// v08 — Match Play
// -----------------------------------------------------------------
const matchPlay: GameData = {
  id: 'v08',
  slug: 'match-play',
  cover: {
    kicker: 'The Golf Bet',
    bigName: 'Match Play',
    tagline: 'Explained in 6 slides.',
  },
  hook: {
    leadItalic: 'Stroke play counts every shot.',
    midText: 'Match Play counts',
    bigWord: 'holes.',
    pills: ['Win hole +1', 'Lose hole -1', 'Tie = 0'],
  },
  rules: [
    {
      kicker: 'Rule 1 of 3',
      titleLines: ['Win the hole,', 'go 1 up.'],
      exampleCard: {
        label: 'Example',
        lines: [
          'Hole 3: you make par.',
          'Opponent makes bogey.',
          '_You are now 1 up._',
        ],
      },
    },
    {
      kicker: 'Rule 2 of 3',
      titleLines: ['Score in', 'holes, not strokes.'],
      italicText:
        "A quadruple bogey costs\nyou one hole. Same as\na plain bogey. Massive relief.",
      goldCallout: 'Blowups are free. One hole only.',
    },
    {
      kicker: 'Rule 3 of 3',
      titleLines: ['Dormie.', 'Closeout.'],
      italicText:
        "Up by as many holes as remain?\nYou're dormie. Can't lose.\nImpossible to catch = match over.",
      sidebarCard: {
        label: 'Closeout',
        lines: [
          '"4 and 3" means',
          'you won by 4 holes',
          '_with 3 still to play._',
        ],
      },
    },
  ],
};

// -----------------------------------------------------------------
// v09 — Quota (Chicago)
// -----------------------------------------------------------------
const quota: GameData = {
  id: 'v09',
  slug: 'quota',
  cover: {
    kicker: 'The Golf Bet',
    bigName: 'Quota',
    tagline: 'Explained in 6 slides.',
  },
  hook: {
    leadItalic: 'Handicaps usually just subtract strokes.',
    midText: 'Quota makes them',
    bigWord: 'a target.',
    pills: ['36 − handicap', 'Earn points', 'Beat quota'],
  },
  rules: [
    {
      kicker: 'Rule 1 of 3',
      titleLines: ['Your quota', 'is 36 − hcp.'],
      exampleCard: {
        label: 'Example',
        lines: [
          '12 handicap → quota 24.',
          '5 handicap → quota 31.',
          '_Better player = bigger target._',
        ],
      },
    },
    {
      kicker: 'Rule 2 of 3',
      titleLines: ['Earn points', 'per hole.'],
      italicText:
        'Bogey = 1 point. Par = 2.\nBirdie = 4. Eagle = 8.\nNothing for double or worse.',
      goldCallout: 'Birdies pay quadruple.',
    },
    {
      kicker: 'Rule 3 of 3',
      titleLines: ['Beat your quota.', 'Most over wins.'],
      italicText:
        "Finish with 28 points on a 24\nquota? You're +4. High number\nrelative to quota wins the pot.",
      sidebarCard: {
        label: 'Also known as',
        lines: [
          'Chicago. Point.',
          'System 36.',
          '_Same idea, same math._',
        ],
      },
    },
  ],
};

// -----------------------------------------------------------------
// v10 — Nines (5-3-1)
// -----------------------------------------------------------------
const nines: GameData = {
  id: 'v10',
  slug: 'nines',
  cover: {
    kicker: 'The Golf Bet',
    bigName: 'Nines',
    tagline: 'Explained in 6 slides.',
  },
  hook: {
    leadItalic: '3 players. 9 points per hole.',
    midText: 'Also called',
    bigWord: '5-3-1.',
    pills: ['Best = 5', 'Middle = 3', 'Worst = 1'],
  },
  rules: [
    {
      kicker: 'Rule 1 of 3',
      titleLines: ['Split 9 points', 'every hole.'],
      exampleCard: {
        label: 'Clean result',
        lines: [
          'Low score = 5 points.',
          'Middle = 3. Worst = 1.',
          '_Total always equals 9._',
        ],
      },
    },
    {
      kicker: 'Rule 2 of 3',
      titleLines: ['Ties split', 'cleanly.'],
      italicText:
        'Two-way tie for low? 4 each,\n1 for worst. Three-way tie\nfor low? 3 points each.',
      goldCallout: 'No carryover — reset every hole.',
    },
    {
      kicker: 'Rule 3 of 3',
      titleLines: ['High total', 'after 18.'],
      italicText:
        'Pot pays per-point. Every hole\ncontributes. Hot streaks and\nslumps even out over the round.',
      sidebarCard: {
        label: 'Best for',
        lines: [
          'Threesomes that want',
          'everyone in every hole',
          '_with no dead weight._',
        ],
      },
    },
  ],
};

// -----------------------------------------------------------------
// v11 — Defender
// -----------------------------------------------------------------
const defender: GameData = {
  id: 'v11',
  slug: 'defender',
  cover: {
    kicker: 'The Golf Bet',
    bigName: 'Defender',
    tagline: 'Explained in 6 slides.',
  },
  hook: {
    leadItalic: 'One player vs the field.',
    midText: 'Defenders',
    bigWord: 'rotate.',
    pills: ['Defender solo', 'Field of 2-3', 'Win outright'],
  },
  rules: [
    {
      kicker: 'Rule 1 of 3',
      titleLines: ['Defender wins', 'outright: +3.'],
      exampleCard: {
        label: 'Example',
        lines: [
          "Dave is defender. He pars.",
          'Everyone else bogeys.',
          '_Dave banks 3 points._',
        ],
      },
    },
    {
      kicker: 'Rule 2 of 3',
      titleLines: ['Tie the hole:', '+1 defender.'],
      italicText:
        "Defender ties for low? Still\ngets something — just one point.\nAttackers get zero.",
      goldCallout: 'Ties favor the defender.',
    },
    {
      kicker: 'Rule 3 of 3',
      titleLines: ['Attackers win?', '+1 each.'],
      italicText:
        'Any attacker beats the defender\noutright — all attackers score.\nDefender gets zero.',
      sidebarCard: {
        label: 'Rotation',
        lines: [
          'Defender changes',
          'every hole.',
          '_Everyone takes a turn._',
        ],
      },
    },
  ],
};

// -----------------------------------------------------------------
// v12 — Sixes (Round Robin)
// -----------------------------------------------------------------
const sixes: GameData = {
  id: 'v12',
  slug: 'sixes',
  cover: {
    kicker: 'The Golf Bet',
    bigName: 'Sixes',
    tagline: 'Explained in 6 slides.',
  },
  hook: {
    leadItalic: '4 players. 3 segments.',
    midText: 'Partners',
    bigWord: 'rotate.',
    pills: ['Holes 1-6', 'Holes 7-12', 'Holes 13-18'],
  },
  rules: [
    {
      kicker: 'Segment 1',
      titleLines: ['Holes 1-6.', 'A+B vs C+D.'],
      exampleCard: {
        label: 'Best ball',
        lines: [
          'Teams play best ball.',
          'Low team score each hole',
          '_wins the segment point._',
        ],
      },
    },
    {
      kicker: 'Segment 2',
      titleLines: ['Holes 7-12.', 'A+C vs B+D.'],
      italicText:
        'Partners reshuffle. Your last\npartner is now your opponent.\nFresh best-ball battle.',
      goldCallout: 'Nobody gets the same team twice.',
    },
    {
      kicker: 'Segment 3',
      titleLines: ['Holes 13-18.', 'A+D vs B+C.'],
      italicText:
        "Final rotation. Everyone\nhas partnered with everyone.\nTotal points after 18 win.",
      sidebarCard: {
        label: 'Also called',
        lines: [
          'Round Robin.',
          'Hollywood. Whiskey.',
          '_Same rotation math._',
        ],
      },
    },
  ],
};

// -----------------------------------------------------------------
// v13 — Rabbit
// -----------------------------------------------------------------
const rabbit: GameData = {
  id: 'v13',
  slug: 'rabbit',
  cover: {
    kicker: 'The Golf Bet',
    bigName: 'Rabbit',
    tagline: 'Explained in 6 slides.',
  },
  hook: {
    leadItalic: "Chase the rabbit. It's not yours yet.",
    midText: 'Win outright,',
    bigWord: 'catch it.',
    pills: ['Win hole', 'Hold rabbit', 'Cash at end'],
  },
  rules: [
    {
      kicker: 'Rule 1 of 3',
      titleLines: ['Win a hole.', 'Grab the rabbit.'],
      exampleCard: {
        label: 'Example',
        lines: [
          'Hole 4: Mike birdies.',
          'Nobody ties.',
          '_Mike holds the rabbit._',
        ],
      },
    },
    {
      kicker: 'Rule 2 of 3',
      titleLines: ['Tie the hole.', 'Rabbit free.'],
      italicText:
        'A tied hole sets the rabbit loose.\nWhoever next wins a hole outright\npicks it up again.',
      goldCallout: 'Ties kill the rabbit.',
    },
    {
      kicker: 'Rule 3 of 3',
      titleLines: ['Two rabbits', 'per round.'],
      italicText:
        "Rabbit 1 cashes on hole 9.\nRabbit 2 resets for 10-18.\nHold it at the turn, hold it at 18 = pot.",
      sidebarCard: {
        label: 'Pro tip',
        lines: [
          'Rabbit is most alive',
          'on the final few holes.',
          '_Tensest bet in golf._',
        ],
      },
    },
  ],
};

// -----------------------------------------------------------------
// v14 — Prop Bets
// -----------------------------------------------------------------
const propBets: GameData = {
  id: 'v14',
  slug: 'prop-bets',
  cover: {
    kicker: 'The Golf Bet',
    bigName: 'Props',
    tagline: 'Explained in 6 slides.',
  },
  hook: {
    leadItalic: 'Scorecard bets miss the fun moments.',
    midText: 'Prop bets',
    bigWord: "catch 'em.",
    pills: ['CTP', 'Greenie', 'Sandie'],
  },
  rules: [
    {
      kicker: 'Round 1',
      titleLines: ['CTP &', 'Greenie.'],
      exampleCard: {
        label: 'Par 3s',
        lines: [
          'CTP: closest to the pin.',
          'Greenie: par-3, on in reg,',
          '_closest to the pin. Both pay._',
        ],
      },
    },
    {
      kicker: 'Round 2',
      titleLines: ['Sandie,', 'Barkie, Snake.'],
      italicText:
        'Sandie: up-and-down from sand.\nBarkie: hit a tree, make par.\nSnake: last 3-putt holds the snake.',
      goldCallout: 'Each pot runs independently.',
    },
    {
      kicker: 'Round 3',
      titleLines: ['Stack them', 'on the main game.'],
      italicText:
        "Props layer on top of Nassau,\nSkins, or anything else.\nEvery bet runs its own pot.",
      sidebarCard: {
        label: 'In MATCH',
        lines: [
          'Tap the prop button',
          'on any hole.',
          '_Auto-settles at the 19th._',
        ],
      },
    },
  ],
};

export const GAMES: GameData[] = [
  nassau,
  skins,
  wolf,
  vegas,
  stableford,
  bestBall,
  matchPlay,
  quota,
  nines,
  defender,
  sixes,
  rabbit,
  propBets,
];

export const getGame = (id: string): GameData => {
  const g = GAMES.find((x) => x.id === id);
  if (!g) throw new Error(`Unknown game id: ${id}`);
  return g;
};
