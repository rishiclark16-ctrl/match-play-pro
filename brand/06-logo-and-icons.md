# MATCH Golf — Logo & Icon Guide

## The Logo Mark
Bold **MATCH** wordmark in Inter Black (900 weight) on a near-black (`#0A0A0A`) background. The **A** is rendered in chartreuse yellow (`#F0EE3A`) — the single accent that makes the mark distinctive and recognizable at any size. Below the wordmark: **SCORE. BET. WIN.** in Inter Semibold with the final period in chartreuse.

### Logo Elements
| Element | Color | Hex |
|---------|-------|-----|
| Background | Near Black | `#0A0A0A` |
| M, T, C, H | White | `#FFFFFF` |
| A | Chartreuse Yellow | `#F0EE3A` |
| Subtitle text | Mid Gray | `#555555` |
| Subtitle final period | Chartreuse Yellow | `#F0EE3A` |

### Logo Style Notes
- The wordmark is set in Inter Black (900), tight tracking (-3 letter-spacing at 512px scale)
- The chartreuse A is the only color accent — it carries the entire brand identity
- The subtitle "SCORE. BET. WIN." communicates the app's purpose at a glance
- No drop shadows, no gradients, no outlines, no flagsticks, no illustrations
- The logo always appears on the near-black background — never place it on white or off-white

---

## Logo Variations

### App Icon (square, near-black background)
The primary lockup. MATCH wordmark centered with "SCORE. BET. WIN." subtitle below.

### Splash Screen
The MATCH wordmark large, centered, with "SCORE. BET. WIN." subtitle. Near-black background.

### Favicon / Small Sizes
At small sizes (≤ 40px) the subtitle disappears but the chartreuse A remains highly visible. No simplification needed.

---

## File Reference

All files are in `/brand/`:

| File | Size | Use |
|------|------|-----|
| `app-icon-1024.png` | 1024×1024px | **Master** — use this for all resizing and marketing |
| `logo-icon-512.png` | 512×512px | Web, social media profile images |
| `logo-icon-192.png` | 192×192px | PWA, smaller web contexts |
| `splash-screen.png` | 1024×1024px | Splash / loading screen |
| `splash-screen-2732.png` | 2732×2732px | High-res iPad / retina splash |

Full iOS icon set (all Xcode sizes) in `/brand/app-icons-all-sizes/`:

| File | Size | Usage |
|------|------|-------|
| `AppIcon-1024.png` | 1024×1024 | App Store |
| `AppIcon-180.png` | 180×180 | iPhone @3x |
| `AppIcon-120.png` | 120×120 | iPhone @2x |
| `AppIcon-167.png` | 167×167 | iPad Pro @2x |
| `AppIcon-152.png` | 152×152 | iPad @2x |
| `AppIcon-87.png` | 87×87 | Settings @3x |
| `AppIcon-80.png` | 80×80 | Spotlight @2x |
| `AppIcon-76.png` | 76×76 | iPad @1x |
| `AppIcon-60.png` | 60×60 | Notification @3x |
| `AppIcon-58.png` | 58×58 | Settings @2x |
| `AppIcon-40.png` | 40×40 | Spotlight @1x |
| `AppIcon-29.png` | 29×29 | Settings @1x |
| `AppIcon-20.png` | 20×20 | Notification @1x |

### Regenerating Icons
All icons are generated from code — no manual Figma exports needed:
```bash
node scripts/generate-app-icon.cjs      # All icon sizes
node scripts/generate-splash-screen.cjs  # Splash screens
node scripts/generate-favicons.cjs       # PWA favicons
```

---

## Usage Rules

✅ Always use `app-icon-1024.png` as the source for any marketing resizing
✅ Near-black background only — the logo is designed for dark backgrounds
✅ The chartreuse A (`#F0EE3A`) is the defining accent — keep it
✅ Maintain clear space equal to the cap height on all sides

❌ Do not place the wordmark on white, off-white, or any light background
❌ Do not recolor the A or make all letters the same color
❌ Do not add drop shadows, glows, or gradients
❌ Do not stretch or distort the proportions
❌ Do not add flagsticks, golf balls, or illustrations to the icon
❌ Do not use the old M-with-flagstick mark — that is the previous version

---

## Combining Logo + Wordmark

When setting "MATCH" as text in UI or marketing:
```
Font:    Inter
Weight:  900 (Black)
Color:   #FFFFFF (on dark bg), A in #F0EE3A
Tracking: -0.02em
```

"SCORE. BET. WIN." subtitle (when used):
```
Font:    Inter
Weight:  600
Color:   #555555, final period in #F0EE3A
Tracking: 0.15em
Transform: UPPERCASE
Size:    roughly 20% of the MATCH wordmark height
```
