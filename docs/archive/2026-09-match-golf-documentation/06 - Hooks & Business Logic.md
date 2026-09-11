# MATCH Golf - Hooks & Business Logic Reference

---

## Overview

MATCH Golf uses **55+ custom React hooks** to encapsulate all domain logic. Hooks are the primary pattern for managing state, data fetching, and business rules. All hooks follow the convention of being prefixed with `use` and are located in `src/hooks/`.

---

## 1. AUTHENTICATION & USER

| Hook | File | Purpose |
|------|------|---------|
| `useProfile` | `useProfile.ts` | Fetch/update current user's profile (name, handicap, avatar, onboarding status) |
| `useSettings` | `useSettings.ts` | User preferences and app settings management |
| `useLocalStorage` | `useLocalStorage.ts` | Generic localStorage read/write with type safety |

---

## 2. ROUND LIFECYCLE

| Hook | File | Purpose |
|------|------|---------|
| `useCreateSupabaseRound` | `useCreateSupabaseRound.ts` | Full round creation flow: inserts round, players, games, ghost scores; delete-on-failure cleanup for atomicity |
| `useRounds` | `useRounds.ts` | Fetch user's rounds list |
| `useRoundsQuery` | `useRoundsQuery.ts` | React Query wrapper for rounds with filtering/pagination |
| `useRoundData` | `useRoundData.ts` | Fetch complete round data (round + players + scores + games) |
| `useSupabaseRound` | `useSupabaseRound.ts` | Real-time round subscription (Postgres changes on scores, players, rounds) |
| `useDeleteRound` | `useDeleteRound.ts` | Delete a round with confirmation |
| `useJoinRound` | `useJoinRound.ts` | Join a round via join code |

---

## 3. SCORING

| Hook | File | Purpose |
|------|------|---------|
| `usePlayersWithScores` | `usePlayersWithScores.ts` | Merge player data with scores, calculate totals, net scores, handicap strokes |
| `useAutoAdvance` | `useAutoAdvance.ts` | Auto-advance to next hole after 20 seconds of inactivity |
| `useScorekeeper` | `useScorekeeper.ts` | Scorekeeper permission checking and management |

---

## 4. VOICE SCORING

| Hook | File | Purpose | Tests |
|------|------|---------|-------|
| `useVoiceRecognition` | `useVoiceRecognition.ts` | Web Speech API integration, start/stop recording |  |
| `useVoiceScoring` | `useVoiceScoring.ts` | Orchestrates voice input -> parsing -> confirmation -> score entry | Yes (co-located) |
| `useHandsFreeVoice` | `useHandsFreeVoice.ts` | Continuous hands-free voice mode without button presses |  |
| `useVoiceNicknames` | `useVoiceNicknames.ts` | Manage player nicknames for voice recognition |  |

---

## 5. GAME RESULTS & SETTLEMENTS

| Hook | File | Purpose |
|------|------|---------|
| `useGameResults` | `useGameResults.ts` | Calculate results for all active games in a round |
| `useSettlementPreview` | `useSettlementPreview.ts` | Preview settlement amounts before finalizing |
| `useSettlementTracking` | `useSettlementTracking.ts` | Track paid/pending/forgiven settlement status |
| `useHouseGame` | `useHouseGame.ts` | House game format management and scoring |

---

## 6. ROUND ANALYTICS

| Hook | File | Purpose |
|------|------|---------|
| `useRoundStats` | `useRoundStats.ts` | Calculate in-round statistics (GIR, putts, scoring average, etc.) |
| `useRoundHighlights` | `useRoundHighlights.ts` | Detect notable moments (eagles, aces, streaks) |
| `useHeadToHead` | `useHeadToHead.ts` | Calculate head-to-head record between two players |

---

## 7. PROP BETS

| Hook | File | Purpose |
|------|------|---------|
| `usePropBets` | `usePropBets.ts` | CRUD operations for prop bets, winner assignment |

---

## 8. SOCIAL

| Hook | File | Purpose | Tests |
|------|------|---------|-------|
| `useFriends` | `useFriends.ts` | Friend list, requests, add/remove/accept | Yes |
| `useFriendActivity` | `useFriendActivity.ts` | Friend activity feed data |  |
| `useSocialFeed` | `useSocialFeed.ts` | Social feed posts and interactions |  |
| `useRoundComments` | `useRoundComments.ts` | Comments on rounds |  |
| `useRoundReactions` | `useRoundReactions.ts` | Emoji reactions on rounds |  |
| `useRoundChat` | `useRoundChat.ts` | In-round real-time chat messaging |  |
| `useUpcomingRounds` | `useUpcomingRounds.ts` | Upcoming/planned rounds feed |  |
| `useRoundDetailForSheet` | `useRoundDetailForSheet.ts` | Fetch round detail data for bottom sheet display |  |
| `useSeasonLeaderboard` | `useSeasonLeaderboard.ts` | Season-long money leaderboard calculations |  |

---

## 9. GROUPS

