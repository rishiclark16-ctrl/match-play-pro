# MATCH Golf — Logo & Icon Guide

## The Logo Mark
Bold **MATCH** wordmark in Inter Black (900 weight) on a near-black (`#0A0A0A`) background. The **A** is rendered in chartreuse yellow (`#F0EE3A`) — the single accent that makes the mark distinctive and recognizable at any size. A short gold underline accent bar sits below the wordmark.

No subtitle. No tagline. Just the word MATCH.

### Logo Elements
| Element | Color | Hex |
|---------|-------|-----|
| Background | Near Black (subtle gradient) | `#0A0A0A` → `#151515` |
| M, T, C, H | White | `#FFFFFF` |
| A | Chartreuse Yellow | `#F0EE3A` |
| Underline accent | Chartreuse Yellow | `#F0EE3A` |

### Logo Style Notes
- The wordmark is set in Inter Black (900), tight tracking (-7px at 1024px scale)
- The chartreuse A is the only color accent — it carries the entire brand identity
- A short gold underline bar (140px wide at 1024px scale, pill-shaped) sits below the wordmark
- No drop shadows, no gradients on text, no outlines, no flagsticks, no illustrations
- The logo always appears on the near-black background — never place it on white or off-white

---

## Logo Variations

### App Icon (square, near-black background)
The primary lockup. MATCH wordmark centered with gold underline accent.

### In-App Header (Home page, top-left)
40x40px dark square with "MATCH" rendered as text inside (11px Inter Black), chartreuse A. Paired with "MATCH" text label to the right.

### Favicon / Small Sizes
At small sizes (< 40px) the underline disappears naturally but the chartreuse A remains visible.

---

## File Reference

All files are in `/brand/`:

| File | Size | Use |
|------|------|-----|
| `app-icon-1024.png` | 1024x1024px | **Master** — use this for all resizing and marketing |
| `logo-icon-512.png` | 512x512px | Web, social media profile images |
| `logo-icon-192.png` | 192x192px | PWA, smaller web contexts |

Full iOS icon set (all Xcode sizes) in `/brand/app-icons-all-sizes/`:

| File | Size | Usage |
|------|------|-------|
| `AppIcon-1024.png` | 1024x1024 | App Store |
| `AppIcon-180.png` | 180x180 | iPhone @3x |
| `AppIcon-120.png` | 120x120 | iPhone @2x |
| `AppIcon-167.png` | 167x167 | iPad Pro @2x |
| `AppIcon-152.png` | 152x152 | iPad @2x |
| `AppIcon-87.png` | 87x87 | Settings @3x |
| `AppIcon-80.png` | 80x80 | Spotlight @2x |
| `AppIcon-76.png` | 76x76 | iPad @1x |
| `AppIcon-60.png` | 60x60 | Notification @3x |
| `AppIcon-58.png` | 58x58 | Settings @2x |
| `AppIcon-40.png` | 40x40 | Spotlight @1x |
| `AppIcon-29.png` | 29x29 | Settings @1x |
| `AppIcon-20.png` | 20x20 | Notification @1x |

### Regenerating Icons
All icons are generated from code — no manual Figma exports needed:
```bash
node scripts/generate-app-icon.cjs      # All icon sizes
node scripts/generate-favicons.cjs       # PWA favicons
```

---

## Usage Rules

- Always use `app-icon-1024.png` as the source for any marketing resizing
- Near-black background only — the logo is designed for dark backgrounds
- The chartreuse A (`#F0EE3A`) is the defining accent — keep it
- Maintain clear space equal to the cap height on all sides

- Do not place the wordmark on white, off-white, or any light background
- Do not recolor the A or make all letters the same color
- Do not add drop shadows, glows, or gradients to the text
- Do not stretch or distort the proportions
- Do not add flagsticks, golf balls, or illustrations to the icon
- Do not add a subtitle or tagline below the wordmark
- Do not use the old flag icon or penguin logo — those are deprecated

---

## Combining Logo + Wordmark

When setting "MATCH" as text in UI or marketing:
```
Font:    Inter
Weight:  900 (Black)
Color:   #FFFFFF (on dark bg), A in #F0EE3A
Tracking: -0.04em
```
