# MATCH Golf — Full App Redesign Plan
## Direction B: Clean & Modern

> **Design System:** Warm off-white (#F8F8F6) background · Near-black (#0A0A0A) type · White cards with subtle shadows · Chartreuse yellow (#F0EE3A) accent · Live green (#22C55E) · Bold M logo

---

## PHASE 1 — Foundation & Shared Systems (Do First)

### 1A. Animation Library (`src/lib/animations.ts`)
Add shared Framer Motion variants used across all pages:
- `pageEnter` — `{ opacity: 0, y: 16 }` → `{ opacity: 1, y: 0 }`, spring stiffness 300 damping 28
- `staggerContainer` — `staggerChildren: 0.05`
- `listItem` — `{ opacity: 0, x: -10 }` → `{ opacity: 1, x: 0 }`
- `cardEnter` — `{ opacity: 0, y: 10 }` → `{ opacity: 1, y: 0 }`, spring stiffness 300 damping 25
- `scaleIn` — `{ scale: 0.92, opacity: 0 }` → `{ scale: 1, opacity: 1 }`, spring stiffness 350 damping 30
- `slideUp` — `{ y: '100%' }` → `{ y: 0 }`, spring damping 28 stiffness 350
- `shimmer` — gradient shimmer keyframes for skeleton loading
- `countUp(from, to)` — spring-based number count utility hook

### 1B. `useCountUp` hook (`src/hooks/useCountUp.ts`)
Reusable hook that animates a number from 0 → target value using Framer Motion's `useSpring` + `useMotionValue`. Used for stats, scores, money amounts.

### 1C. `<AnimatedNumber>` component (`src/components/ui/animated-number.tsx`) — CHECK IF EXISTS
If not, create: takes a `value: number` prop, animates on change. Uses `useCountUp`. Used everywhere numbers change.

### 1D. `<ShimmerSkeleton>` — upgrade `page-skeleton.tsx`
Replace `animate-pulse` with a CSS gradient shimmer sweep (left-to-right). Make all skeletons `rounded-2xl`. Add `scorecard`, `list`, `stats`, `profile`, `card` variants.

### 1E. Global Haptic Triggers
Ensure every tap, swipe, drag threshold, modal open, score save triggers appropriate haptic. Already partially done — audit and fill gaps.

---

## PHASE 2 — Navigation & Scaffolding

### 2A. BottomNav ✅ DONE
- Subtle `1px solid rgba(0,0,0,0.06)` border (complete)
- Flat nav items with yellow dot indicator for active
- Smooth active state transitions

### 2B. AppLayout
- Add `headerBordered` prop (default `true`) — `border-b-2 border-foreground`
- All headers use `pt-safe-content pb-3 px-6` pattern
- Remove all AppBackground / GeometricBackground references

### 2C. SplashScreen
- Replace tech grid with Direction B: black background, Bold M SVG centered, spring scale entrance
- `{ scale: 0, opacity: 0 }` → spring bounce → `{ scale: 1, opacity: 1 }`

---

## PHASE 3 — Home ✅ DONE
All B_RoundCard, stat grid, New Round CTA, Watch button, section labels, join modal complete.

---

## PHASE 4 — Scorecard (Highest Priority — Core Experience)

### 4A. ScorecardHeader
**Changes:**
- Background: `bg-background` (warm off-white)
- Border: `border-b-2 border-foreground`
- Course name: `text-lg font-black tracking-[-0.04em] text-foreground`
- Join code: `text-[11px] font-mono tracking-[0.2em] text-muted-foreground`
- Exit button: `w-9 h-9 rounded-xl bg-muted` → scale 0.9 on tap
- Dropdown: white bg, `rounded-2xl`, `shadow-[0_4px_20px_rgba(0,0,0,0.12)]`, stagger item reveal
- Destructive item (End Round): red text, hairline separator above

### 4B. HoleNavigator
**Changes:**
- Background: `bg-background border-b-2 border-foreground`
- Hole number: `text-5xl font-black tracking-[-0.04em]`
- Par badge: `bg-[#F0EE3A] text-[#0A0A0A] text-xs font-black px-3 py-1 rounded-full`
- Yardage/HCP: `text-[11px] text-muted-foreground font-mono`
- Prev/Next buttons: `bg-muted rounded-xl w-9 h-9` — hide (opacity-0) when disabled
- Drag feedback: haptic at 50px threshold
- Slide animation: add subtle `scale: [1, 1.02, 1]` during direction transition

### 4C. PlayerCard
**Changes:**
- Background: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- Leading card: `shadow-[0_0_0_2px_rgba(34,197,94,0.3),0_4px_16px_rgba(34,197,94,0.08)]`
- Leader badge: `bg-[#22C55E] text-white text-[10px] font-bold px-2 py-0.5 rounded-full`
- Score pill colors (relative to par):
  - Eagle (≤ -2): `bg-[#DCFCE7] border border-[#86EFAC]` + double circle
  - Birdie (-1): `bg-[#F0FFF4] border border-[#BBF7D0]` + single circle
  - Par (0): `bg-white border border-[#E5E7EB]`
  - Bogey (+1): `bg-[#FFFBEB] border border-[#FDE68A]`
  - Double+ (≥+2): `bg-[#FEF2F2] border border-[#FECACA]`
- Stroke dots: `bg-[#F0EE3A]` (chartreuse)
- **Score change animation:** `animate={{ backgroundColor: ['transparent', '#F0EE3A30', 'transparent'] }}` over 0.4s when score changes
- **Entrance:** stagger by `index * 0.06` with spring
- Voice success overlay: green flash → bouncing checkmark

### 4D. ScoreInputSheet
**Changes:**
- Sheet: `bg-[#F8F8F6] rounded-t-3xl`
- Border-top: `border-t-2 border-foreground`
- Header: player name `font-black tracking-[-0.03em]`, hole info in muted mono
- Score buttons (4-col grid):
  - Selected: `bg-[#F0EE3A] text-[#0A0A0A] border-2 border-[#D4D200]`
  - Eagle: `bg-[#DCFCE7] border border-[#86EFAC]`
  - Birdie: `bg-[#F0FFF4] border border-[#BBF7D0]`
  - Par: `bg-white border border-[#E5E7EB]`
  - Bogey+: warm amber/red tints
- **Stagger entrance:** buttons enter 0.02s apart
- **Score label:** `text-[9px] font-bold uppercase tracking-[0.06em]`

### 4E. QuickScoreButtons
- Score display: animate number change (count-up/down via spring)
- Plus/Minus: `rounded-xl bg-muted` with `whileTap={{ scale: 0.88 }}`
- Long-press: scale grow over 0.5s as feedback

### 4F. HoleSummary
- Card: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- Header: `bg-muted/30 rounded-t-2xl px-4 py-3` with chevron rotate animation
- Expand: Framer Motion `height: 'auto'` with `overflow: hidden`
- Opportunity context: `bg-[#F0FFF4] border-l-4 border-[#22C55E] rounded-r-xl`
- Critical context: `bg-[#FEF2F2] border-l-4 border-[#EF4444] rounded-r-xl`
- Pot values: `font-black text-foreground`

### 4G. ScorecardBottomBar
- Background: `bg-background border-t-2 border-foreground`
- Leaderboard button: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-4 py-2`
- Voice button: keep pulsing rings, upgrade ring color to `#F0EE3A` on success
- **Finish button:** `bg-[#F0EE3A] text-[#0A0A0A] font-black rounded-2xl` with glow pulse: `boxShadow: ['0 0 0 0 rgba(240,238,58,0.8)', '0 0 0 12px rgba(240,238,58,0)']` repeating
- Progress: `font-mono text-muted-foreground text-sm`

### 4H. SpectatorBanner
- Spectator: `bg-[#F0FFF4] border-b-2 border-[#22C55E]` — Eye icon in green
- View-only: `bg-muted/30 border-b border-border`
- Entrance: `{ y: -24, opacity: 0 }` → spring

### 4I. LiveLeaderboard
- Container: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]` (no gradient)
- Match play: symmetric 3-col layout, center shows match status in `font-black`
- Leading score: `text-[#22C55E] font-black text-3xl tabular-nums`
- TIED badge: `bg-[#FFFBEB] text-[#D97706] font-bold`
- DORMIE badge: `bg-[#FEF2F2] text-[#EF4444] font-bold`
- Score update: number spring transition on change

### 4J. MoneyTracker
- Card: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- Leader row: `bg-[#F0FFF4] border border-[#BBF7D0]`
- Losing row: `bg-[#FEF9F9] border border-[#FECACA]/50`
- Positive balance: `text-[#22C55E] font-black tabular-nums`
- Negative balance: `text-[#EF4444] font-black tabular-nums`
- Biggest swing badge: `{ scale: 0, rotate: -10 }` → spring bounce (already animated, refine)
- Balance change: AnimatedNumber component for live updates

### 4K. WolfSelection Sheet
- Sheet bg: `#F8F8F6`, `rounded-t-3xl`
- Pot card: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- Partner buttons: `bg-white border-2 border-border rounded-2xl` → selected: `border-foreground bg-muted/20`
- Lone wolf: `border-2 border-[#F59E0B] bg-[#FFFBEB]`
- Blind wolf: gradient keep, add glow pulse on `#F59E0B`
- Confirm button entrance: `{ opacity: 0, y: 10 }` → spring after selection
- Partner select checkmark: `{ scale: 0 }` → spring bounce

### 4L. VoiceButton
- Idle: `bg-foreground rounded-2xl w-16 h-16` (square, not circle) with mic icon
- Listening: rings pulse in `#F0EE3A`, slight wobble `rotate: [-1, 1, -1]`
- Processing: spin + `opacity: 0.7`
- Success flash: `backgroundColor: ['#0A0A0A', '#22C55E', '#0A0A0A']` over 0.4s
- Labels: `font-bold uppercase tracking-[0.08em] text-[10px]`

---

## PHASE 5 — New Round (Multi-Step Wizard)

### 5A. Wizard Shell (NewRound.tsx)
- Header: `border-b-2 border-foreground` with step counter
- Progress bar: 3 animated segments — filled=`bg-foreground`, active=`bg-foreground/30`, empty=`bg-border`
  - Segment fill animation: spring width transition when step advances
- Step title: `font-black text-[22px] tracking-[-0.04em]`
- Step transitions: `x: 30 → 0` (forward), `x: -30 → 0` (back) + opacity, spring
- Bottom CTA: `border-t border-[rgba(0,0,0,0.06)]` (subtle), `bg-foreground text-background rounded-2xl h-[52px] font-bold text-[15px]`
- Disabled CTA: `opacity-40` with spring transition on enable

### 5B. CourseStep
- Search input: `bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.06)]` with left icon
- Course cards: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]` with chevron
- Selected course: `shadow-[0_0_0_2px_#0A0A0A]` outline + checkmark in `#22C55E`
- Hole toggle (9/18): pill-style, selected=`bg-foreground text-background`, other=`bg-muted`
- "Add Manually" button: dashed border, muted text
- Course list stagger: 0.04s per item

### 5C. PlayersStep
- Handicap mode toggle: pill container, selected=`bg-foreground text-background`, other=`bg-transparent`
- Player cards: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
  - Number badge: `w-8 h-8 rounded-full bg-foreground text-background font-bold`
  - Name input: `bg-muted/50 rounded-xl border-0 py-3`
  - Remove: `w-7 h-7 rounded-lg bg-destructive/10 text-destructive`
  - Validation checkmark: `{ scale: 0 }` → spring bounce when name filled
- Add Player button: `border-2 border-dashed border-border rounded-2xl py-4`
  - At limit: `border-[#F0EE3A]/50 text-[#A08C00]` with Crown icon
- Group selector: section label + horizontal scroll cards
- Stagger cards: 0.05s per player

### 5D. FormatStep
- Section labels: `text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground`
- Game cards: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
  - Enabled: `shadow-[0_0_0_2px_#0A0A0A]`
  - Pro-locked: `opacity-60` + Lock badge `bg-muted text-[10px]`
- Options collapse: Framer Motion `height: auto` with `overflow: hidden`
- Stakes input: `text-center font-mono text-lg bg-muted/50 rounded-xl`
- Toggle switches: use `bg-[#22C55E]` when on
- Stagger games: 0.04s per card

### 5E. TeeSelector
- Sheet: `bg-[#F8F8F6] rounded-t-3xl`
- Tee cards: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- Tee color dot: `w-3 h-3 rounded-full` with actual golf tee colors
- Yardage/Par: `font-mono text-sm tabular-nums`
- Rating/Slope: right-aligned, `font-bold`
- Entrance stagger per tee: 0.04s

### 5F. CourseSearch
- Tab stagger: list items fade + slide up 0.03s apart
- Empty state: `{ y: 16, opacity: 0 }` → spring
- Loading: shimmer skeleton cards

---

## PHASE 6 — Leaderboard

### 6A. Page Layout
- Header: `border-b-2 border-foreground`, course name in muted, refresh icon `rounded-xl bg-muted`
- Background: `#F8F8F6`

### 6B. Player Cards
- All cards: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- Leader card: `shadow-[0_0_0_2px_rgba(34,197,94,0.4),0_4px_16px_rgba(34,197,94,0.1)]`
- Position badges:
  - 1st: `bg-[#F0EE3A] text-[#0A0A0A]` + trophy icon
  - 2nd: `bg-[#E5E7EB] text-[#374151]` + medal icon
  - 3rd: `bg-[#FED7AA] text-[#92400E]` + award icon
  - 4+: `bg-muted text-muted-foreground` + number
- Score column: `font-black tabular-nums text-xl`
  - Under par: `text-[#22C55E]`
  - Even: `text-foreground`
  - Over par: `text-[#EF4444]`
- Trend icon: animated on change with spring
- Stagger entrance: `rank * 0.06s`

### 6C. Stats Card
- 4 stat cells: white bg, subtle inner border
- Birdies: `text-[#22C55E]`, Pars: muted, Bogeys: `text-[#D97706]`, Doubles: `text-[#EF4444]`
- Numbers: AnimatedNumber count-up on page load

### 6D. Mode Toggle (Gross/Net)
- Pill container: `bg-muted rounded-full p-1`
- Active: `bg-foreground text-background` sliding bg (layoutId animation)
- Transition: spring stiffness 400 damping 30

---

## PHASE 7 — Round Complete (Celebration Screen)

### 7A. RoundCompleteHeader
- Remove tech grid, use solid `#F8F8F6`
- Trophy icon: `bg-[#F0EE3A] rounded-2xl w-16 h-16` → `{ scale: 0 }` spring bounce + 3s float keyframe loop
- "Round Complete" label: `text-[#F0EE3A] font-bold uppercase tracking-[0.1em] text-xs`
- Course name: `font-black text-[22px] tracking-[-0.04em]`
- Metadata: subtle muted row

### 7B. WinnerCard
- Card: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- Top accent bar: `h-1 bg-[#F0EE3A] rounded-t-2xl w-full`
- Trophy: `text-[#F0EE3A] w-6 h-6`
- "Winner" label: `text-[#F0EE3A] text-[10px] font-bold uppercase tracking-[0.1em]`
- Winner name: `font-black text-2xl tracking-[-0.04em]`
- Score: AnimatedNumber from 0 → final (0.6s delay)
- Under par: `text-[#22C55E]`, Over par: `text-[#EF4444]`
- Entrance: `{ opacity: 0, y: 20 }` → spring at delay 0.3

### 7C. FinalStandings
- Container: `space-y-2 mt-2`
- Row cards: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4`
- 1st place: `shadow-[0_0_0_2px_rgba(240,238,58,0.5)]` + chartreuse accent
- Rank badges:
  - 1st: `bg-[#F0EE3A] text-[#0A0A0A]` — trophy
  - 2nd: `bg-[#E5E7EB] text-[#374151]` — medal
  - 3rd: `bg-[#FED7AA] text-[#92400E]` — award
  - 4+: `bg-muted` — number
- Score AnimatedNumber on row entrance (delay = `0.4 + rank * 0.05`)
- Net winnings: green positive, muted zero, red negative
- Entrance: `{ opacity: 0, x: -10 }` → staggered

### 7D. SettlementsSection
- Settlement rows: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4`
- Pending: `shadow-[0_0_0_1.5px_rgba(10,10,10,0.2)]`
- Paid: `bg-[#F0FFF4] border border-[#BBF7D0]` + green checkmark flash on state change
- Forgiven: `opacity-60` + strikethrough amount
- Amount: `font-black tabular-nums`
  - Pending: `text-foreground`
  - Paid: `text-[#22C55E]`
- "Paid" button: `bg-[#F0FFF4] border border-[#22C55E] text-[#22C55E] font-bold rounded-xl`
- Mark-paid animation: green flash → bg transitions to #F0FFF4
- Progress bar above section: animated width = (paid / total) * 100%

### 7E. GameResultsSection
- Game cards: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4`
- Amount positive: `text-[#22C55E] font-black`
- Amount negative: `text-[#EF4444] font-black`
- Game icons: replace emoji with Lucide icons
- Section expand: Framer Motion height + stagger children

### 7F. BettingBreakdownSheet
- Sheet: `bg-[#F8F8F6] rounded-t-3xl` h-[85vh]
- Player tabs: horizontal scroll, active=`bg-foreground text-background`
- Total balance card: `bg-white rounded-2xl shadow` + tint based on sign
- Balance: AnimatedNumber, large `font-black`
- Progress bars: `motion.div width: 0 → %` spring (already done — refine spring)
- Game rows: stagger 0.04s each

### 7G. RoundCompleteActions
- Fixed bar: `border-t border-[rgba(0,0,0,0.06)] bg-background` + gradient overlay
- "New Round": `bg-foreground text-background rounded-2xl h-[52px] font-bold`
- "Send Results": `border-2 border-foreground rounded-2xl h-[52px] font-semibold`
- Share buttons: `bg-white border border-border rounded-xl`
- Button entrance: stagger slide-up from bottom (0.04s apart)

### 7H. HighlightsSection
- Items: `bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-3`
- Great: left `border-l-4 border-[#22C55E]`
- Bad: left `border-l-4 border-[#EF4444]`
- Icon: replace emoji with Lucide
- Stagger reveal on expand

---

## PHASE 8 — Stats Page

### 8A. Page Layout
- Header: `border-b-2 border-foreground`
- Background: `#F8F8F6`

### 8B. Hero Stats Banner
- Container: `bg-foreground rounded-2xl px-4 py-5 mx-0`
- 3 columns: Holes Won `text-[#F0EE3A]`, $ Won `text-white`, Matches `text-white`
- Values: AnimatedNumber count-up on page load (0.1-0.3s delay offset per column)
- Win rate: animate from 0% → final%
- Separator: `border-r border-white/20`

### 8C. Stat Cards
- `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4`
- MapPin / Flag icons: `text-muted-foreground`
- Course/Hole name: `font-bold text-foreground`
- Win count: `font-black text-2xl text-foreground`
- Entrance: `{ opacity: 0, y: 10 }` staggered

### 8D. Empty State
- Bold M icon centered in `bg-foreground rounded-2xl w-16 h-16`
- `font-black` heading, muted description
- CTA button: `bg-foreground text-background rounded-2xl`

---

## PHASE 9 — Friends Page

### 9A. Friend Code Section
- Card: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- Code display: `font-mono text-3xl font-black tracking-[0.3em] text-foreground`
- Copy button: tap → `text-[#22C55E]` + scale pop + "Copied!" toast
- QR: white bg, clean border `border border-border rounded-xl`
- Share button: `bg-foreground text-background rounded-2xl`

### 9B. Add Friend Section
- Tab switcher: Code / Email / Phone pill tabs (Direction B style)
- Input: `bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- Add button: `bg-foreground text-background rounded-xl`
- AnimatePresence on input swap with tab change

### 9C. Pending Requests
- Section label with pulsing live dot
- Request cards: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- Accept: `bg-[#F0FFF4] border border-[#22C55E] text-[#22C55E] font-bold`
- Decline: `bg-muted text-muted-foreground`
- Accept animation: card scales + fades with green flash

### 9D. Friends List
- Friend cards: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4`
- Avatar: `rounded-xl` (square-ish)
- Name: `font-bold text-foreground`
- Handicap: `text-muted-foreground text-sm`
- Remove: ghost icon button, destructive on confirm
- Stagger: 0.04s per item

---

## PHASE 10 — Groups Page ✅ Header done, cards need update

### 10A. Group Cards
- `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4`
- Name: `font-bold text-foreground`
- Description: `text-muted-foreground text-sm`
- Member avatars: `rounded-xl border-2 border-background` stacked -space-x-2
- Edit/Delete: icon buttons `w-8 h-8 rounded-lg bg-muted`
- Delete animation: `exit={{ x: -80, opacity: 0 }}` (existing, keep)
- Entrance stagger: 0.05s

### 10B. CreateGroupSheet
- Sheet: `bg-[#F8F8F6] rounded-t-3xl`
- Inputs: `bg-white rounded-2xl border-border`
- Member cards: `bg-white rounded-xl border border-border`
- Add from friends: horizontal scroll with rounded avatar buttons
- Remove member: slide-left exit animation
- Save button: `bg-foreground text-background rounded-2xl h-[52px] font-bold`

---

## PHASE 11 — Profile Page

### 11A. Avatar Section
- Card: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4`
- Avatar: `w-20 h-20 rounded-2xl` (large, squircle)
- Upload overlay: `bg-black/40 rounded-2xl` with camera icon
- Name: `font-black text-xl tracking-[-0.03em]`
- Email: `font-mono text-sm text-muted-foreground`
- Friend code: `bg-muted rounded-xl px-4 py-2 font-mono font-bold tracking-[0.2em]`
- Copy: `{ scale: 0 }` → spring checkmark on copy

### 11B. Settings Sections
- Section label: `text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2`
- Setting rows: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- Dividers between rows: `border-t border-border/50 mx-4`
- Toggles: `data-[state=checked]:bg-[#22C55E]`
- Input fields: `bg-muted/50 rounded-xl border-0`
- Tee buttons: color-coded pill buttons, selected=`ring-2 ring-foreground`

### 11C. Danger Zone
- "Delete Account": `text-[#EF4444] border border-[#EF4444]/30 bg-[#FEF2F2] rounded-2xl`
- Confirm modal: `bg-white rounded-3xl shadow-2xl` — dramatic entrance `{ scale: 0.9, opacity: 0 }` → spring
- Type "DELETE" input: mono font, red focus border

### 11D. Subscription Section
- Current plan: badge `bg-foreground text-background text-[10px] font-bold px-2 py-0.5 rounded-full`
- Upgrade: `bg-[#F0EE3A] text-[#0A0A0A] rounded-2xl font-bold`

---

## PHASE 12 — Auth Page

### 12A. Layout
- Remove tech grid background
- Background: solid `#F8F8F6`
- Card: `bg-white rounded-3xl shadow-[0_4px_40px_rgba(0,0,0,0.08)]` centered with max-w-sm
- Entrance: `{ opacity: 0, y: 20 }` → spring delay 0.1s

### 12B. Branding
- Bold M icon: `bg-foreground rounded-2xl w-12 h-12` → `{ scale: 0 }` spring bounce on load
- "MATCH" heading: `font-black text-2xl tracking-[-0.04em]`
- Tagline: `text-muted-foreground text-sm`

### 12C. Form
- Tab toggle: pill style matching Direction B
- Input fields: `bg-muted/50 rounded-2xl border-border py-4`
- Password strength bar: segments instead of gradient — filled=`bg-[#22C55E]`, partial=`bg-[#F0EE3A]`
- Requirement pills: `bg-[#F0FFF4] border border-[#BBF7D0] text-[#16A34A]` when met
- Submit button: `bg-foreground text-background rounded-2xl h-[52px] font-bold`
- Apple Sign-In: `bg-foreground text-background rounded-2xl` with Apple icon

---

## PHASE 13 — Modals, Sheets & Overlays

### 13A. All Sheets (global rules)
- Background: `#F8F8F6`
- Border radius: `rounded-t-3xl`
- Handle: `w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-1`
- Entrance: `y: '100%'` → spring damping 28 stiffness 350
- Backdrop: `bg-black/30 backdrop-blur-[2px]`

### 13B. All Center Modals (global rules)
- Background: `bg-white`
- Border radius: `rounded-3xl`
- Shadow: `shadow-2xl`
- Entrance: `{ scale: 0.92, opacity: 0 }` → spring stiffness 350 damping 28
- Backdrop: `bg-black/30 backdrop-blur-[2px]`

### 13C. PropBetSheet
- Template buttons: `bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
  - Selected: `shadow-[0_0_0_2px_#0A0A0A]`
- Stakes input: animate reveal with Framer height
- Add button: `bg-foreground text-background rounded-2xl`

### 13D. PropBetCelebration
- Confetti: use `#F0EE3A`, `#22C55E`, `#0A0A0A` color palette
- Card border: `border-2 border-[#F0EE3A]`
- Amount: AnimatedNumber count-up
- Trophy bg: `bg-[#F0EE3A]`

### 13E. VoiceConfirmationModal
- Score cards: `bg-white rounded-xl border border-border`
  - Birdie: left `border-l-4 border-[#22C55E]`
  - Bogey: left `border-l-4 border-[#EF4444]`
- Missing players: `bg-[#FFFBEB] border border-[#FDE68A] rounded-xl`
- Confirm button: `bg-foreground text-background rounded-2xl`
- Listening dot: `bg-[#F0EE3A]` pulse

### 13F. FinishOptionsOverlay
- Overlay gradient: `from-background/0 via-background/80 to-background`
- Settlement card: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- Payment arrows: `text-[#F0EE3A]`
- Finish button: `bg-[#F0EE3A] text-[#0A0A0A] font-black rounded-2xl`
- Playoff button: `border-2 border-foreground rounded-2xl`
- Settlement amounts: AnimatedNumber

### 13G. PlayoffWinnerModal
- Border: `border-2 border-[#F0EE3A]`
- Trophy bg: `bg-[#F0EE3A]`
- Winner name: `font-black text-3xl tracking-[-0.04em]`
- Add confetti burst (use PropBetCelebration's confetti logic)
- Button: `bg-foreground text-background rounded-2xl`

### 13H. ShareJoinCodeModal
- Modal: `bg-white rounded-3xl`
- Code display: `bg-muted/30 rounded-2xl` with code in `font-mono font-black text-3xl tracking-[0.3em]`
- Copy → `text-[#22C55E]` spring checkmark
- QR: white bg, `rounded-2xl border border-border`

### 13I. ShareRoundResultsSheet
- Quick share grid: `bg-white rounded-2xl border border-border` icon buttons
- Friend items: `bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)]`
- Selected friend: `shadow-[0_0_0_2px_#0A0A0A]`
- Send button: `bg-foreground text-background rounded-2xl` — animate scale when count > 0

---

## PHASE 14 — Page Skeletons & Loading States

### 14A. All skeleton screens
- Replace animate-pulse with shimmer gradient sweep
- Match exact layout of final content (no layout shift)
- Variants needed: home, scorecard, leaderboard, stats, profile, friends, groups
- Fade transition from skeleton → real content

### 14B. Empty States (consistent pattern)
- Centered `bg-foreground rounded-2xl w-16 h-16` icon box with Bold M or relevant icon
- `font-black text-xl tracking-[-0.03em]` heading
- Muted description
- `bg-foreground text-background rounded-2xl` CTA button
- Entrance: `{ scale: 0.8, opacity: 0 }` → spring

---

## PHASE 15 — Tutorial & Onboarding

### 15A. ScorecardTutorial
- Spotlight border: pulse in `#F0EE3A`
- Card: `bg-white rounded-3xl shadow-2xl`
- Card header: `bg-muted/30 rounded-t-3xl`
- Progress dots: active=`bg-[#F0EE3A] w-3`, inactive=`bg-muted w-2`
- Step counter: "2 of 5" text instead of dots only
- Next button: `bg-foreground text-background rounded-2xl`
- Spotlight morphs smoothly to next target via position interpolation

---

## IMPLEMENTATION SEQUENCE

```
Week 1:
  ✅ Home.tsx
  ✅ BottomNav
  □ Phase 1: Animation library + hooks
  □ Phase 4: Scorecard (most important user experience)
  □ Phase 5: New Round

Week 2:
  □ Phase 6: Leaderboard
  □ Phase 7: Round Complete
  □ Phase 13: All modals/sheets/overlays

Week 3:
  □ Phase 8: Stats
  □ Phase 9: Friends
  □ Phase 10: Groups (cards)
  □ Phase 11: Profile
  □ Phase 12: Auth

Week 4:
  □ Phase 14: Skeletons
  □ Phase 15: Tutorial
  □ Polish pass: spacing, typography audit
  □ Animation timing audit: nothing too slow, nothing jarring
  □ Haptic audit: every meaningful tap has feedback
```

---

## MOTION PRINCIPLES (Apply Everywhere)

| Principle | Spec |
|-----------|------|
| Default spring | stiffness: 300, damping: 28 |
| Snappy spring | stiffness: 400, damping: 30 |
| Bouncy spring | stiffness: 350, damping: 20 |
| Modal slide-up | stiffness: 350, damping: 28 |
| Tap scale (button) | 0.95 |
| Tap scale (icon) | 0.9 |
| Stagger list | 0.04–0.06s per item |
| Entrance fade | opacity: 0→1, y: 8→0 |
| Exit fade | opacity: 1→0, y: 0→-4 |
| Number count-up | 0.6s spring |
| Color transitions | 200ms ease |
| Nothing > 400ms | (except celebrations) |

---

## TYPOGRAPHY RULES (Apply Everywhere)

| Usage | Class |
|-------|-------|
| Page title | `font-black text-[22px] tracking-[-0.04em]` |
| Section title | `font-extrabold text-[18px] tracking-[-0.03em]` |
| Card title | `font-bold text-[16px] tracking-[-0.02em]` |
| Section label | `font-bold text-[11px] uppercase tracking-[0.08em] text-muted-foreground` |
| Body | `font-normal text-[14px] text-foreground` |
| Caption | `font-medium text-[12px] text-muted-foreground` |
| Micro label | `font-bold text-[10px] uppercase tracking-[0.06em]` |
| Score/number | `font-black tabular-nums` |
| Code/join | `font-mono tracking-[0.2em]` |
| Button primary | `font-bold text-[15px]` |

---

## CARD SHADOW SYSTEM

| Level | Shadow |
|-------|--------|
| Subtle (default) | `shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]` |
| Live/Active | `shadow-[0_0_0_1.5px_rgba(34,197,94,0.3),0_4px_16px_rgba(34,197,94,0.08)]` |
| Selected/Focus | `shadow-[0_0_0_2px_#0A0A0A]` |
| Winner | `shadow-[0_0_0_2px_rgba(240,238,58,0.5),0_4px_12px_rgba(240,238,58,0.15)]` |
| Elevated modal | `shadow-2xl` |
