# MATCH Golf — Visual Language & Design Patterns

## Overall Aesthetic
- **Flat, not skeuomorphic** — no textures, no gradients, no drop shadows that mimic real objects
- **High contrast** — near-black on off-white, white on near-black
- **Dense but breathable** — information-rich cards with consistent padding
- **Crisp edges** — rounded corners are moderate (12–16px), never pill-shaped for content cards

---

## Card System

### Standard Card
```
Background: #FFFFFF
Border: 1px #DCDCD5
Border radius: 16px (rounded-2xl)
Padding: 18–20px
Shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
```

### Dark Feature Card (House Game, PRO feature callouts)
```
Background: #0A0A0A
Border radius: 16px
Padding: 20px
Text: White (#FFFFFF)
Accent: #F0EE3A
```

### Selected / Active Card
```
All above + ring: 2px solid #0A0A0A
```

### Live Round Card
```
Border: 1.5px rgba(34,197,94,0.25)
Shadow: 0 0 0 1.5px rgba(34,197,94,0.25), 0 4px 16px rgba(34,197,94,0.08)
```

---

## Icon Style
- Library: **Lucide Icons** (https://lucide.dev)
- Style: 2px stroke, rounded caps
- Size in UI: 16px (small), 20px (standard), 24px (large)
- In marketing: scale up freely, keep 2px stroke weight proportional

---

## Spacing & Layout
- Base unit: 4px
- Card internal padding: 16–20px
- Gap between cards: 8–12px
- Screen horizontal padding: 24px
- Section gaps: 20–24px

---

## Border Radius Reference
| Element | Radius |
|---------|--------|
| Large cards, modals | 16–24px |
| Standard cards | 16px |
| Buttons, inputs | 12–14px |
| Badges, chips | 8–10px |
| Round badges | 9999px (full) |
| Icon boxes | 10–12px |

---

## Shadows
- **Card:** `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` — barely-there lift
- **Modal:** `0 8px 40px rgba(0,0,0,0.16)` — clear elevation
- **Live glow:** `0 4px 16px rgba(34,197,94,0.08)` — subtle green ambient
- **No heavy drop shadows** — keep it flat and clean

---

## Motion Principles
- Spring physics: stiffness 300, damping 28 (snappy but not bouncy)
- Page transitions: slide + fade, 200–350ms
- Button press: scale 0.97–0.98 on tap
- Cards entering: fade + 6–10px upward translate
- Loading spinner: 1s linear rotation

---

## UI Patterns to Reference in Marketing

### Score Bubble
Circular badge, 32–40px diameter, color-coded by score vs par (see color guide), JetBrains Mono number inside.

### Live Badge
```
"● LIVE"
Background: #DCFCE7
Text: #16A34A
Font: 10px Inter 700 uppercase
Padding: 3px 8px
Border radius: full
```

### PRO Badge
```
"PRO"
Background: #0A0A0A
Text: #F0EE3A
Font: 9px Inter 900 uppercase
Tracking: 0.1em
```

### Settlement Row
Money amount left-aligned in JetBrains Mono, player name right. Green for "you win", red for "you owe".

### Voice Input Active State
Yellow ring (`#F0EE3A`) around the mic button, red pulse dot with "Listening..." label in red.

---

## What NOT to Do
- No gradients
- No golf clip art, golf balls, tee icons, fairway photography
- No serif fonts
- No drop shadows heavier than specified above
- No more than 2 font sizes in a single card
- No traditional golf color palette (Augusta green, tan, brown leather)
- No playful/bubbly rounded fonts — Inter only

---

## Imagery Direction (for photos/mockups)
- Device mockups: iPhone 15 Pro (titanium/black), no case
- Background: `#F5F5F0` (app background color) or `#0A0A0A` (near black)
- Lighting: flat, even — no dramatic product photography
- Screenshots: real app UI, not illustrated mockups
- People: candid golfers mid-round, not posed stock photography
- Logo: always the M mark — do not use the old penguin mascot
