# MATCH Golf — Logo & Icon Guide

## The Logo Mark
A bold white **M** letterform with heavily rounded corners. The left leg of the M doubles as a flagstick, with a chartreuse yellow triangular golf flag at the top. Set on a near-black (`#0A0A0A`) background.

### Logo Elements
| Element | Color | Hex |
|---------|-------|-----|
| Background | Near Black | `#0A0A0A` |
| M letterform | White | `#FFFFFF` |
| Golf flag | Chartreuse Yellow | `#F0EE3A` |

### Logo Style Notes
- The M is geometric, heavy weight, fully rounded terminals (no sharp corners)
- The flag is a simple right-pointing triangle — flat, no gradients, no stroke
- The flagstick is the left leg of the M itself — they are one shape
- No drop shadows, no gradients, no outlines
- The logo always appears on the near-black background — never place it on white or off-white

---

## Logo Variations

### App Icon (square, near-black background)
The primary lockup. M centered with equal padding on all sides, flag in the upper-left quadrant.

### Splash Screen / Wordmark
The M logo large, centered, with "MATCH" and "GOLF SCORING" wordmark below in Inter. Near-black background.

### Favicon / Small Sizes
At small sizes (≤ 64px) the flag reads clearly due to the high contrast yellow on black. No simplification needed.

---

## File Reference

All files are in `/brand/`:

| File | Size | Use |
|------|------|-----|
| `app-icon-1024.png` | 1024×1024px | **Master** — use this for all resizing and marketing |
| `logo-icon-512.png` | 512×512px | Web, social media profile images |
| `logo-icon-192.png` | 192×192px | PWA, smaller web contexts |
| `splash-screen.png` | Large | iOS splash / loading screen |
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

---

## Usage Rules

✅ Always use `app-icon-1024.png` as the source for any marketing resizing
✅ Near-black background only — the logo is designed for dark backgrounds
✅ The chartreuse flag (`#F0EE3A`) is the only color — keep it
✅ Maintain clear space equal to the flag height on all sides

❌ Do not place the M on white, off-white, or any light background
❌ Do not recolor the M or the flag
❌ Do not add drop shadows or glows
❌ Do not stretch or distort the proportions
❌ Do not use the old penguin mascot — that is the previous version

---

## Combining Logo + Wordmark

When setting "MATCH" as text alongside the M mark:
```
Font:    Inter
Weight:  900 (Black)
Color:   #FFFFFF (on dark bg)
Tracking: -0.02em
Size:    roughly 60–70% of the M mark height
```

"GOLF SCORING" subtitle (when used):
```
Font:    Inter
Weight:  500
Color:   #FFFFFF at 50% opacity
Tracking: 0.15em
Transform: UPPERCASE
Size:    roughly 25% of the M mark height
```
