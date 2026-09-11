import { AbsoluteFill, Sequence } from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { brand } from './brand';
import type { GameData, RuleSlide } from './gamesData';
import { getGame } from './gamesData';

const { fontFamily: sans } = loadInter();
const { fontFamily: mono } = loadMono();

// Light-theme carousel template — matches the in-app design system
// (warm off-white bg, near-black ink, chartreuse accent, Inter throughout).
// 1080×1350 · 6 slides × 30 frames = 180 frames.

const SLIDE_FRAMES = 30;

const coverFontSize = (name: string) => {
  const len = name.length;
  if (len <= 5) return 340;
  if (len <= 6) return 300;
  if (len <= 7) return 260;
  if (len <= 8) return 230;
  if (len <= 9) return 210;
  return 190;
};

const bigWordFontSize = (word: string) => {
  const len = word.length;
  if (len <= 6) return 180;
  if (len <= 8) return 150;
  if (len <= 10) return 125;
  if (len <= 12) return 105;
  return 90;
};

const renderEmphasis = (line: string) => {
  const parts = line.split(/(_[^_]+_)/g);
  return parts.map((p, i) => {
    if (p.startsWith('_') && p.endsWith('_')) {
      return (
        <span key={i} style={{ color: brand.ink, fontWeight: 900 }}>
          {p.slice(1, -1)}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
};

const Label: React.FC<{ children: React.ReactNode; gold?: boolean }> = ({
  children,
  gold,
}) => (
  <div
    style={{
      fontFamily: sans,
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: 3,
      textTransform: 'uppercase',
      color: gold ? brand.goldDeep : brand.textMuted,
    }}
  >
    {children}
  </div>
);

const Page: React.FC<{
  index: number;
  children: React.ReactNode;
  cream?: boolean;
}> = ({ index, children, cream }) => (
  <AbsoluteFill
    style={{
      background: cream ? brand.bg : brand.bgElevated,
      fontFamily: sans,
      padding: '80px 72px',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {/* Header strip: wordmark + page count */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 24,
        borderBottom: `2px solid ${brand.ink}`,
      }}
    >
      <div
        style={{
          fontSize: 26,
          fontWeight: 900,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: brand.ink,
        }}
      >
        MATCH
        <span style={{ color: brand.goldDeep }}> · </span>
        GOLF
      </div>
      <div
        style={{
          fontFamily: mono,
          fontSize: 22,
          fontWeight: 700,
          color: brand.textMuted,
        }}
      >
        {String(index).padStart(2, '0')} / 06
      </div>
    </div>

    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>

    {/* Footer: MATCH wordmark */}
    <div
      style={{
        paddingTop: 20,
        borderTop: `2px solid ${brand.ink}`,
        color: brand.ink,
        fontSize: 22,
        fontWeight: 900,
        letterSpacing: 4,
        textTransform: 'uppercase',
        textAlign: 'center',
      }}
    >
      MATCH
    </div>
  </AbsoluteFill>
);

const CoverSlide: React.FC<{ game: GameData }> = ({ game }) => (
  <Page index={1} cream>
    <div style={{ textAlign: 'center' }}>
      <Label gold>{game.cover.kicker}</Label>
    </div>
    <div
      style={{
        color: brand.ink,
        fontFamily: sans,
        fontSize: coverFontSize(game.cover.bigName),
        fontWeight: 900,
        textAlign: 'center',
        letterSpacing: -8,
        lineHeight: 0.9,
        marginTop: 40,
      }}
    >
      {game.cover.bigName}
    </div>
    <div
      style={{
        marginTop: 36,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: brand.gold,
          color: brand.ink,
          padding: '18px 40px',
          borderRadius: 999,
          fontSize: 32,
          fontWeight: 900,
          letterSpacing: -0.3,
          border: `3px solid ${brand.ink}`,
        }}
      >
        {game.cover.tagline}
      </div>
    </div>
    <div
      style={{
        marginTop: 72,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        color: brand.textMuted,
        fontSize: 24,
        fontWeight: 700,
        letterSpacing: 3,
        textTransform: 'uppercase',
      }}
    >
      <span style={{ fontSize: 30 }}>←</span>
      <span>Swipe</span>
      <span style={{ fontSize: 30 }}>→</span>
    </div>
  </Page>
);

const HookSlide: React.FC<{ game: GameData }> = ({ game }) => (
  <Page index={2}>
    <div style={{ textAlign: 'center' }}>
      <Label>The hook</Label>
    </div>
    <div
      style={{
        marginTop: 36,
        color: brand.textMuted,
        fontFamily: sans,
        fontSize: 42,
        fontWeight: 500,
        textAlign: 'center',
        lineHeight: 1.25,
      }}
    >
      {game.hook.leadItalic}
    </div>
    <div
      style={{
        marginTop: 28,
        color: brand.ink,
        fontFamily: sans,
        fontSize: 74,
        fontWeight: 800,
        textAlign: 'center',
        letterSpacing: -2,
        lineHeight: 1,
      }}
    >
      {game.hook.midText}
    </div>
    <div
      style={{
        marginTop: 6,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          padding: '18px 40px',
          background: brand.gold,
          color: brand.ink,
          fontSize: bigWordFontSize(game.hook.bigWord),
          fontWeight: 900,
          letterSpacing: -4,
          lineHeight: 1,
          borderRadius: 16,
          border: `4px solid ${brand.ink}`,
          whiteSpace: 'nowrap',
        }}
      >
        {game.hook.bigWord}
      </div>
    </div>
    <div
      style={{
        marginTop: 56,
        display: 'flex',
        justifyContent: 'center',
        gap: 14,
        flexWrap: 'wrap',
      }}
    >
      {game.hook.pills.map((b) => (
        <div
          key={b}
          style={{
            padding: '14px 26px',
            borderRadius: 999,
            background: brand.bgElevated,
            border: `2px solid ${brand.ink}`,
            color: brand.ink,
            fontSize: 24,
            fontWeight: 800,
          }}
        >
          {b}
        </div>
      ))}
    </div>
  </Page>
);

const RuleSlideView: React.FC<{ index: number; rule: RuleSlide }> = ({
  index,
  rule,
}) => {
  const [line1, line2] = rule.titleLines;
  const titleSize = line2 ? 128 : 160;
  return (
    <Page index={index}>
      <div style={{ textAlign: 'center' }}>
        <Label gold>{rule.kicker}</Label>
      </div>
      <div
        style={{
          marginTop: 28,
          color: brand.ink,
          fontFamily: sans,
          fontSize: titleSize,
          fontWeight: 900,
          textAlign: 'center',
          letterSpacing: -5,
          lineHeight: 0.9,
        }}
      >
        {line1}
        {line2 && (
          <>
            <br />
            {line2}
          </>
        )}
      </div>

      {rule.italicText && (
        <div
          style={{
            marginTop: 40,
            color: brand.textMuted,
            fontSize: 34,
            fontWeight: 500,
            textAlign: 'center',
            lineHeight: 1.35,
            whiteSpace: 'pre-line',
          }}
        >
          {rule.italicText}
        </div>
      )}

      {rule.exampleCard && (
        <div
          style={{
            marginTop: 44,
            padding: '36px 44px',
            borderRadius: 20,
            background: brand.bgElevated,
            border: `3px solid ${brand.ink}`,
          }}
        >
          <Label>{rule.exampleCard.label}</Label>
          <div
            style={{
              marginTop: 16,
              color: brand.ink,
              fontSize: 32,
              lineHeight: 1.35,
              fontWeight: 600,
            }}
          >
            {rule.exampleCard.lines.map((l, i) => (
              <div key={i}>{renderEmphasis(l)}</div>
            ))}
          </div>
        </div>
      )}

      {rule.goldCallout && (
        <div
          style={{
            marginTop: 40,
            padding: '28px 36px',
            borderRadius: 20,
            background: brand.gold,
            border: `3px solid ${brand.ink}`,
            color: brand.ink,
            fontSize: 34,
            fontWeight: 900,
            textAlign: 'center',
            letterSpacing: -0.5,
          }}
        >
          {rule.goldCallout}
        </div>
      )}

      {rule.sidebarCard && (
        <div
          style={{
            marginTop: 40,
            padding: '30px 40px',
            borderRadius: 20,
            background: brand.goldMuted,
            border: `3px solid ${brand.ink}`,
            textAlign: 'center',
          }}
        >
          <Label gold>{rule.sidebarCard.label}</Label>
          <div
            style={{
              marginTop: 12,
              color: brand.ink,
              fontSize: 30,
              fontWeight: 600,
              lineHeight: 1.35,
            }}
          >
            {rule.sidebarCard.lines.map((l, i) => (
              <div key={i}>{renderEmphasis(l)}</div>
            ))}
          </div>
        </div>
      )}
    </Page>
  );
};

const CtaSlide: React.FC = () => (
  <Page index={6} cream>
    <div style={{ textAlign: 'center' }}>
      <Label>Or just...</Label>
    </div>
    <div
      style={{
        marginTop: 30,
        color: brand.ink,
        fontFamily: sans,
        fontSize: 200,
        fontWeight: 900,
        textAlign: 'center',
        letterSpacing: -8,
        lineHeight: 0.88,
      }}
    >
      Let the
      <br />
      app
      <br />
      <span
        style={{
          background: brand.gold,
          padding: '0 28px',
          borderRadius: 16,
          border: `4px solid ${brand.ink}`,
          display: 'inline-block',
          marginTop: 8,
        }}
      >
        run it.
      </span>
    </div>
    <div style={{ marginTop: 72, display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          padding: '30px 64px',
          borderRadius: 999,
          background: brand.ink,
          color: brand.bgElevated,
          fontSize: 46,
          fontWeight: 900,
          letterSpacing: -0.5,
        }}
      >
        Download Today
      </div>
    </div>
  </Page>
);

export const GameCarousel: React.FC<{ gameId: string }> = ({ gameId }) => {
  const game = getGame(gameId);
  return (
    <>
      <Sequence from={0} durationInFrames={SLIDE_FRAMES}>
        <CoverSlide game={game} />
      </Sequence>
      <Sequence from={30} durationInFrames={SLIDE_FRAMES}>
        <HookSlide game={game} />
      </Sequence>
      <Sequence from={60} durationInFrames={SLIDE_FRAMES}>
        <RuleSlideView index={3} rule={game.rules[0]} />
      </Sequence>
      <Sequence from={90} durationInFrames={SLIDE_FRAMES}>
        <RuleSlideView index={4} rule={game.rules[1]} />
      </Sequence>
      <Sequence from={120} durationInFrames={SLIDE_FRAMES}>
        <RuleSlideView index={5} rule={game.rules[2]} />
      </Sequence>
      <Sequence from={150} durationInFrames={SLIDE_FRAMES}>
        <CtaSlide />
      </Sequence>
    </>
  );
};
