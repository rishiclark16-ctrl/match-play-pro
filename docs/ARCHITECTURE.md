# MATCH Golf - Architecture

## Overview

MATCH Golf is a mobile-first React application for golf scoring with real-time multiplayer support. The app follows a component-based architecture with custom hooks for business logic and Supabase for backend services.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Pages     │  │  Components  │  │    Hooks     │          │
│  │ (Scorecard,  │  │ (PlayerCard, │  │(useSupabase  │          │
│  │  Home, etc)  │  │  GamesSection│  │ Round, etc)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│           │                │                 │                  │
│           └────────────────┼─────────────────┘                  │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │                    Game Logic (src/lib/games/)             │ │
│  │  nassau.ts │ skins.ts │ matchPlay.ts │ wolf.ts │ etc      │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Supabase Client
                              │
┌─────────────────────────────▼─────────────────────────────────────┐
│                         Supabase                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   PostgreSQL │  │  Real-time   │  │     Auth     │            │
│  │   Database   │  │ Subscriptions│  │              │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Score Entry Flow

```
User Action (tap/voice)
        │
        ▼
┌───────────────────┐
│  Scorecard.tsx    │  ← Main orchestrator
└───────┬───────────┘
        │
        ▼
┌───────────────────┐     ┌─────────────────────┐
│ useVoiceScoring   │────▶│   voiceParser.ts    │
│      hook         │     │ (transcript → score)│
└───────┬───────────┘     └─────────────────────┘
        │
        ▼
┌───────────────────┐
│ useSupabaseRound  │  ← Optimistic update + Supabase write
└───────┬───────────┘
        │
        ├──────────────────────┐
        ▼                      ▼
┌───────────────────┐  ┌───────────────────┐
│  Local State      │  │    Supabase       │
│  (immediate UI)   │  │  (persistence)    │
└───────────────────┘  └─────────┬─────────┘
                                 │
                                 ▼
                       ┌───────────────────┐
                       │  Real-time Sync   │
                       │  (other devices)  │
                       └───────────────────┘
```

### Game Calculation Flow

```
Score Update
     │
     ▼
┌────────────────────────────────────────────┐
│            Scorecard.tsx useMemo           │
│  (playersWithScores, settlementsPreview)   │
└────────────────────┬───────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     ▼               ▼               ▼
┌─────────┐   ┌─────────────┐   ┌─────────┐
│ Nassau  │   │  Match Play │   │  Skins  │
│ calc    │   │    calc     │   │  calc   │
└────┬────┘   └──────┬──────┘   └────┬────┘
     │               │               │
     └───────────────┼───────────────┘
                     ▼
              ┌─────────────┐
              │ Settlement  │
              │ Calculator  │
              └─────────────┘
```

## Key Components

### Pages

| Page | Purpose |
|------|---------|
| `Scorecard.tsx` | Main scoring interface, ~795 lines |
| `Home.tsx` | Round list, active rounds, friends |
| `NewRound.tsx` | Course selection, player setup |
| `RoundComplete.tsx` | Final results, settlement display |

### Hooks

| Hook | Responsibility |
|------|----------------|
| `useSupabaseRound` | Real-time round sync, CRUD operations |
| `useVoiceScoring` | Web Speech API integration, parsing |
| `usePlayoff` | Playoff mode state management |
| `useAutoAdvance` | Auto-advance to next hole |
| `useOfflineSync` | Offline queue management |
| `useScorekeeper` | Permission management |

### Game Calculators (`src/lib/games/`)

Each game type has a dedicated calculator module:

| Module | Game Type | Key Functions |
|--------|-----------|---------------|
| `nassau.ts` | Nassau | `calculateNassau`, `checkAutoPress` |
| `skins.ts` | Skins | `calculateSkins`, `getSkinsHoleResult` |
| `matchPlay.ts` | Match Play | `calculateMatchPlay` |
| `wolf.ts` | Wolf | `calculateWolf`, `getWolfForHole` |
| `stableford.ts` | Stableford | `calculateStableford`, `getStablefordPoints` |
| `bestball.ts` | Best Ball | `calculateBestBall`, `calculateBestBallMatch` |
| `settlement.ts` | Settlements | `calculateSettlement` |

## Real-time Architecture

### Supabase Subscriptions

```typescript
// useSupabaseRound.ts subscribes to changes:
supabase
  .channel(`round:${roundId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, handleScoreChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, handlePlayerChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds' }, handleRoundChange)
  .subscribe();
```

### Optimistic Updates

1. Update local state immediately for responsive UI
2. Write to Supabase in background
3. Real-time subscription confirms/corrects state
4. Rollback on error with toast notification

## Voice Scoring Pipeline

```
Microphone Input
      │
      ▼
┌─────────────────┐
│ Web Speech API  │  ← Browser native speech recognition
└────────┬────────┘
         │ transcript
         ▼
┌─────────────────┐
│  voiceParser.ts │
│                 │
│ ┌─────────────┐ │
│ │ normalizeText│ │  ← Clean punctuation, lowercase
│ └──────┬──────┘ │
│        ▼        │
│ ┌─────────────┐ │
│ │findPlayerMatch│ │  ← Fuzzy matching, nicknames
│ └──────┬──────┘ │
│        ▼        │
│ ┌─────────────┐ │
│ │ extractScore │ │  ← Numbers, golf terms, mishearings
│ └──────┬──────┘ │
│        ▼        │
│ ┌─────────────┐ │
│ │ confidence  │ │  ← High/Medium/Low rating
│ └─────────────┘ │
└────────┬────────┘
         │ ParseResult
         ▼
┌─────────────────┐
│ Confirmation    │  ← User verifies before saving
│     Modal       │
└─────────────────┘
```

### Voice Parser Features

- **Fuzzy Name Matching**: Levenshtein distance < 2
- **Nickname Support**: "Mike" → "Michael", "Bobby" → "Bob"
- **Phonetic Variations**: "my call" → "Michael"
- **Golf Terms**: "birdie" → par - 1, "bogey" → par + 1
- **Mishearings**: "tree" → 3, "fore" → 4, "ate" → 8
- **All Patterns**: "all fours", "everybody got 5"

## Handicap System

### Course Handicap Calculation

```typescript
// Auto mode: Calculate from handicap index
playingHandicap = handicapIndex * (slope / 113) * (holes / 18);
```

### Match Play Differential

For 2-player matches, strokes are allocated based on the difference:

```typescript
// If Alice has 10 handicap, Bob has 6:
// Differential = 10 - 6 = 4 strokes
// Alice receives strokes on holes with handicap 1-4
```

### Stroke Allocation

Strokes are allocated to holes based on hole handicap rating (1 = hardest):

```typescript
strokesPerHole = getStrokesPerHole(playingHandicap, holeInfo);
// Returns Map<holeNumber, strokesReceived>
```

## Offline Support

```
┌───────────────┐
│ User Action   │
└───────┬───────┘
        │
        ▼
┌───────────────────────┐
│ Check Network Status  │
└───────┬───────────────┘
        │
   ┌────┴────┐
   │         │
Online    Offline
   │         │
   ▼         ▼
┌───────┐  ┌────────────┐
│Supabase│  │Offline Queue│
│ Write │  │(localStorage)│
└───────┘  └──────┬─────┘
                  │
                  ▼ (on reconnect)
           ┌─────────────┐
           │  Sync Queue │
           │ to Supabase │
           └─────────────┘
```

## Error Handling Strategy

### Async Operations

All Supabase operations return `{ success: boolean; error?: string }`:

```typescript
const result = await saveScore(playerId, hole, score);
if (!result.success) {
  toast.error('Failed to save score');
  captureException(error, { context: 'saveScore' });
}
```

### Input Validation

Zod schemas in `src/lib/validation.ts`:

```typescript
const playerNameSchema = z.string().min(1).max(50).transform(sanitizeString);
const joinCodeSchema = z.string().length(6).regex(/^[A-HJ-NP-Z2-9]+$/);
const scoreSchema = z.number().min(1).max(20);
```

## Testing Strategy

### Unit Tests

- Game calculators: 100% coverage
- Voice parser: Fuzzy matching, edge cases
- Validation: Schema boundaries

### Test Location

Tests are co-located with source files:
```
src/lib/games/
├── nassau.ts
├── nassau.test.ts
├── skins.ts
├── skins.test.ts
└── ...
```

### Running Tests

```bash
npm test                           # Run all
npm test -- --coverage             # With coverage
npm test -- src/lib/games/nassau   # Specific file
```

## Database Schema (Supabase)

### Key Tables

```sql
-- rounds: Round metadata
CREATE TABLE rounds (
  id UUID PRIMARY KEY,
  course_name TEXT,
  join_code TEXT UNIQUE,
  holes INTEGER, -- 9 or 18
  status TEXT, -- 'active' or 'complete'
  games JSONB, -- Game configurations
  ...
);

-- players: Players in a round
CREATE TABLE players (
  id UUID PRIMARY KEY,
  round_id UUID REFERENCES rounds,
  name TEXT,
  handicap NUMERIC,
  profile_id UUID REFERENCES profiles,
  ...
);

-- scores: Individual hole scores
CREATE TABLE scores (
  id UUID PRIMARY KEY,
  round_id UUID REFERENCES rounds,
  player_id UUID REFERENCES players,
  hole_number INTEGER,
  strokes INTEGER,
  ...
);
```

## Performance Considerations

### Memoization

Heavy calculations are memoized with `useMemo`:
- `playersWithScores` - Player data with calculated handicaps
- `settlementsPreview` - Settlement calculations
- `completedHoles` - Hole completion tracking

### Lazy Loading

Routes are code-split for faster initial load:
```typescript
const Scorecard = lazy(() => import('./pages/Scorecard'));
```

### Real-time Efficiency

- Subscribe only to relevant tables
- Debounce rapid updates
- Unsubscribe on component unmount
