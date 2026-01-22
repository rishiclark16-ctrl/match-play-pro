# MATCH Golf

A mobile-first golf scoring app with real-time multiplayer support, betting games, and voice scoring.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Mobile**: Capacitor 6.2 (iOS/Android)
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for backend)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

### Environment Variables

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Development

```bash
# Run dev server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Type check
npm run typecheck
```

## Mobile Development

```bash
# Build and sync to iOS
npm run build && npx cap sync ios

# Build and sync to Android
npm run build && npx cap sync android

# Open in Xcode
npx cap open ios

# Open in Android Studio
npx cap open android
```

## Project Structure

```
src/
├── components/
│   ├── golf/           # Golf-specific components
│   │   ├── PlayerCard.tsx
│   │   ├── HoleNavigator.tsx
│   │   ├── GamesSection.tsx
│   │   ├── MoneyTracker.tsx
│   │   └── ...
│   └── ui/             # shadcn/ui components
├── hooks/
│   ├── useSupabaseRound.ts   # Real-time round sync
│   ├── useVoiceScoring.ts    # Voice input handling
│   ├── usePlayoff.ts         # Playoff mode logic
│   └── ...
├── lib/
│   ├── games/          # Game calculation logic
│   │   ├── nassau.ts
│   │   ├── skins.ts
│   │   ├── matchPlay.ts
│   │   ├── wolf.ts
│   │   ├── stableford.ts
│   │   └── bestball.ts
│   ├── voiceParser.ts  # Voice transcript parsing
│   ├── validation.ts   # Input validation schemas
│   └── handicapUtils.ts
├── pages/
│   ├── Scorecard.tsx   # Main scoring page
│   ├── Home.tsx
│   ├── NewRound.tsx
│   └── ...
├── types/
│   ├── golf.ts         # Core type definitions
│   └── betting.ts      # Betting-related types
└── integrations/
    └── supabase/       # Supabase client & types
```

## Features

### Scoring
- Tap or voice input for scores
- Real-time sync across devices
- Offline support with sync queue
- Handicap calculations (Course Handicap, Match Play differential)

### Betting Games
- **Nassau**: Front 9 / Back 9 / Overall with auto-press
- **Skins**: Individual hole wins with optional carryover
- **Match Play**: 2-player head-to-head with net scoring
- **Wolf**: 4-player rotating wolf format
- **Stableford**: Points-based scoring
- **Best Ball**: Team best ball format
- **Prop Bets**: Custom side bets

### Voice Scoring
- Natural language input: "Mike got a 4, Bob had a 5"
- Fuzzy name matching with nicknames
- Golf term recognition (birdie, bogey, etc.)
- Confirmation modal for verification

### Multiplayer
- Join codes for round sharing
- Real-time score updates via Supabase
- Spectator mode
- Scorekeeper permissions

## Testing

Tests are located alongside source files with `.test.ts` extension.

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/lib/games/nassau.test.ts

# Watch mode
npm test -- --watch
```

### Test Coverage

| Module | Tests |
|--------|-------|
| voiceParser | 114 |
| wolf | 55 |
| stableford | 42 |
| matchPlay | 31 |
| bestball | 30 |
| nassau | 27 |
| skins | 22 |
| settlement | 18 |
| **Total** | **339** |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## License

Private - All rights reserved