| Hook | File | Purpose | Tests |
|------|------|---------|-------|
| `useGroups` | `useGroups.ts` | Group CRUD, membership management | Yes |
| `useGroupFormats` | `useGroupFormats.ts` | Group house game format management |  |
| `useGroupLedger` | `useGroupLedger.ts` | Cross-round money ledger for groups |  |
| `useRoundLedgerSync` | `useRoundLedgerSync.ts` | Sync round settlements to group ledger |  |

---

## 10. SUBSCRIPTION

| Hook | File | Purpose | Tests |
|------|------|---------|-------|
| `useSubscription` | `useSubscription.ts` | Subscription status, feature limits, Pro checks | Yes |

### Feature Limit Functions
- `canUseGame(game: GameType): boolean`
- `canUsePropBet(type: PropBetType): boolean`
- `canUseSkinsCarryover(): boolean`
- `canAddPlayer(currentCount: number): boolean`
- `canAddFriend(currentCount: number): boolean`
- `canAddGroup(currentCount: number): boolean`
- `limits.hasFullStats: boolean`
- `limits.hasSettlementTracking: boolean`
- `limits.hasRoundExport: boolean`

---

## 11. PERSONAL GAME FORMATS

| Hook | File | Purpose |
|------|------|---------|
| `usePersonalGameFormats` | `usePersonalGameFormats.ts` | CRUD for user's saved game formats |

---

## 12. COURSE DATA

| Hook | File | Purpose |
|------|------|---------|
| `useCourses` | `useCourses.ts` | Course data fetching and caching |
| `useGolfCourseSearch` | `useGolfCourseSearch.ts` | Course search with debouncing |

---

## 13. CONTACTS & DEVICE

| Hook | File | Purpose |
|------|------|---------|
| `useContacts` | `useContacts.ts` | Native contacts access via Capacitor |
| `useKeepAwake` | `useKeepAwake.ts` | Prevent screen sleep during active rounds |
| `useDeepLinks` | `useDeepLinks.ts` | Handle deep links from native app |
| `usePushNotifications` | `usePushNotifications.ts` | Register for and handle push notifications |

---

## 14. SHARING

| Hook | File | Purpose |
|------|------|---------|
| `useRoundSharing` | `useRoundSharing.ts` | Generate and share round result images |

---

## 15. SPECTATOR

| Hook | File | Purpose |
|------|------|---------|
| `useSpectatorRounds` | `useSpectatorRounds.ts` | Fetch rounds user is spectating |

---

## 16. OFFLINE

| Hook | File | Purpose |
|------|------|---------|
| `useOfflineSync` | `useOfflineSync.ts` | Manage offline score queue and sync on reconnect |

---

## 17. UTILITY

| Hook | File | Purpose |
|------|------|---------|
| `use-toast` | `use-toast.ts` | Toast notification hook (from shadcn/ui) |
| `usePlayoff` | `usePlayoff.ts` | Playoff scoring and winner determination |

---

## Pure Function Libraries (No Hooks)

These are used BY hooks but are not hooks themselves:

| Module | File | Purpose | Tests |
|--------|------|---------|-------|
| Nassau calculator | `lib/games/nassau.ts` | Nassau game logic | 27 |
| Skins calculator | `lib/games/skins.ts` | Skins game logic | 24 |
| Match Play calculator | `lib/games/matchPlay.ts` | Match play logic | 31 |
| Wolf calculator | `lib/games/wolf.ts` | Wolf game logic | 55 |
| Stableford calculator | `lib/games/stableford.ts` | Stableford scoring | 42 |
| Best Ball calculator | `lib/games/bestball.ts` | Best ball logic | 30 |
| Settlement calculator | `lib/games/settlement.ts` | Settlement aggregation | 18 |
| Money tracker | `lib/games/moneyTracker.ts` | Live money calculations | Yes |
| Vegas calculator | `lib/games/vegas.ts` | Vegas game logic | Yes |
| Rabbit calculator | `lib/games/rabbit.ts` | Rabbit game logic | Yes |
| Quota calculator | `lib/games/quota.ts` | Quota game logic | Yes |
| Voice parser | `lib/voiceParser.ts` | NLP voice-to-score | 114 |
| Voice commands | `lib/voiceCommands.ts` | Voice command recognition | Yes |
| Voice feedback | `lib/voiceFeedback.ts` | Voice response generation | Yes |
| Phonetic matcher | `lib/phoneticMatch.ts` | Phonetic name matching | Yes |
| Handicap utils | `lib/handicapUtils.ts` | Handicap calculations | -- |
| Offline DB | `lib/offlineDb.ts` | IndexedDB operations | Yes |
| Stat calculations | `lib/statCalculations.ts` | Statistical computations | Yes |
| Validation | `lib/validation.ts` | Zod schemas | -- |
| Rate limiter | `lib/rateLimiter.ts` | Auth rate limiting | -- |
| Round summary | `lib/roundSummary.ts` | Round summary generation | -- |
| Share results | `lib/shareResults.ts` | Canvas image generation for sharing | -- |
| House game engine | `lib/houseGame/engine.ts` | House game scoring engine | Yes |
| House game parser | `lib/houseGame/parseDescription.ts` | Natural language game parser | -- |
| House game primitives | `lib/houseGame/primitives.ts` | Primitive rule definitions | Yes |
