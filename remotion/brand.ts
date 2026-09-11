// MATCH Golf brand tokens — mirrors src/index.css (light theme, Direction B).
// Near-black primary, warm off-white background, chartreuse gold accent,
// Inter throughout (no serif). Used by all Remotion compositions.
export const brand = {
  // Backgrounds
  bg: '#f7f7f5',            // warm off-white (60 5% 97%)
  bgElevated: '#ffffff',
  card: '#ffffff',
  cardSubtle: '#f1f1ee',    // 60 5% 94% — hover/inset

  // Ink / text
  ink: '#0a0a0a',           // near-black primary
  text: '#0a0a0a',
  textMuted: '#787878',     // 0 0% 47%

  // Accent (use sparingly)
  gold: '#ebe422',          // 59 86% 57%
  goldDeep: '#d4cd00',
  goldMuted: '#fbf9d1',     // 59 80% 94% — soft background
  goldBorder: '#e5dd00',

  // Semantic
  success: '#148f44',       // 142 72% 29%

  // Borders
  border: '#e2e2dd',        // 60 5% 88%
  borderStrong: '#c4c4bd',  // 60 5% 76%

  // Fonts — Inter only, JetBrains Mono for tabular data
  fontSans:
    'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
  fontMono: '"JetBrains Mono", "SF Mono", Menlo, monospace',
} as const;
