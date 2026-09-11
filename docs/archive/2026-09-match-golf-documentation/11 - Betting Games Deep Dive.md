# MATCH Golf - Betting Games Deep Dive

---

## Overview

MATCH Golf supports **10+ betting game types** and **12 prop bet types**, all implemented as pure functions in `src/lib/games/`. Every game calculator takes player data, scores, and configuration as input and returns deterministic results with no side effects.

---

## 1. NASSAU

### How It Works
Nassau is three separate bets in one: Front 9, Back 9, and Overall 18. Each bet is won independently. It's the most popular golf betting game in the United States.

### Configuration
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `stakes` | number | -- | Dollar amount per bet (3 bets total) |
| `autoPress` | boolean | false | Auto-press when 2 holes down |
| `useNet` | boolean | false | Use handicap strokes |
| `holesInRound` | number | 18 | 9 or 18 |

### How Presses Work
- When a player is 2 down in any segment, a "press" starts a new sub-match from that hole
- Each press is a separate bet at the same stakes
- Presses cannot start on the last hole of a segment
- Multiple presses can be active simultaneously

### Example
- $5 Nassau = $15 total at risk (Front $5, Back $5, Overall $5)
- Player A wins front 9: Player B owes $5
- Player B wins back 9: Player A owes $5
- Player A wins overall: Player B owes $5
- Net: Player B owes Player A $5

### Test Coverage: 27 tests
- Front/back/overall winner calculation
- Auto-press triggering and blocking
- 9-hole round support
- Net scoring with handicaps
- Tie handling

---

## 2. SKINS

### How It Works
Each hole has a "skin" worth one unit (stake amount). The lowest score on a hole wins the skin. If two or more players tie for lowest, the skin is either lost or carries over to the next hole (carryover option).

### Configuration
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `stakes` | number | -- | Dollar amount per skin |
| `carryover` | boolean | false | Ties carry pot to next hole (Pro feature) |
| `useNet` | boolean | false | Use handicap strokes |

### Key Rule: Per-Player Contribution
Each player's total cost is based on the number of holes they actually scored, not the total holes in the round. If Player A only scored 15 holes, they contribute to 15 skins, not 18.

### Example (No Carryover)
- $2 Skins, 4 players
- Hole 1: Player A gets 3, everyone else gets 4 → Player A wins $2
- Hole 2: Players A and B tie at 3 → No winner, skin lost
- Hole 3: Player C gets 2 (lowest) → Player C wins $2

### Example (With Carryover)
- Hole 2 tie → $2 carries to Hole 3
- Hole 3 winner gets $4 (Hole 2 + Hole 3)
- If last hole ties with carryover, entire accumulated pot goes to... the pot is lost

### Test Coverage: 24 tests
- Single and multi-hole wins
- Carryover accumulation
- Per-player contribution calculation
- Net scoring
- Adapts to 9-hole rounds

---

## 3. MATCH PLAY

### How It Works
Two players compete hole-by-hole. Win a hole = +1, lose a hole = -1, tie = 0. The player ahead is described as "2 up" or "3 & 2" (won by 3 with 2 holes remaining).

### Configuration
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `stakes` | number | -- | Dollar amount for the match |
| `useNet` | boolean | false | Use handicap strokes |

### Terminology
| Status | Meaning |
|--------|---------|
| "2 up" | Leading by 2 holes |
| "All Square" | Tied |
| "3 & 2" | Won by 3 with 2 holes to play (match over) |
| "1 up" | Won by 1 (decided on last hole) |
| "Dormie" | Leading by same number of holes remaining |

### Early Close
A match can end before all 18 holes if a player leads by more holes than remain. Example: 5 up with 4 to play = "5 & 4".

### Test Coverage: 31 tests
- Hole-by-hole winner determination
- Net scoring with handicap strokes
- Early close detection
- Status string formatting
- Tie/all-square handling

---

## 4. WOLF

### How It Works
4 players rotate as "Wolf." Before others tee off, the Wolf watches each player's drive and either:
1. **Picks a partner** → Wolf + Partner vs. the other two
2. **Goes alone (Lone Wolf)** → Wolf vs. the field (2x points)
3. **Declares Blind Wolf** → Before anyone tees off, goes alone (3x points)

### Configuration
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `stakes` | number | -- | Dollar amount per point |
| `carryover` | boolean | false | Ties carry to next hole |
| `blindWolfMultiplier` | number | 3 | Blind Wolf point multiplier |

### Rotation
Players rotate Wolf duty: 1, 2, 3, 4, 1, 2, 3, 4, ... For the last 2 holes, the lowest-scoring player is Wolf.

### Points
| Scenario | Wolf Wins | Wolf Loses |
|----------|-----------|------------|
| Wolf + Partner | Wolf & partner each +1 | Each -1 |
| Lone Wolf | Wolf +2 per opponent | Wolf -2 per opponent |
| Blind Wolf | Wolf +3 per opponent | Wolf -3 per opponent |

### Float Drift Prevention
Points are accumulated as whole numbers throughout the round. Division by the number of non-wolf players happens once at the end to prevent floating-point drift.

### Test Coverage: 55 tests (most extensive)
- Wolf rotation for 3, 4, and 5 players
- Partner selection
- Lone Wolf scoring
- Blind Wolf scoring and multiplier
- Point accumulation and settlement
- Carryover mechanics

