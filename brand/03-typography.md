# MATCH Golf — Typography

## Fonts

### Primary: Inter
- Source: Google Fonts (https://fonts.google.com/specimen/Inter)
- Weights used: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold), 800 (ExtraBold), 900 (Black)
- Used for: all UI text, headings, labels, body copy

### Monospace: JetBrains Mono
- Source: Google Fonts (https://fonts.google.com/specimen/JetBrains+Mono)
- Weights used: 500, 600
- Used for: scores, money amounts, join codes, any tabular/numeric data

---

## Type Scale

| Use Case | Size | Weight | Notes |
|----------|------|--------|-------|
| Hero / Billboard | 48px | 900 (Black) | Marketing headlines |
| Page Title | 36px | 900 (Black) | In-app screen titles |
| Section Header | 30px | 700–800 | In-app sections |
| Card Title | 22px | 900 (Black) | Round/course names |
| Body Large | 17px | 600 | Player names, key info |
| Body Default | 15px | 600 | Standard UI text |
| Body Small | 13px | 600 | Secondary card text |
| Caption | 12px | 600 | Meta info, timestamps |
| Label | 11px | 700, UPPERCASE | Section labels, tracking 0.08em |
| Micro | 9–10px | 700–900, UPPERCASE | Nav labels, PRO badge |

---

## Key Typographic Treatments

### Screen Titles (in-app)
```
Size: 22px
Weight: 900 (Black)
Tracking: -0.04em (tight)
Color: #0A0A0A
```

### Section Labels
```
Size: 11px
Weight: 700 (Bold)
Transform: UPPERCASE
Tracking: 0.08–0.18em (wide)
Color: #787878 (muted)
```

### PRO Badge
```
Size: 9px
Weight: 900 (Black)
Transform: UPPERCASE
Tracking: 0.1em
Background: #0A0A0A
Color: #F0EE3A
Border radius: 6–8px
Padding: 2px 6px
```

### Score Numbers
```
Font: JetBrains Mono
Size: 20–24px
Weight: 600
Feature: tabular-nums (for alignment)
```

### Money Amounts
```
Font: JetBrains Mono
Weight: 600
Positive: #1B7832 (green)
Negative: #EF4444 (red)
Neutral: #0A0A0A
```

---

## Marketing Typography Rules
- Headlines: Inter Black (900), tight tracking (-0.02 to -0.04em), near-black on off-white or white on near-black
- Never use italic
- Never use font weights below 500 in marketing materials
- Numbers (scores, money) should always use JetBrains Mono for authenticity
- All-caps labels should have wide letter-spacing (0.08em+)
