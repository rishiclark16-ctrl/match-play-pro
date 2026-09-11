# MATCH Golf - Glossary & Golf Terms

---

## Golf Scoring Terms

| Term | Definition | App Usage |
|------|-----------|-----------|
| **Ace** | Hole-in-one (1 stroke) | Score type, celebration animation |
| **Albatross** | 3 under par on a hole | Score type, green highlight |
| **Eagle** | 2 under par on a hole | Score type, green highlight |
| **Birdie** | 1 under par on a hole | Score type, green highlight |
| **Par** | Expected number of strokes for a hole | Score type, default highlight |
| **Bogey** | 1 over par on a hole | Score type, amber highlight |
| **Double Bogey** | 2 over par on a hole | Score type, red highlight |
| **Triple Bogey** | 3 over par on a hole | Score type, red highlight |
| **Stroke Play** | Lowest total strokes wins | Game format option |
| **Match Play** | Most holes won wins | Game format option |

---

## Handicap Terms

| Term | Definition | App Usage |
|------|-----------|-----------|
| **Handicap Index** | Measure of a golfer's potential ability | Stored in profile, used for calculations |
| **Slope Rating** | Course difficulty relative to a bogey golfer (55-155) | Course data, handicap calculation |
| **Course Rating** | Expected score for a scratch golfer | Course data, handicap calculation |
| **Playing Handicap** | Adjusted handicap for a specific course | Calculated per round |
| **Strokes Received** | Number of free strokes a player gets | Distributed by hole handicap index |
| **Net Score** | Gross score minus handicap strokes | Used in net betting games |
| **Gross Score** | Actual strokes taken | Raw scoring |
| **Scratch Golfer** | Golfer with 0 handicap | Reference point |

---

## Betting Game Terms

| Term | Definition | App Usage |
|------|-----------|-----------|
| **Nassau** | Three separate bets: front 9, back 9, overall 18 | Primary betting game |
| **Skins** | Each hole is a separate bet; lowest score wins | Game type |
| **Carryover** | When a hole ties in skins, pot carries to next hole | Skins configuration |
| **Press** | New bet started during Nassau when a player falls behind | Auto-press feature |
| **Auto-Press** | Automatic press when 2 holes down | Nassau configuration |
| **Wolf** | Rotating game where one player picks a partner each hole | Game type |
| **Blind Wolf** | Wolf declares alone before anyone tees off (3x multiplier) | Wolf option |
| **Lone Wolf** | Wolf chooses to play alone against the field (2x multiplier) | Wolf option |
| **Stableford** | Points-based scoring system | Game type |
| **Best Ball** | Team format; best score on each team counts | Game type |
| **Settlement** | Final calculation of who owes whom | End-of-round feature |
| **Stakes** | Dollar amount per bet/point/skin | Game configuration |
| **Unit** | Base monetary amount in house games | House game settlement |

---

## Prop Bet Terms

| Term | Definition | App Usage |
|------|-----------|-----------|
| **CTP** | Closest to Pin -- tee shot nearest the hole on par 3s | Prop bet type |
| **Greenie** | Hit the green on a par 3, be closest, and 1-putt | Prop bet type |
| **Sandie** | Up and down (save par) from a bunker | Prop bet type |
| **Barkie** | Hit a tree and still make par or better | Prop bet type |
| **Oozle** | Miss the green on a par 3 but still make par | Prop bet type |
| **Chippy** | Chip in from off the green for par or better | Prop bet type |
| **Polie** | 3-putt or worse but still make par | Prop bet type |
| **Arnie** | Make par or better after hitting a tree (named for Arnold Palmer) | Prop bet type |
| **Ferret** | Hole out from off the green (chip-in, bunker shot, etc.) | Prop bet type |
| **Snake** | 3-putt penalty; loser pays everyone | Negative prop bet |
| **Junk** | Collective term for side bets (sandies, barkies, etc.) | Category label |

---

## House Game Terms

| Term | Definition | App Usage |
|------|-----------|-----------|
| **Primitive** | A single configurable rule in a house game | Building block of custom games |
| **Breakfast Ball** | Free re-do of first tee shot | Casual rule primitive |
| **Mulligan** | Free re-do of any shot | Casual rule primitive |
| **Gimme** | Short putt automatically counted as made | Casual rule primitive |
| **No Blood** | First hole of a segment doesn't count for bets | Settlement rule |
| **Preferred Lies** | Player can improve ball position (lift-clean-place) | Casual rule |
| **Foot Wedge** | Kick the ball to a better position (joke rule) | Casual rule |
| **Dormie** | Match play: leading by same number of holes remaining | Match play term |
| **Concede** | Give opponent a putt or hole without playing it out | Match play rule |
| **Ghost Player** | Virtual player receiving net-par scores | Player type |
| **Mixed Tees** | Different players playing from different tee sets | Course configuration |

---

## Additional Game Type Terms

| Term | Definition | App Usage |
|------|-----------|-----------|
| **Vegas** | Team game using combined two-digit scores (e.g., 4+5=45) | Game type |
| **Rabbit** | Possession game; win a hole to "grab the rabbit" | Game type |
| **Quota** | Target score based on handicap (36 - handicap) | Game type |
| **Hammer** | Any player can "hammer" to double stakes on a hole | House game scoring format |
| **Bingo Bango Bongo** | Three points per hole: first on green, closest when all on, first to hole out | House game sub-format |
| **Sixes** (Round Robin) | Teams rotate every 6 holes | House game group rule |
| **Defender** | Defending champion format | House game scoring format |

---

## App-Specific Terms

| Term | Definition |
|------|-----------|
| **Join Code** | 6-character alphanumeric code to join a round (e.g., "ABC123") |
| **Scorekeeper** | Player authorized to enter scores for all players in a round |
| **Spectator** | Read-only viewer of a round |
| **Round Dashboard** | Tabbed view showing scorecard, games, money, stats, highlights |
| **Money Tracker** | Live display of each player's running balance |
| **Feature Gate** | UI component that locks Pro features for free users |
| **Pro** | Paid subscription tier with full feature access |
| **Voice Scoring** | Natural language score entry via microphone |
| **Hands-Free Mode** | Continuous voice scoring without pressing a button |
| **Deep Link** | URL that opens directly to a specific screen in the app |
| **Push Notification** | Native iOS notification for round invites, score updates |
| **Offline Queue** | IndexedDB storage for scores entered without internet |
| **Optimistic Update** | UI updates immediately before server confirmation |
| **Real-Time Sync** | Supabase WebSocket subscriptions for live score updates |
| **Group Ledger** | Persistent money tracking across multiple rounds within a group |
| **Season Leaderboard** | Cross-round cumulative money leaderboard |
| **Personal Game Format** | User's saved custom game configuration |
| **House Game** | Group's custom game configuration |