---

## 5. STABLEFORD

### How It Works
Points-based scoring system. Instead of total strokes, players earn points based on their score relative to par on each hole.

### Standard Scoring
| Score | Relative to Par | Points |
|-------|----------------|--------|
| Albatross or better | -3 or better | 5 |
| Eagle | -2 | 4 |
| Birdie | -1 | 3 |
| Par | 0 | 2 |
| Bogey | +1 | 1 |
| Double bogey or worse | +2 or worse | 0 |

### Modified Stableford Scoring
| Score | Relative to Par | Points |
|-------|----------------|--------|
| Albatross or better | -3 or better | 8 |
| Eagle | -2 | 5 |
| Birdie | -1 | 2 |
| Par | 0 | 0 |
| Bogey | +1 | -1 |
| Double bogey or worse | +2 or worse | -3 |

### Display Format
- Positive: `+5 pts`
- Zero: `0 pts`
- Negative: `-3 pts`

### Configuration
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `stakes` | number | -- | Dollar amount per point difference |
| `modifiedStableford` | boolean | false | Use modified scoring (can go negative) |
| `useNet` | boolean | false | Use handicap strokes |

### Test Coverage: 42 tests

---

## 6. BEST BALL

### How It Works
Team format. Each team's best score per hole counts. The team with the lower best score wins the hole.

### Configuration
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `stakes` | number | -- | Dollar amount per hole won |
| `teams` | Team[] | -- | Team assignments with colors |
| `useNet` | boolean | false | Use handicap strokes |

### Team Structure
```typescript
interface Team {
  id: string;
  name: string;
  playerIds: string[];
  color: string;
}
```

### Test Coverage: 30 tests

---

## 7. HOUSE GAMES (Custom Format Builder)

### How It Works
Users can create custom game formats by combining 50+ configurable "primitives" across 8 categories. The AI builder can parse natural language descriptions into primitive configurations.

### Primitive Categories

| Category | Count | Examples |
|----------|-------|---------|
| **Press** | 10 | Auto-press X down, birdie press, eagle press, manual request, double-or-nothing, max per round, new sub-match |
| **Scoring** | 14 | Nassau, skins, match play, stroke play, stableford, modified stableford, wolf, vegas, hammer, bingo bango bongo, rabbit, quota, defender, sixes |
| **Bonus** | 7 | Par 5 double, par 3 special, birdie unit bonus, eagle unit bonus, greenie, last hole double, garbage tracking |
| **Carryover** | 5 | Skins halved, carryover cap, jackpot 18, reset on win, Nassau halved |
| **Handicap** | 6 | Handicap percentage, stroke index, ghost player, max cap, bump and run, mixed tees |
| **Casual** | 7 | Gimme distance, breakfast ball, mulligans, no blood, preferred lies, concede match, foot wedge |
| **Settlement** | 8 | Unit value, pay per hole, end of round, running tab, net out, rain shortened, max loss cap, ties split/carryover |
| **Group** | 6 | Min players, pickup rule, sub-in, fixed teams, rotating teams, wolf lone multiplier, point bank |

### AI Builder Flow
1. User describes game in natural language (voice or text)
2. Sent to `parse-house-game` edge function
3. Returns parsed primitives with confidence levels
4. User reviews and adjusts
5. Saved as group format or personal format

---

## 8. ADDITIONAL GAME TYPES

### Vegas
Team-based: combine two-player scores into a single number (e.g., 4 and 5 = 45). Lower combined number wins.

### Rabbit
Possession game: win a hole to "grab the rabbit." Whoever holds the rabbit at the end of 9 holes wins. If you win a hole, you take the rabbit from whoever had it.

### Quota
Each player gets a target based on their handicap (36 - handicap = quota). Stableford points are earned; beat your quota to win.

---

## 9. SETTLEMENT ENGINE

### How It Works
After a round, the settlement engine aggregates all money owed across ALL active games and prop bets, then nets out transactions.

### Algorithm
1. Calculate winnings/losses per game (Nassau, Skins, Wolf, etc.)
2. Calculate prop bet winnings
3. Aggregate per-player-pair
4. Net out (if A owes B $8 and B owes A $3, result: A owes B $5)
5. Round to 2 decimal places

### Output
```typescript
interface Settlement {
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  amount: number;       // Always positive, rounded to cents
  description: string;  // e.g., "Nassau Front 9 + Skins"
}
```

### Status Tracking
| Status | Meaning |
|--------|---------|
| `pending` | Money owed, not yet paid |
| `paid` | Marked as paid by either party |
| `forgiven` | Debt forgiven |

### Test Coverage: 18 tests
- Multi-game aggregation
- Rounding precision
- Net-out between players
- Edge cases (all tied, one player wins everything)

---

## 10. LIVE MONEY TRACKER

### How It Works
During a round, the money tracker shows each player's running balance across all active games. Updated after every score entry.

### Display
```typescript
interface PlayerMoney {
  playerId: string;
  playerName: string;
  currentBalance: number;    // Positive = winning
  previousBalance: number;   // Balance before last hole
  change: number;            // Change from last hole
}
```

### Visual
- Green badge: winning (+$12.50)
- Red badge: losing (-$8.00)
- Animated number transitions on balance changes
