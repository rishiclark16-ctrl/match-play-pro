# MATCH Golf - Brand Guidelines

---

## 1. Logo & App Icon

### App Icon
- **Style:** Plush 3D golf flag (soft, rounded, tactile)
- **Primary Color:** Chartreuse / neon yellow-green body
- **Background:** Clean, minimal
- **Format:** 1024x1024 for App Store, auto-scaled by iOS

### Display Name
- **In-App:** MATCH
- **App Store:** MATCH Golf
- **Full Reference:** MATCH Golf

### Usage Rules
- Always capitalize "MATCH" in all caps
- "Golf" in title case when used alongside
- Never abbreviate to "MG" or "Match"

---

## 2. Color Palette

### Design System v4.0 -- "Direction B: Clean & Modern"

| Token | Color | HSL Value | Usage |
|-------|-------|-----------|-------|
| **Background** | Warm off-white | `60 5% 97%` | App background, page canvas |
| **Foreground** | Near-black | `0 0% 4%` | Body text, primary text |
| **Primary** | Near-black | `0 0% 6%` | CTAs, buttons, headings |
| **Primary Foreground** | White | `0 0% 100%` | Text on primary buttons |
| **Card** | Pure white | `0 0% 100%` | Card backgrounds |
| **Muted** | Light warm gray | `60 5% 93%` | Disabled states, subtle backgrounds |
| **Muted Foreground** | Mid gray | `0 0% 47%` | Secondary text, labels |
| **Gold / Accent** | Chartreuse yellow | `59 86% 57%` | Accent highlights, Pro badges, CTA accents |
| **Gold Foreground** | Near-black | `0 0% 4%` | Text on gold backgrounds |
| **Success** | Green | `142 72% 29%` | Under par scores, positive states |
| **Warning** | Amber | `38 95% 48%` | Bogey scores |
| **Danger** | Red | `0 85% 52%` | Double bogey+ scores, errors |
| **Destructive** | Red | `0 85% 55%` | Delete actions |
| **Border** | Light warm gray | `60 5% 88%` | Card borders, dividers |

### Score-Specific Colors

| Score | Background Token | Text Class |
|-------|-----------------|------------|
| Eagle or better | `--score-eagle: 142 76% 92%` | `text-success` |
| Birdie | `--score-birdie: 142 76% 92%` | `text-success` |
| Par | `--score-par: 60 5% 97%` | `text-foreground` |
| Bogey | `--score-bogey: 48 96% 93%` | `text-warning` |
| Double+ | `--score-double: 0 86% 97%` | `text-danger` |

### Color Rules
- All colors MUST use HSL format
- Gold/chartreuse is used sparingly -- accent only (Pro badges, active tab dots, center nav button)
- Near-black primary gives a premium, editorial feel
- No pure black (#000) backgrounds
- No dark mode (single light theme)

---

## 3. Typography

### Font Stack
- **Primary:** System font stack (SF Pro on iOS, system sans-serif on web)
- No custom web fonts loaded -- keeps bundle small and native-feeling

### Type Scale

| Element | Size | Weight | Tracking | Notes |
|---------|------|--------|----------|-------|
| Page title | 24px | Black (900) | -0.04em | Tight tracking, all pages |
| Section heading | 16-18px | Black (900) | -0.02em | Card titles, section labels |
| Body text | 14px | Regular (400) | Normal | Descriptions, content |
| Caption / Label | 11-13px | Bold (700) | Normal | Timestamps, metadata |
| Overline | 10-11px | Black (900) | 0.08-0.2em | Uppercase labels (e.g., "MATCH Pro") |
| Tab label | 9px | Bold (700) | 0.08em | Bottom nav labels |
| Legal text | 10px | Regular (400) | Normal | Terms, subscription fine print |

### Typography Utility
- `cn()` function (clsx + tailwind-merge) for conditional class composition
- Custom typography utilities in `src/lib/typography.ts`

---

## 4. Spacing & Layout

### Safe Areas
- Bottom padding: 34px (iPhone home indicator safe area)
- Status bar: Overlay mode (content renders behind it)
- Content inset: `never` on iOS (edge-to-edge)

### Card Styling
- Border radius: `rounded-2xl` (16px) for cards
- Shadow: `shadow-[0_1px_3px_rgba(0,0,0,0.06)]` (very subtle)
- Padding: 16px standard card padding

### Grid
- Mobile-first single column layout
- Max container width: inherits from viewport
- Horizontal padding: 16-24px (px-4 to px-6)

---

## 5. Iconography

### Icon Library
- **Lucide React** (v0.462.0) -- consistent line icon set
- Stroke width: 1.75 (default), 2.5 (active/selected states)
- Size: 22px for navigation, 16-20px for inline, 28px for feature icons

### Custom Visual Elements
- Golf flag emoji used sparingly in brand contexts
- Score-type indicators use colored circles/pills, not icons
- Confetti animation (canvas-confetti) for celebrations

---

## 6. Motion & Animation

### Framework
- **Framer Motion** v12 for all micro-interactions

### Principles
- Subtle, fast animations (200-300ms)
- `whileTap={{ scale: 0.97 }}` on buttons for press feedback
- Staggered list animations: `delay: index * 0.05`
- Sheet/modal: slide up from bottom
- Page transitions: fade with minimal shift
- Haptic feedback paired with visual transitions

### Standard Patterns
| Interaction | Animation |
|------------|-----------|
| Button press | Scale to 0.97 |
| Sheet open | Slide up from bottom |
| List items | Stagger fade-in with x/y offset |
| Score entry | Number flow animation |
| Celebration | Confetti burst |
| Offline banner | Slide down from top |
| Tab switch | Fade crossfade |

---

## 7. Tone of Voice

### Writing Style
- Short, punchy sentences
- No corporate jargon
- Conversational but not slangy
- Golf terminology used naturally (not explained)
- Numbers and money are always precise ($2.50, not "about two fifty")

### In-App Copy Examples
| Context | Example |
|---------|---------|
| Empty state | "No rounds yet. Tee it up." |
| Winning | "You're up $12.50" |
| Settlement | "Mike owes Dave $5.00" |
| Pro upsell | "Unlock the full experience" |
| Error | "Something went wrong" (never technical jargon) |
| Offline | "No connection -- X scores queued" |
| Voice | "Say something like 'Mike got a 4'" |

---

## 8. Do's and Don'ts

### Do
- Use warm off-white backgrounds (never pure white pages)
- Use near-black for text and CTAs (premium feel)
- Use chartreuse gold sparingly for emphasis
- Keep cards clean with minimal shadows
- Use haptics on all interactive elements
- Display money with 2 decimal places always

### Don't
- Use gradients on buttons or backgrounds
- Use emoji in UI (except prop bet type indicators)
- Use dark mode
- Use custom fonts
- Make the app feel "techy" -- it should feel like a premium golf product
- Show loading spinners longer than necessary
