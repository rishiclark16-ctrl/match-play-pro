# Golf Game Formats - Comprehensive Research

Research compiled for MATCH Golf scorecard app development. This document covers scoring mechanics, handicap application, money tracking, common variations, and scorecard display requirements for every major golf betting/scoring format.

---

## Table of Contents

1. [Skins](#1-skins)
2. [Nassau](#2-nassau)
3. [Wolf](#3-wolf)
4. [Stableford](#4-stableford)
5. [Best Ball](#5-best-ball)
6. [Match Play](#6-match-play)
7. [Side Bets / Prop Bets](#7-side-bets--prop-bets)
8. [Bingo Bango Bongo](#8-bingo-bango-bongo)
9. [Vegas](#9-vegas)
10. [Hammer](#10-hammer)
11. [Rabbit](#11-rabbit)
12. [Quota](#12-quota)
13. [House Games](#13-house-games)
14. [Scorecard App Best Practices](#14-scorecard-app-best-practices)
15. [Competitive App Analysis](#15-competitive-app-analysis)
16. [Implementation Status in MATCH Golf](#16-implementation-status)

---

## 1. Skins

### How Scoring Works

Skins is a hole-by-hole competition where each hole has a value (one "skin"). The player with the sole lowest score on a hole wins the skin for that hole.

**Stroke-by-stroke breakdown:**
- After all players complete a hole, compare scores
- If one player has the outright lowest score, they win the skin
- If two or more players tie for the lowest score, the skin is either carried over or lost (depending on rules)
- The value of a skin can be fixed (e.g., $5 per skin) or variable

**Example (4 players, $5/skin):**
| Hole | Player A | Player B | Player C | Player D | Result |
|------|----------|----------|----------|----------|--------|
| 1    | 4        | 5        | 4        | 6        | Tie (A & C) - carry |
| 2    | 3        | 4        | 5        | 4        | A wins (2 skins) |
| 3    | 4        | 4        | 4        | 4        | Tie - carry |
| 4    | 5        | 3        | 4        | 4        | B wins (2 skins) |

### How Handicaps Affect Results

**Gross Skins:** Raw scores compared directly. Favors low-handicap players.

**Net Skins:** Each player's score is adjusted by handicap strokes allocated per hole using the course stroke index.
- A 12-handicap player receives one stroke on the 12 hardest holes (stroke index 1-12)
- Net score = gross score - strokes received on that hole
- This levels the playing field and is the most common format for mixed-handicap groups

**Stroke allocation:** Strokes are distributed by hole handicap/stroke index. The #1 stroke index hole gets the first stroke, #2 gets the second, and so on. Players with handicaps over 18 receive a second stroke on the hardest holes (e.g., a 20-handicap gets 2 strokes on stroke index 1 and 2, and 1 stroke on holes 3-18).

### How Money/Bets Are Tracked

**Per-skin value method:** Each skin is worth a fixed dollar amount. Players contribute to a pot.
- Total pot = number of holes x number of players x stake per skin
- Example: 18 holes, 4 players, $5/skin = $360 total pot
- Each player's cost = 18 x $5 = $90 per player
- Earnings = (skins won x value per skin won) - player's contribution

**Per-hole pot method:** Each hole's pot = stake x number of players. Winner takes the pot.
- If $5/skin and 4 players, each hole's pot = $20
- A skin with 3 carryovers is worth 4 x $20 = $80

### Common Variations

1. **Carryover (standard):** Tied holes carry their skin to the next hole, increasing the next hole's value. Most common variant.
2. **No carryover:** Tied holes are simply dead -- no one wins and the skin evaporates. Keeps payouts smaller.
3. **Validation skins:** To win a skin, you must par or better the next hole to "validate" it. If you don't, the skin carries over.
4. **Super skins:** Carryovers continue to accumulate with no cap. Can create very large pots on later holes.
5. **Reverse skins:** Highest score on a hole wins (gag game).
6. **Back-9 skins only:** Front 9 is stroke play; skins are only played on holes 10-18.
7. **Split-pot on 18:** If any skins remain unclaimed after hole 18, they are split among all players (or the player with the most skins gets the remainder).
8. **Jackpot 18:** All unclaimed carryovers are decided on hole 18 regardless of a tie.

### What the Scorecard Should Show

**During the round:**
- Current hole's skin value (base + carryovers)
- Running total of skins won per player
- Running money balance per player
- Carryover count indicator
- Visual indicator of who won each previous hole (checkmark, highlight)

**After the round:**
- Total skins won per player
- Net earnings/losses per player
- Hole-by-hole breakdown showing winner or "carry" for each hole
- Settlement amounts (who owes whom)

---

## 2. Nassau

### How Scoring Works

The Nassau is three separate bets in one: front 9, back 9, and overall 18 holes. Each bet is typically the same dollar amount (the "Nassau amount"). It is essentially three match-play or stroke-play competitions running simultaneously.

**Stroke-by-stroke breakdown:**
- Track cumulative stroke totals for front 9 (holes 1-9), back 9 (holes 10-18), and overall (holes 1-18)
- In stroke play Nassau: lower total strokes wins each segment
- In match play Nassau: holes won determines each segment winner
- The most common format is stroke play within each segment

**Scoring states:**
- "2 UP" = leading by 2 strokes/holes
- "All Square" (AS) = tied
- "Dormie" = up by the exact number of holes remaining in that segment

**Example ($10 Nassau, stroke play, 2 players):**
- Front 9: Player A shoots 38, Player B shoots 40 -- A wins $10
- Back 9: Player B shoots 35, Player A shoots 37 -- B wins $10
- Overall: A shoots 75, B shoots 75 -- Push (no payout)
- Net result: Even

### How Handicaps Affect Results

Nassau is almost always played with handicaps (net scoring):
- Calculate playing handicap using course slope/rating
- Distribute strokes by hole stroke index
- Net score per hole = gross score - strokes received
- Compare net totals for each segment

**Bump-and-run (low-ball) method:** Subtract the lowest handicap from all players. The scratch player gets zero, and higher handicappers get the difference. This is common because it avoids fractional strokes.

### How Money/Bets Are Tracked

**Base bet:** Three separate bets of equal value. A "$10 Nassau" means:
- $10 on front 9
- $10 on back 9
- $10 on overall
- Maximum exposure without presses: $30

**Presses (the key Nassau mechanic):**
A press is a new bet that starts mid-round when one player falls behind. It creates a new sub-match from the press hole to the end of the segment.

**Auto-press (2-down press):** When a player falls 2 down (2 holes or 2 strokes behind), a new press is automatically triggered. This new bet covers the remaining holes in the segment.

**Press rules variations:**
- Presses are for the same stakes as the original bet
- Each press can itself be pressed (press of a press)
- Maximum presses per segment (typically 2-3 to cap exposure)
- Some groups require a press to be accepted by the opponent
- "Double or nothing" press: doubles the existing bet instead of adding a new one

**Example of cascading presses ($10 Nassau):**
- Hole 3: Player A goes 2 down -- auto-press starts ($10 more, holes 4-9)
- Hole 6: Player A goes 2 down on the press -- another press ($10 more, holes 7-9)
- Player A's exposure on front 9 alone: $10 (original) + $10 (press 1) + $10 (press 2) = $30

### Common Variations

1. **Auto-press when 2-down (standard):** Most common. Press triggers automatically at 2 down.
2. **Manual press:** Player must request a press; opponent can decline.
3. **Mandatory press:** Must press when 2 down; no choice.
4. **Press limit:** Cap at 2-3 presses per nine to limit exposure.
5. **Back 9 auto-press:** Automatic new press at the start of the back 9, regardless of standing.
6. **No dormie press:** Cannot press once dormie (prevents desperation bets).
7. **Press birdie/eagle:** A press is automatically triggered when any player makes birdie or eagle.
8. **Nassau with skins:** Combine Nassau structure with a skins game running alongside.
9. **5-5-5 or 10-10-10:** Common shorthand for equal stakes on each segment.

### What the Scorecard Should Show

**During the round:**
- Current segment (Front 9 / Back 9)
- Current standing in each active bet (e.g., "2 DOWN" or "1 UP")
- Number of active presses and their standings
- Running money exposure (total at risk)
- Press availability indicator (can I press right now?)
- Urgency indicators (must-win holes)

**After the round:**
- Winner of each segment (front, back, overall)
- Press results
- Total payout per player
- Settlement breakdown

---

## 3. Wolf

### How Scoring Works

Wolf is a 4-player game with rotating roles. On each hole, one player is designated the "Wolf" and must decide whether to play alone (Lone Wolf) against the other three, or select a partner to play 2v2 against the remaining two players.

**Rotation:**
- The Wolf rotates each hole: Player A is Wolf on hole 1, Player B on hole 2, Player C on hole 3, Player D on hole 4, then back to A on hole 5
- The Wolf tees off last (or observes others' tee shots first)
- After watching each player's tee shot, the Wolf can choose that player as a partner immediately, or wait
- The Wolf must decide before the next player hits -- once passed, cannot go back
- If the Wolf doesn't pick anyone by the time all three have hit, the Wolf goes alone

**Scoring per hole (2v2):**
- Compare the best ball of each team
- Winning team gets 2 points per player from each losing team member
- Total value: 4 points changing hands (2 per winner from each loser)

**Scoring per hole (Lone Wolf):**
- Wolf plays against all three hunters
- Lone Wolf wins: gets 4 points from each hunter (12 total)
- Lone Wolf loses: pays 4 points to each hunter (12 total)
- Higher risk/reward than 2v2

### Blind Wolf

Declared BEFORE anyone tees off. The Wolf announces they are going alone without seeing any tee shots. Typically doubles or triples the point value:
- Blind Wolf wins: 8 points from each hunter (24 total)
- Blind Wolf loses: pays 8 points to each hunter (24 total)

### Team Scoring Detail

In 2v2, the team's score for the hole is the better (lower) ball of the two partners:
- Wolf team: best of Wolf's score and partner's score
- Hunter team: best of the two hunters' scores
- Lower team score wins the hole
- If tied, the hole is a push (no points awarded, or points carry to next hole)

### How Handicaps Affect Results

- Typically played with net scores
- Playing handicap calculated per player, strokes distributed by hole stroke index
- Net score on each hole determines best ball for each team
- "Low ball" handicapping: subtract the lowest handicap from all four to get relative strokes

### How Money/Bets Are Tracked

Point-based system with a dollar value per point:
- Set value per point (e.g., $1/point)
- Track running point totals for each player
- Settle at end of round: net points x dollar value
- Zero-sum: total of all four players' points always equals zero

### Common Variations

1. **Pig / Hog:** If the Wolf chooses a partner and loses, Wolf pays double (they "pigged" the hole)
2. **Lone Wolf must beat all three individually:** Instead of best ball, Lone Wolf must have the lowest score among all four players
3. **Last 2 holes:** On holes 17 and 18, the player in last place gets to be Wolf regardless of rotation
4. **Hammer Wolf:** Combine Wolf with Hammer -- either team can "hammer" to double the stakes mid-hole
5. **6-6-6 Wolf:** Teams rotate every 6 holes instead of every hole
6. **Pushes carry:** When a hole pushes, the points carry to the next hole

### What the Scorecard Should Show

**During the round:**
- Who is the Wolf this hole (highlighted player)
- Teeing order (Wolf goes last)
- Partner selection UI (tap to choose partner after each tee shot)
- Blind Wolf option (before tee shots)
- Current point standings for all four players
- Running money balance

**After the round:**
- Total points per player
- Money won/lost per player
- Lone Wolf record (wins/losses when going alone)
- Blind Wolf record
- Times as Wolf

---

## 4. Stableford

### How Scoring Works

Stableford awards points based on each hole's score relative to par. Higher points are better. The player with the most points at the end wins.

**Standard Stableford points:**
| Score vs Par | Name | Points |
|-------------|------|--------|
| -3 or better | Albatross | 5 |
| -2 | Eagle | 4 |
| -1 | Birdie | 3 |
| 0 | Par | 2 |
| +1 | Bogey | 1 |
| +2 | Double bogey | 0 |
| +3 or worse | Triple+ | 0 |

**Modified Stableford (PGA Tour "International" variant):**
| Score vs Par | Name | Points |
|-------------|------|--------|
| -3 or better | Albatross | 8 |
| -2 | Eagle | 5 |
| -1 | Birdie | 2 |
| 0 | Par | 0 |
| +1 | Bogey | -1 |
| +2 | Double bogey | -3 |
| +3 or worse | Triple+ | -3 |

**Key benefit of Stableford:** Encourages aggressive play. Since double bogey and worse all score zero (in standard), there's no penalty for a blowup hole. Players can "pick up" after double bogey without affecting their score.

### How Handicaps Affect Results

Stableford is almost always played with handicaps (net Stableford):
- Calculate net score per hole: gross score - handicap strokes received on that hole
- Award points based on the net score relative to par
- This means a bogey golfer getting a stroke on a hole who makes a gross bogey gets a net par = 2 points

**Example:** Player with 18 handicap (gets 1 stroke per hole):
- Gross bogey (5 on a par 4) = net par = 2 points
- Gross par (4 on a par 4) = net birdie = 3 points
- Gross double (6 on a par 4) = net bogey = 1 point

### How Money/Bets Are Tracked

Several common betting structures:

1. **Per-point value:** Each point is worth $X. Winner's margin in points x $X = payout.
   - Example: Player A gets 38 points, Player B gets 34 points. At $1/point, A wins $4 from B.

2. **Pool/pot:** Each player puts $X in the pot. Highest point total wins the pot.
   - Can split: 1st place gets 60%, 2nd gets 25%, 3rd gets 15%.

3. **Quota-style (see Quota game):** Each player has a target based on handicap. Points above/below target determine payouts.

4. **Point differential:** Pay the difference in points between each pair of players.

### Common Variations

1. **Standard vs. Modified:** Modified rewards birdies more and penalizes bogeys (negative points).
2. **36-point target:** Standard Stableford with full handicap targets 36 points (2 per hole x 18). Anything above is "beating your handicap."
3. **Team Stableford:** Best X of Y scores count per team per hole.
4. **Pick-up rule:** Players can pick up once they can't score points on a hole (speeds play).
5. **Bonus points:** Additional points for chip-ins, longest putt, etc.
6. **Double points on par 5s:** Par 5s count for double the normal points.
7. **Stableford with skins overlay:** Award skins to the player with the most points on each individual hole.

### What the Scorecard Should Show

**During the round:**
- Points earned per hole (prominently displayed)
- Running point total
- Points relative to "par" (36 for standard)
- Current ranking among players
- Color coding: green for 3+ points, neutral for 2, red for 0-1

**After the round:**
- Total points per player
- Points breakdown by hole
- Money won/lost
- Best hole (most points)
- Comparison to 36-point target

---

## 5. Best Ball

### How Scoring Works

Best Ball (also called "Four-Ball" in official rules) is a team format where each player plays their own ball, and the team's score for each hole is the lowest (best) score among the team members.

**Common configurations:**
- 2v2 (four players, two teams of two) -- most common
- 3v1 (three vs one -- rare)
- 2-person team vs the field

**Stroke-by-stroke breakdown:**
- All players play every hole normally
- On each hole, each team's best individual net score counts as the team score
- The team with the lower best-ball score wins the hole
- Can be played as match play (holes won) or stroke play (total best-ball strokes)

**Example (2v2, hole par 4):**
- Team 1: Player A makes 4, Player B makes 6 -- team score = 4
- Team 2: Player C makes 5, Player D makes 3 -- team score = 3
- Team 2 wins the hole

### How Handicaps Affect Results

Net Best Ball is the standard:
- Each player receives handicap strokes on holes according to stroke index
- Net score = gross score - strokes received on that hole
- The team's score = lowest net score among team members
- This is critical: the team's contributing player may change hole to hole

**Handicap percentage:** In competitive best ball, handicaps are often reduced:
- USGA recommends: Use 90% of each player's course handicap for four-ball stroke play
- Many casual groups use 100%

### How Money/Bets Are Tracked

1. **Match play format:** The team that wins the most holes wins the bet (fixed bet amount).
   - Example: $20 best ball match. Team with more holes won gets $20 (each losing player pays $10 to each winning player).

2. **Stroke play format:** Lower total best-ball score over 18 holes wins.
   - Can bet on total or per-stroke margin.

3. **Combined with Nassau:** Best Ball Nassau -- front 9, back 9, overall as separate bets.

4. **Per-hole payout:** Each hole has a value, winner takes it.

### Common Variations

1. **Best Ball Match Play:** Holes won/lost/halved determine winner.
2. **Best Ball Stroke Play:** Total best-ball strokes determine winner.
3. **Aggregate Best Ball:** Add both team members' scores (not just the best). Also called "Scramble" when played cooperatively.
4. **Best Ball with Skins:** Overlay a skins game on top of the best ball match.
5. **Chapman/Pinehurst:** Both players tee off, swap balls, play the second shot with the other player's ball, then select one ball to finish.
6. **Shamble:** Both tee off, pick the best drive, then play individual balls from there.

### What the Scorecard Should Show

**During the round:**
- Both teams' best-ball scores per hole (highlighted contributing player)
- Match status (e.g., "Team A 2 UP" or "All Square")
- Which player on each team contributed the best score (star/highlight)
- Individual scores for all players
- Running team totals (relative to par)
- Player contribution tracking (how many holes each player was the "best ball")

**After the round:**
- Match result
- Team best-ball totals
- Individual contributions (which player was the "carry" for their team most often)
- Money settlement

---

## 6. Match Play

### How Scoring Works

Match play is hole-by-hole competition. Each hole is a separate contest. The player with the lower score wins the hole. The player who wins the most holes wins the match.

**Hole results:**
- **Won:** One player has a lower net score -- they go "1 UP"
- **Halved:** Both players tie -- hole is halved, no change in standing
- **Conceded:** A player concedes the hole (picks up)

**Match status terminology:**
- "2 UP through 14" = leading by 2 holes with 4 holes remaining
- "All Square" (AS) = tied
- "Dormie" = up by exactly the number of holes remaining (e.g., 3 UP with 3 to play). The leading player cannot lose -- they can only win or halve.

**Match is won when:** A player is up by more holes than remain. Example: 4 UP with 3 to play = match over ("4&3").

**Notation:** Match results are written as "X&Y" where X is holes up and Y is holes remaining. "1 UP" means won on the final hole by 1.

### How Handicaps Affect Results

Match play always uses net scores:
- Calculate the difference in handicaps between the two players
- The lower-handicap player gives strokes to the higher-handicap player
- **Standard method:** Subtract lower handicap from higher. The difference is the number of strokes the higher-handicap player receives.
- Strokes are distributed by hole stroke index

**Example:**
- Player A: 10 handicap, Player B: 18 handicap
- Difference: 8 strokes. Player B gets a stroke on the 8 hardest holes (stroke index 1-8)
- On those 8 holes, Player B's net score = gross score - 1

**Important:** In match play, only the differential matters. You don't apply full handicaps to both players -- just the difference.

### How Money/Bets Are Tracked

1. **Flat bet:** Fixed amount on the match result. Example: $20 match. Winner gets $20.
2. **Per-hole value:** Each hole won is worth $X. Total owed = holes won x $X.
3. **Nassau overlay:** Match play within a Nassau structure (front, back, overall).
4. **Calcutta/Auction:** Players auction off participants; winning bidders get payouts based on results.

### Common Variations

1. **Concession (gimmes):** In match play, players can concede short putts to speed play.
2. **Best Ball Match Play:** 2v2 team match play using best ball format.
3. **Four-Ball Match Play:** Same as best ball match play (official USGA name).
4. **Singles Match Play:** 1v1 (the classic format).
5. **Playoff holes:** If all square after 18, play sudden-death playoff holes.
6. **Halved match:** Some groups allow a halved match (tie); others require a winner.

### What the Scorecard Should Show

**During the round:**
- Current match status ("2 UP", "All Square", "Dormie")
- Holes won by each player (visual dots/markers)
- Which player won each completed hole
- Net scores per hole (showing strokes received)
- Holes remaining
- Whether match is still alive or closed out

**After the round:**
- Final result (e.g., "Player A wins 3&2")
- Hole-by-hole results
- Strokes received by each player
- Money settlement

---

## 7. Side Bets / Prop Bets

Side bets run alongside the main game. They are independent of the primary scoring format and add excitement to specific situations.

### CTP (Closest to the Pin) / KP

**How it works:** On par 3 holes (and sometimes other holes), the player whose tee shot finishes closest to the pin wins.
- Typically measured after all players have hit their tee shots
- Ball must be on the green to qualify (some groups allow fringe)
- Often played on all par 3s in the round (typically 4 per 18 holes)

**Money:** Fixed stakes per CTP hole. Winner collects from all other players.
- Example: $5 CTP. In a 4-player group, winner gets $15 (3 x $5).

### Greenies

**How it works:** More selective than CTP. To win a greenie:
1. Must hit the green in regulation on a par 3
2. Must be the closest to the pin among those who hit the green
3. Must make par or better (some groups require 1-putt/birdie)

If nobody hits the green, no greenie is awarded. If the closest player 3-putts, they lose the greenie (some variations).

**Money:** Same as CTP -- winner collects from all.

### Sandies

**How it works:** A player earns a sandie by making par or better after being in a greenside bunker during the hole.
- Must go into a bunker and get up-and-down for par
- Some groups: must be a greenside bunker specifically
- Some groups: fairway bunker sandies count too but at a different value

**Money:** Each sandie is worth $X collected from all other players.

### Barkies

**How it works:** A player earns a barkie by making par or better after hitting a tree during the hole.
- The ball must visibly hit a tree (honor system)
- Player must still make par or better for it to count

**Money:** Fixed value, collected from all players.

### Snake

**How it works:** The Snake is a negative/penalty bet. The last player to 3-putt during the round "has the snake" and must pay.
- The snake starts unclaimed
- First player to 3-putt picks up the snake
- If another player 3-putts later, the snake passes to them
- At the end of the round, whoever is holding the snake pays
- **Some variations:** Each time the snake changes hands, the value doubles

**Money:** Fixed value or escalating. The snake holder at the end of round 18 pays all other players.

**Example ($5 snake, doubling):**
- Hole 3: Player A 3-putts (snake = $5)
- Hole 7: Player C 3-putts (snake passes, now = $10)
- Hole 14: Player A 3-putts again (snake passes back, now = $20)
- End of round: Player A holds the snake, pays $20 to each player ($60 total)

### Longest Drive

**How it works:** On a designated hole (usually a wide par 4 or par 5), the player with the longest drive in the fairway wins.
- Ball must be in the fairway to qualify
- Measured from tee to ball position
- Usually played on 1-2 holes per round

**Money:** Fixed stakes, winner collects from all.

### Other Common Side Bets

**Ferret (Golden Ferret):** Holing out from off the green (chip-in, bunker hole-out). Each one earns $X from all players.

**Oozle:** Missing the green on a par 3 but still making par. Earns $X.

**Chippy:** Chipping in from off the green for par or better.

**Polie:** Making a long putt (varies: 15ft+, 20ft+, or longest putt on the hole).

**Arnie:** Making par or better after hitting into the trees (named after Arnold Palmer).

**Murphys/Hogans:** Various recovery shots that result in par or better.

### What the Scorecard Should Show

**During the round:**
- Active side bets for the current hole
- Quick-entry buttons to record prop bet events
- Running side bet tally per player
- Snake holder indicator (with current value)
- CTP/Greenie eligibility indicator on par 3s

**After the round:**
- Total side bet earnings/losses per player
- List of all awarded side bets with hole numbers
- Settlement included in main payout

---

## 8. Bingo Bango Bongo

### How Scoring Works

Three points are available on every hole, awarded for three different achievements:

1. **Bingo:** First player to get their ball on the green. This is about order of play, not distance -- the player farthest from the hole plays first, so higher-handicap players often have an advantage here.

2. **Bango:** The player whose ball is closest to the pin after all players are on the green. This is purely a distance measurement once everyone is putting.

3. **Bongo:** The first player to hole out. Again, the player farthest from the hole putts first, so this rewards putting skill from distance.

**Important etiquette:** Proper order of play matters. In Bingo Bango Bongo, you must play in the correct order (farthest from hole plays first). This is one of the few games where order of play is enforced, because the "first on" and "first in" points depend on it.

### How Handicaps Affect Results

BBB is inherently equalizing because:
- Higher handicap players hit more shots, meaning they often play first (from farther away), giving them a natural advantage on Bingo (first on green) and Bongo (first to hole out)
- No formal handicap adjustment is needed -- the format itself levels the field
- Some groups still apply net scoring for the "closest to pin" (Bango) calculation

### How Money/Bets Are Tracked

- Each point is worth a fixed dollar amount
- 3 points per hole x 18 holes = 54 total points available
- Points are simply tallied per player
- At the end of the round, players settle based on point differentials

**Example ($2 per point, 4 players):**
- Player A: 20 points, Player B: 15 points, Player C: 12 points, Player D: 7 points
- Player A collects: $2 x (20-15) from B + $2 x (20-12) from C + $2 x (20-7) from D = $10 + $16 + $26 = $52

### Common Variations

1. **Points can go to different players on same hole:** All three points can go to three different players, or one player can sweep all three.
2. **Ties on Bango:** If two players are equidistant from the pin, no Bango is awarded (or it's split).
3. **Modified point values:** Bingo = 1pt, Bango = 2pts, Bongo = 1pt (rewarding proximity over order).
4. **BBB combined with other games:** Often played alongside skins or Nassau.

### What the Scorecard Should Show

**During the round:**
- Three-column display per hole: Bingo / Bango / Bongo
- Quick player selection for each point (tap to award)
- Running point totals per player
- Running money balance

**After the round:**
- Total points per player
- Breakdown of Bingo/Bango/Bongo points individually
- Money settlement

---

## 9. Vegas

### How Scoring Works

Vegas is a 2v2 team game. The unique mechanic is how team scores are calculated: instead of adding the two players' scores, you create a two-digit number by placing the lower score first.

**The digit combination method:**
- Take both team members' scores on a hole
- Put the lower number in the tens place, higher number in the ones place
- This creates the team's number for that hole

**Example (par 4):**
- Team 1: Player A scores 4, Player B scores 6 -- team number = 46
- Team 2: Player C scores 5, Player D scores 5 -- team number = 55
- Difference: 55 - 46 = 9. Team 1 wins 9 points.

**Why this is dramatic:** Unlike adding scores (where 4+6=10 and 5+5=10 would be a tie), the digit method creates large swings. A team with scores of 3 and 7 gets 37, while a team with 4 and 5 gets 45 -- a difference of 8 points despite both teams totaling 10 strokes.

### The Flip Rule

If any player makes a birdie or better, the LOSING team's number gets flipped (higher digit in tens place):
- Team 1: 3 and 5 = 35 (one player birdied!)
- Team 2: 4 and 6 = normally 46, but gets FLIPPED to 64
- Difference: 64 - 35 = 29 points instead of 11

This makes birdies devastatingly valuable and creates huge swings.

### How Handicaps Affect Results

- Standard net scoring with handicap strokes per hole
- Net scores are used to form the two-digit number
- This can create interesting situations where a net score of 2 (net eagle) paired with a 6 creates "26" -- very powerful

### How Money/Bets Are Tracked

- Each point has a dollar value (commonly $0.10-$1.00 per point due to large point swings)
- Track the running point differential between teams
- Settle at the end based on total point difference

**Example ($0.25/point):**
- After 18 holes, Team 1 has a cumulative 87-point advantage
- Team 1 wins: 87 x $0.25 = $21.75 per person

### Common Variations

1. **No flip rule:** Some groups play without the birdie flip to reduce volatility.
2. **Double on par 3s:** Point differential is doubled on par 3 holes.
3. **Triple on par 5s:** Point differential is tripled on par 5 holes.
4. **Rotating partners:** Switch teams every 6 holes.
5. **Vegas with carryover:** Tied holes carry the point differential to the next hole.

### What the Scorecard Should Show

**During the round:**
- Both team numbers for the current hole (prominently displayed)
- Point differential for this hole
- Running cumulative point differential
- Birdie indicator (triggers the flip)
- Running money balance per team

**After the round:**
- Total point differential
- Hole-by-hole team numbers and differentials
- Flip events highlighted
- Settlement amount

---

## 10. Hammer

### How Scoring Works

Hammer is a dynamic betting game where players can "throw the hammer" to double the stakes on any hole, at any time during the hole. The opponent must either accept (catch the hammer) or decline (give up the hole).

**Basic mechanics:**
- Set a base bet per hole (e.g., $2)
- At any point during a hole, one side can "throw the hammer" to double the current stake
- The other side must either:
  - **Catch it:** Accept the doubled bet and continue playing
  - **Drop it:** Concede the hole and pay the current (pre-hammer) amount
- After catching, the catcher can throw the hammer back to re-double

**Example:**
- Hole starts at $2
- Player A throws hammer after a bad tee shot by B: stake becomes $4
- Player B catches it (believes they can recover)
- Player B throws hammer back after A hits into a bunker: stake becomes $8
- Player A catches
- Final stake on the hole: $8

### The Throwing/Catching Rules

**Who can throw:**
- Only the team/player that does NOT currently hold the hammer can throw
- After throwing, you cannot throw again until the other side throws back
- The hammer ownership alternates with each throw

**When you can throw:**
- At any point during the hole (on the tee, fairway, green)
- Must be before the hole is complete
- Some groups restrict: only before your opponent's next shot

**Strategy:**
- Throw when you have an advantage (opponent in trouble)
- Throw as a bluff (intimidation even when you're in trouble)
- Know when to drop -- cutting losses at $2 instead of risking $8

### How Handicaps Affect Results

- Handicap strokes are applied normally
- The game is about situational awareness and risk tolerance, not just scoring
- Net scoring determines the actual hole winner if no one drops

### How Money/Bets Are Tracked

- Track per-hole: base bet, number of hammer throws, final stake, winner
- Running balance per player/team
- Can be played 1v1 or 2v2 (teams)

**Maximum exposure per hole:** Depends on how many times the hammer is thrown. With base $2:
- 0 hammers: $2
- 1 hammer: $4
- 2 hammers: $8
- 3 hammers: $16
- 4 hammers: $32

### Common Variations

1. **Maximum hammer count:** Limit to 2-3 hammers per hole to cap exposure.
2. **Declining hammer starts a press:** Dropping the hammer triggers a side press bet.
3. **Team hammer:** Both partners must agree to throw/catch.
4. **Hammer on putts only:** Can only throw the hammer on the green.
5. **Silent hammer:** No talking -- just raise your hand or tap the app.

### What the Scorecard Should Show

**During the round:**
- LARGE, prominent "Throw Hammer" button (this is the key UX element)
- Current stake for this hole (with visual escalation as stakes increase)
- Hammer history for this hole (who threw, who caught)
- Catch/Drop decision UI when hammer is thrown at you
- Running money balance

**After the round:**
- Hole-by-hole hammer activity log
- Biggest hammer pot of the round
- Win/loss per player
- Hammer throwing statistics (how often thrown, caught, dropped)
- Settlement

---

## 11. Rabbit

### How Scoring Works

Rabbit is a game where players "chase the rabbit." The rabbit is a prize pool that is claimed by winning a hole outright.

**Chase the Rabbit mechanics:**
- The rabbit starts "loose" (unclaimed) at the beginning of the round
- Win a hole outright (sole lowest score) to "catch the rabbit"
- Hold the rabbit until someone else wins a hole outright
- The rabbit changes hands each time someone wins a hole
- At the end of 9 or 18 holes, whoever holds the rabbit wins the pot

**Front 9 rabbit and Back 9 rabbit:** Most commonly played as two separate rabbits:
- Rabbit 1: Holes 1-9. If no one holds the rabbit after hole 9, the pot carries or is split.
- Rabbit 2: Holes 10-18. Same rules for the back 9.

**If the rabbit is never caught (all ties):** The pot is typically split or carried over.

### How Handicaps Affect Results

- Can be played gross or net
- Net is more common: use handicap strokes to determine net scores
- Net scoring determines who wins each hole outright

### How Money/Bets Are Tracked

**Fixed pot method:**
- Each player puts $X into the pot per rabbit (9 holes)
- Example: 4 players, $5 each = $20 pot
- Whoever holds the rabbit at the end of the 9 wins the $20 pot

**Per-hole escalation:**
- The rabbit's value increases each hole it goes unclaimed
- Hole 1: $4, Hole 2: $8, Hole 3: $12, etc.

### Common Variations

1. **Kill the rabbit:** Win TWO consecutive holes to "kill" the rabbit and claim the pot immediately (don't have to wait until hole 9 or 18).
2. **Release the rabbit:** If you hold the rabbit and lose a hole, you "release" the rabbit -- it becomes unclaimed again until someone else wins outright.
3. **Rabbit with carryover:** If the rabbit is unclaimed at hole 9, the pot rolls to the back 9 rabbit.
4. **Multiple rabbits:** Front 9 rabbit, back 9 rabbit, and overall rabbit (three separate pots).
5. **Rabbit legs:** The rabbit has 3 "legs." Win a hole to claim a leg. Claim all 3 legs to win the pot. Losing a hole removes one leg.

### What the Scorecard Should Show

**During the round:**
- Current rabbit holder (or "rabbit loose" if unclaimed)
- Current pot value
- Visual indicator (rabbit icon) on the player holding it
- History of rabbit changes (timeline)
- Number of holes remaining in the current rabbit segment

**After the round:**
- Rabbit winner
- Pot value
- Rabbit journey (how many times it changed hands)
- Settlement

---

## 12. Quota

### How Scoring Works

Quota is a Stableford-based game where each player has a personal target (quota) based on their handicap. The goal is to exceed your quota.

**Point system (same as Stableford):**
| Score vs Par | Points |
|-------------|--------|
| Eagle or better | 4 |
| Birdie | 3 |
| Par | 2 |
| Bogey | 1 |
| Double bogey+ | 0 |

**Quota calculation:**
- Each player's quota = 36 minus their course handicap
- A scratch player (0 handicap) has a quota of 36 (expected to average par = 2 points/hole x 18 = 36)
- A 10-handicap has a quota of 26
- An 18-handicap has a quota of 18
- A 36-handicap has a quota of 0

**Winning:** The player who exceeds their quota by the most points wins. Points above quota = positive. Points below quota = negative.

**Example:**
| Player | Handicap | Quota | Actual Points | Over/Under |
|--------|----------|-------|---------------|------------|
| A      | 5        | 31    | 34            | +3         |
| B      | 15       | 21    | 25            | +4 (wins!) |
| C      | 20       | 16    | 14            | -2         |

Player B wins despite having fewer total points because they beat their quota by the most.

### How Handicaps Affect Results

Quota inherently accounts for handicaps through the quota number itself:
- Uses GROSS scores (not net) because the handicap is built into the quota target
- This is one of the few games where you DON'T apply stroke-by-stroke handicap adjustment
- The quota IS the handicap adjustment

**Why this works:** A 36-handicap player's quota is 0. They just need to score ANY points to beat quota. Meanwhile, a scratch player must score 37+ points to beat their quota.

### How Money/Bets Are Tracked

1. **Per-point over/under:** Each point above or below quota is worth $X.
   - Player B (+4) at $5/point = wins $20 from the pot
   - Player C (-2) at $5/point = loses $10 to the pot

2. **Pool/pot:** Everyone puts in $X. Player who exceeds their quota by the most wins the pool.

3. **Point differential between players:** Each pair settles based on the difference in their over/under numbers.

### Common Variations

1. **Modified quota:** Use modified Stableford points (negative points for bogey+). Makes the game harder.
2. **Team quota:** Teams combine their over/under totals.
3. **Adjustable quota:** Quota adjusts round-to-round based on recent performance.
4. **Banker:** One player "banks" against the field. If the banker exceeds their quota, all other players pay. If not, the banker pays everyone.

### What the Scorecard Should Show

**During the round:**
- Player's current points vs. their quota (e.g., "22/26 quota")
- Points earned this hole
- Over/under quota status with clear +/- indicator
- Projection: "On pace to finish +3 over quota"
- Leaderboard ranked by over/under quota (not raw points)

**After the round:**
- Final points vs. quota for each player
- Over/under ranking
- Money settlement
- "Best against quota" award

---

## 13. House Games

### How a "House Game" Typically Works at Golf Clubs

A house game is a custom format that a regular group plays consistently. It is typically a combination of multiple standard formats with their own twist rules.

**Common house game patterns:**

1. **The Full Monty:** Nassau + Skins + Side Bets all running simultaneously
   - $5 Nassau (front/back/overall)
   - $2 skins with carryover
   - $2 greenies, $2 sandies
   - Auto-press when 2 down

2. **Saturday Morning Game:** Wolf + prop bets
   - $1/point Wolf
   - CTP on all par 3s ($5)
   - Snake ($5, doubles each time)

3. **Thursday League:** Stableford with team component
   - Individual Stableford points
   - Best 2 of 4 team score
   - Running season standings

**Key characteristics of house games:**
- Rules are passed down orally and "everyone knows" them
- Specific to the group -- often named after the club or a player
- May include obscure rules no other group uses
- Settlement is typically netted at the end
- Often have a "league" or season component with running standings

### Custom Rules That Groups Add

- "No blood on the first tee" (can't lose money on hole 1)
- "Breakfast ball" (free mulligan on hole 1 tee shot)
- "Pick up at triple" (can't score worse than triple bogey)
- "Inside the leather" (putts within putter length are conceded)
- "Wolf must declare before third player hits" (timing constraint)
- "Skins only on back 9" (front 9 is just stroke play)
- "Press requires 2 witnesses" (social enforcement)
- "Rain-out rule: settle at pro-rated rate"
- "Max loss cap: $50" (nobody can lose more than $50 in one round)
- "Carryover jackpot on 18" (all unclaimed skins decided on 18th hole)

---

## 14. Scorecard App Best Practices

### What Makes a Great Golf Scorecard App

Based on analysis of successful golf apps and player feedback:

**Essential at-a-glance information:**
1. **Current hole number and par** (large, prominent)
2. **Score entry** (one-tap, large targets for quick input)
3. **Running totals** (strokes, relative to par)
4. **Game status** (who's winning, by how much)
5. **Money** (running balance, live updates)
6. **Next hole preview** (yardage, par, handicap)

**The hierarchy of information during a round:**
1. MOST IMPORTANT: Score entry (this is what you do every hole)
2. IMPORTANT: Current game status (am I winning or losing?)
3. USEFUL: Money tracker (how much am I up/down?)
4. CONTEXT: Hole info (yardage, par, stroke index)
5. REFERENCE: Full scorecard (scroll to review)

**UX principles for golf apps:**
- **One-handed operation:** Players hold their phone in one hand. All critical controls must be thumb-reachable.
- **Glanceable:** Information must be readable in bright sunlight at arm's length.
- **Fast entry:** Score entry should take under 3 seconds per player.
- **Minimal scrolling:** The most important info should be visible without scrolling.
- **Offline-first:** Golf courses often have poor cell coverage. Everything must work offline.
- **Battery efficient:** A round takes 4+ hours. The app cannot drain the battery.
- **Dark/light themes:** Bright sunlight requires high contrast. Dusk/dawn needs dark mode.
- **Haptic feedback:** Confirm score entries and game events with haptics.
- **Sound optional:** Some courses prohibit phone sounds.

**Live game context (the killer feature):**
The best golf apps don't just record scores -- they tell you what the score MEANS right now:
- "You need to birdie to win the front 9"
- "3 skins carrying -- this hole is worth $60"
- "You're 2 down -- press available"
- "Snake alert: avoid the 3-putt!"
- "Wolf decision: Player B hit a great tee shot"

**Settlement UX:**
- Show who owes whom (net settlements)
- One-tap payment integration (Venmo, Cash App, Apple Pay)
- Share results via text/image
- Save round for historical tracking

---

## 15. Competitive App Analysis

### 18Birdies
- **Strengths:** GPS rangefinder, social features, swing analysis
- **Scoring:** Basic stroke play, Stableford support
- **Games:** Limited -- no Nassau, skins, or custom games
- **Custom formats:** None. Strictly traditional scoring.
- **Gap:** No betting game support at all. Players must track bets separately.

### The Grint
- **Strengths:** USGA handicap tracking, tournament management, large user base
- **Scoring:** Comprehensive stroke play, match play, Stableford
- **Games:** Some basic game formats (Nassau, skins) added in recent updates
- **Custom formats:** Limited -- predefined formats only
- **Gap:** Game tracking feels bolted on rather than core. No live money tracking.

### Golf Genius
- **Strengths:** Tournament management (the gold standard for clubs/leagues)
- **Scoring:** Every format imaginable for tournament play
- **Games:** Designed for organized tournaments, not casual betting games
- **Custom formats:** Extremely flexible for tournament formats
- **Gap:** Not designed for casual group play. No peer-to-peer money tracking.

### Arccos
- **Strengths:** Shot tracking (sensors on clubs), AI caddie, strokes gained analysis
- **Scoring:** Auto-tracked via sensors
- **Games:** No game/betting support
- **Custom formats:** None
- **Gap:** Pure analytics play. No social/competitive features.

### What None of Them Do Well

1. **Live money tracking across multiple simultaneous games** -- Nobody shows "you're up $23 overall" combining Nassau + skins + side bets
2. **House game builder** -- No app lets you create custom rule sets combining multiple formats
3. **AI-generated game suggestions** -- No app suggests formats based on player count, skill mix, or group preferences
4. **Real-time game context** -- No app tells you what the current score means in terms of each active game
5. **Voice scoring with game awareness** -- No app lets you say "birdie" and automatically updates all game calculations
6. **Settlement integration** -- No app handles the end-of-round "who owes whom" calculation across all games
7. **Press management UI** -- No app has a good interface for tracking Nassau presses
8. **Wolf partner selection** -- No app has a clean UI for the Wolf's mid-hole partner decision

### The Opportunity for MATCH Golf

MATCH Golf can own the "game layer" that sits on top of scoring. The key differentiators:
- Run multiple games simultaneously with unified settlement
- AI-powered house game builder (describe your game in natural language)
- Real-time context engine ("this hole is worth $45 with 3 skin carryovers")
- Voice scoring that understands game implications
- One-tap prop bets during the round
- Clean Wolf/Hammer/Vegas UIs that no competitor has attempted
- Social settlement with payment app integration

---

## 16. Implementation Status in MATCH Golf

### Fully Implemented (with tests)
| Game | Engine File | Tests | Notes |
|------|------------|-------|-------|
| Skins | `skins.ts` | 24 | Carryover, no-carryover, net skins via strokesPerHole |
| Nassau | `nassau.ts` | 27 | Front/back/overall, auto-press, manual press, 9-hole support |
| Wolf | `wolf.ts` | 55 | Full rotation, lone wolf, blind wolf, 2v2, pushes carry |
| Stableford | `stableford.ts` | 42 | Standard and modified point systems, net scoring |
| Best Ball | `bestball.ts` | 30 | 2v2, 3-player, match play variant, net scoring |
| Match Play | `matchPlay.ts` | 31 | 2-player, net scoring, dormie, win detection |
| Settlement | `settlement.ts` | 18 | Cross-game aggregation, prop bet inclusion, net-out |
| Money Tracker | `moneyTracker.ts` | - | Live per-hole money calculation across all games |

### Partially Implemented (UI exists, scoring stubbed)
| Game | Status | What Exists |
|------|--------|-------------|
| Bingo Bango Bongo | UI complete | BingoBangoSheet.tsx with player selection for each point; house game primitive defined |
| Prop Bets | Full types + UI | 12 bet types defined (CTP, greenie, sandie, barkie, etc.), settlement integrated |

### Not Yet Implemented (defined in primitives only)
| Game | Primitive ID | Notes |
|------|-------------|-------|
| Vegas | `format_vegas` | Needs digit combination engine, flip rule |
| Hammer | `format_hammer` | Needs throw/catch state machine, real-time UI |
| Rabbit | `format_rabbit` | Needs holder tracking, catch/release/kill logic |
| Quota | `format_quota` | Needs quota calculator (36 - handicap), over/under tracking |
| Defender | `format_defender` | Needs role rotation engine |
| Sixes | `group_sixes` | Needs 6-hole match rotation with partner changes |

### House Game Engine (operational)
- `src/lib/houseGame/engine.ts` -- Maps primitives to scoring config
- `src/lib/houseGame/primitives.ts` -- 50+ primitives across 8 categories
- `src/types/houseGame.ts` -- Full type system for custom formats
- `src/engine/HouseGameEngine.ts` -- Runtime engine
- `src/pages/HouseGameBuilder.tsx` -- AI-powered builder UI

### Architecture Notes for New Game Implementation

All game engines follow the same pattern established in the codebase:
1. **Pure functions** in `src/lib/games/` -- no side effects, deterministic
2. **Types** defined in `src/types/golf.ts` or `src/types/betting.ts`
3. **Net scoring** via `StrokesPerHoleMap` parameter (optional, passed when handicaps active)
4. **Tests** co-located as `feature.test.ts`
5. **Integration** via `moneyTracker.ts` (live money) and `settlement.ts` (final payout)
6. **UI** in `src/components/golf/` with game-specific sheets/modals
7. **House game primitives** registered in `src/lib/houseGame/primitives.ts` with `implemented: true/false` flag

Games that need to be built next (Vegas, Hammer, Rabbit, Quota) should follow this exact pattern for consistency.
