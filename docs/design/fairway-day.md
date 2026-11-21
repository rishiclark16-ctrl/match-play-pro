# MATCH design system v5 — "Fairway Day"

Chosen 2026-11-21 from 10 directions (board 08 on the "MATCH Design Directions" canvas).
**Light mode with dark accents.** Golfers use MATCH outdoors in full sun, so the screen
must stay readable in glare: light ground, dark ink, big numerals, 44px+ touch targets.

## Color

| Role | Hex | HSL token (`src/index.css`) | Use |
|---|---|---|---|
| Ground | `#FAFAF7` | `--background: 60 23% 97%` | App background |
| Surface | `#FFFFFF` | `--card` | Cards, rows, sheets |
| Ink | `#0F1F17` | `--foreground`, `--ink: 150 35% 9%` | Text, primary dark buttons (e.g. "Next hole") |
| Forest | `#14532D` | `--primary: 144 61% 20%` | Brand color: hero cards, "+" steppers, active states, links |
| Lime | `#BEF264` | `--gold: 82 85% 67%` | Highlight only: voice button, the one "hot" stat, badges, PRO. Text on lime is Forest `#14532D`. Never lime text on white (fails contrast). |
| Lime tint | `#ECFCCB` | `--gold-muted` / `--score-birdie` | Birdie fill, success tint |
| Muted fill | `#F0F2EC` | `--muted: 80 15% 94%` | Secondary buttons ("−" stepper), chips |
| Muted text | `#5A6B61` | `--muted-foreground: 144 9% 39%` | Secondary text (7:1+ on white) |
| Hairline | `#E7E9E3` | `--border: 80 10% 90%` | Card borders, dividers |
| On-forest text | `#FFFFFF` / `#CFE3D6` | — | Primary / secondary text on Forest |
| Loss / danger | `#B42318` | `--destructive` | Money owed, bogey+, destructive actions |

Money convention: **won = Forest `#14532D`**, **owed = `#B42318`**, even = Ink. (Do not use bright `#22C55E` for text: it fails contrast on white.)

## Type

- **Sora** (Google Fonts, 400/500/600/700/800) for everything. Fallback Inter, system-ui.
- Display: 52px / 800 / -0.04em / line-height 1 (hole number, hero stats).
- Title: 26–32px / 800 / -0.02em.
- Score numerals: 26–34px / 800.
- Body: 16px / 600 for names, 14px / 400 for text.
- Caption: 12px / 400–600, Muted text.
- Labels: sentence case. No ALL-CAPS tracking-wide labels (the old style); use 12px/600 muted.

## Shape and space

- Radius: **20px** cards and rows (`--radius: 1.25rem`), **28px** hero cards, **14px** buttons inside cards, full-round pills for chips.
- Spacing: 14px screen gutter on dense screens, 20px elsewhere; 8px between rows, 14px between sections.
- Elevation: hairline border `#E7E9E3` on white, no heavy shadows. One hero card per screen may be Forest.
- Touch targets ≥ 44px; primary CTA 60px tall, radius 20px.

## Signature components (from board 08)

1. **Forest hero card**: radius 28, Forest background, white title, `#CFE3D6` secondary, lime accent text. Holds the screen's headline (hole number, round result, profile header). Inside it, sub-tiles use `rgba(255,255,255,0.1)` and one lime tile for the hottest number.
2. **Player row**: white, radius 20, hairline border, name 16/600, caption "E · thru 7 · 1 shot", "−" button (muted fill), score numeral, "+" button (Forest fill, white glyph), each 46px, radius 14.
3. **Golf score marks**: birdie or better = circle (Forest 2px border, lime-tint fill); bogey or worse = rounded square (Ink 2px border); not entered = Muted `#B4BDB7` dash.
4. **Footer**: lime voice button (60×60, radius 20, Forest icon) + Ink primary CTA filling the row.
5. **Chips / stats**: muted-fill pills; active = Forest with white text.

## Voice and tone

Plain, short, golfer-to-golfer: "Next hole", "Marcus 2 up", "$16 pot", "gets a shot".

## For the marketing site (matchgolf.info)

Same palette, Sora, the radius scale, the Forest hero card and the score marks.
Light pages; Forest sections as the "dark accent" bands; lime only as a highlight, never body text.
The live product screenshots will change to this look when v2.5's redesign ships.
