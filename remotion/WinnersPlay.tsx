import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { brand } from './brand';

// Video 01 — "Winners Play on MATCH" (v2)
// 8.0s @ 30fps = 240 frames, 1080x1920
// No app icon. Pure typography + screenshots. Crisp flex-centered layouts.
//
// Beat map:
//   0-18    (0.6s) Cold open — "GOLF."
//   18-54   (1.2s) "Isn't just a game."
//   54-108  (1.8s) Scorecard rise — "It's a bet."
//   108-124 (0.53s) Quick cut — money
//   124-140 (0.53s) Quick cut — leaderboard
//   140-156 (0.53s) Quick cut — settlement
//   156-204 (1.6s) "Winners play on MATCH."
//   204-240 (1.2s) CTA pill + URL

const FONT = brand.fontFamily;

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pct = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 6,
        width: `${pct}%`,
        background: brand.gold,
        zIndex: 100,
      }}
    />
  );
};

const Stage: React.FC<{ children: React.ReactNode; gradient?: boolean }> = ({
  children,
  gradient,
}) => (
  <AbsoluteFill
    style={{
      background: gradient
        ? `radial-gradient(circle at 50% 50%, ${brand.goldMuted} 0%, ${brand.bg} 70%)`
        : brand.bg,
      fontFamily: FONT,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 96,
    }}
  >
    {children}
  </AbsoluteFill>
);

const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inSpring = spring({ frame, fps, config: { damping: 10, stiffness: 200 } });
  const scale = interpolate(inSpring, [0, 1], [1.4, 1]);
  const o = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <Stage>
      <div
        style={{
          transform: `scale(${scale})`,
          opacity: o,
          color: brand.text,
          fontSize: 220,
          fontWeight: 900,
          letterSpacing: -10,
          lineHeight: 1,
        }}
      >
        GOLF.
      </div>
    </Stage>
  );
};

const LineTwo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inSpring = spring({ frame, fps, config: { damping: 16 } });
  const y = interpolate(inSpring, [0, 1], [24, 0]);
  const o = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <Stage>
      <div
        style={{
          transform: `translateY(${y}px)`,
          opacity: o,
          color: brand.text,
          fontSize: 132,
          fontWeight: 900,
          letterSpacing: -5,
          lineHeight: 0.95,
          textAlign: 'center',
        }}
      >
        Isn't just
        <br />
        a game.
      </div>
    </Stage>
  );
};

const BetReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const textIn = spring({ frame, fps, config: { damping: 14 } });
  const textY = interpolate(textIn, [0, 1], [20, 0]);
  const textO = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  const phoneSpring = spring({ frame: frame - 6, fps, config: { damping: 18, stiffness: 120 } });
  const phoneY = interpolate(phoneSpring, [0, 1], [180, 0]);
  const phoneO = interpolate(frame, [6, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: brand.bg, fontFamily: FONT }}>
      <div
        style={{
          position: 'absolute',
          top: 240,
          left: 0,
          right: 0,
          textAlign: 'center',
          transform: `translateY(${textY}px)`,
          opacity: textO,
          color: brand.text,
          fontSize: 148,
          fontWeight: 900,
          letterSpacing: -6,
          lineHeight: 0.9,
        }}
      >
        It's <span style={{ color: brand.gold }}>a bet.</span>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: -160,
          left: '50%',
          transform: `translateX(-50%) translateY(${phoneY}px)`,
          opacity: phoneO,
          width: 600,
          height: 1240,
          borderRadius: 72,
          background: brand.bgElevated,
          border: `10px solid #222`,
          boxShadow: '0 60px 160px rgba(0,0,0,0.8), 0 0 0 2px rgba(235,228,34,0.12)',
          overflow: 'hidden',
        }}
      >
        <Img
          src={staticFile('screens/scorecard.png')}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    </AbsoluteFill>
  );
};

const QuickCut: React.FC<{ screen: string; label: string }> = ({ screen, label }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 3, 13, 16], [0, 1, 1, 0.92], { extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [0, 16], [1.03, 1.0]);

  return (
    <AbsoluteFill
      style={{
        background: brand.bg,
        fontFamily: FONT,
        opacity: o,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          marginTop: 220,
          color: brand.gold,
          fontSize: 56,
          fontWeight: 900,
          letterSpacing: 4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 60,
          width: 620,
          height: 1280,
          transform: `scale(${scale})`,
          borderRadius: 74,
          background: brand.bgElevated,
          border: `10px solid #222`,
          boxShadow: '0 60px 160px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
      >
        <Img
          src={staticFile(`screens/${screen}`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    </AbsoluteFill>
  );
};

const Wordmark: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line1 = spring({ frame, fps, config: { damping: 14 } });
  const line1Y = interpolate(line1, [0, 1], [40, 0]);
  const line1O = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

  const line2 = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const line2Y = interpolate(line2, [0, 1], [40, 0]);
  const line2O = interpolate(frame, [8, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <Stage gradient>
      <div
        style={{
          transform: `translateY(${line1Y}px)`,
          opacity: line1O,
          color: brand.text,
          fontSize: 118,
          fontWeight: 900,
          letterSpacing: -4,
          lineHeight: 1,
          textAlign: 'center',
        }}
      >
        Winners play
      </div>
      <div
        style={{
          marginTop: 20,
          transform: `translateY(${line2Y}px)`,
          opacity: line2O,
          color: brand.gold,
          fontSize: 220,
          fontWeight: 900,
          letterSpacing: -10,
          lineHeight: 1,
          textAlign: 'center',
        }}
      >
        MATCH.
      </div>
    </Stage>
  );
};

const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pillSpring = spring({ frame, fps, config: { damping: 12, stiffness: 140 } });
  const pillScale = interpolate(pillSpring, [0, 1], [0.8, 1]);
  const pillO = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const urlO = interpolate(frame, [8, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <Stage>
      <div
        style={{
          transform: `scale(${pillScale})`,
          opacity: pillO,
          padding: '38px 76px',
          borderRadius: 999,
          background: brand.gold,
          color: brand.ink,
          fontSize: 58,
          fontWeight: 900,
          letterSpacing: -1,
        }}
      >
        Download free
      </div>
      <div
        style={{
          marginTop: 44,
          opacity: urlO,
          color: brand.textMuted,
          fontSize: 42,
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}
      >
        matchgolf.app
      </div>
    </Stage>
  );
};

export const WinnersPlay: React.FC = () => {
  return (
    <>
      <Sequence from={0} durationInFrames={18}>
        <ColdOpen />
      </Sequence>
      <Sequence from={18} durationInFrames={36}>
        <LineTwo />
      </Sequence>
      <Sequence from={54} durationInFrames={54}>
        <BetReveal />
      </Sequence>
      <Sequence from={108} durationInFrames={16}>
        <QuickCut screen="money.png" label="Track" />
      </Sequence>
      <Sequence from={124} durationInFrames={16}>
        <QuickCut screen="leaderboard.png" label="Every game" />
      </Sequence>
      <Sequence from={140} durationInFrames={16}>
        <QuickCut screen="settlement.png" label="Every dollar" />
      </Sequence>
      <Sequence from={156} durationInFrames={48}>
        <Wordmark />
      </Sequence>
      <Sequence from={204} durationInFrames={36}>
        <CTA />
      </Sequence>
      <ProgressBar />
    </>
  );
};
