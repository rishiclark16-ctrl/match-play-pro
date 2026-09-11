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

// 6-second feature-rotation promo: hook → 3 value props → CTA
// Drop phone screenshots in public/screens/ as:
//   scorecard.png, leaderboard.png, settlement.png (1170×2532 or similar).
// If missing, slots render a placeholder card.

const FEATURES: { label: string; sub: string; screen: string }[] = [
  { label: 'Score live.', sub: 'Real-time multiplayer scorecards.', screen: 'scorecard.png' },
  { label: 'Track every bet.', sub: 'Nassau, skins, wolf, stableford + more.', screen: 'leaderboard.png' },
  { label: 'Settle instantly.', sub: 'We do the math. You collect.', screen: 'settlement.png' },
];

const PhoneFrame: React.FC<{ screen: string; delay: number }> = ({ screen, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delay;
  const rise = spring({ frame: local, fps, config: { damping: 14, stiffness: 90 } });
  const y = interpolate(rise, [0, 1], [60, 0]);
  const o = interpolate(local, [0, 14], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        width: 540,
        height: 1120,
        borderRadius: 62,
        background: brand.bgElevated,
        border: `8px solid #2a2a2a`,
        boxShadow: '0 40px 120px rgba(0,0,0,0.6), 0 0 0 2px rgba(235,228,34,0.08)',
        overflow: 'hidden',
        transform: `translateY(${y}px)`,
        opacity: o,
        position: 'relative',
      }}
    >
      <Img
        src={staticFile(`screens/${screen}`)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={(e) => {
          // If missing, swap for placeholder background
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: brand.textMuted,
          fontSize: 28,
          fontFamily: brand.fontFamily,
          background: brand.card,
          zIndex: -1,
        }}
      >
        screens/{screen}
      </div>
    </div>
  );
};

const FeatureSlide: React.FC<{
  label: string;
  sub: string;
  screen: string;
  index: number;
}> = ({ label, sub, screen, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labelIn = spring({ frame: frame - 6, fps, config: { damping: 16 } });
  const labelY = interpolate(labelIn, [0, 1], [30, 0]);
  const labelO = interpolate(frame, [6, 18], [0, 1], { extrapolateRight: 'clamp' });
  const subO = interpolate(frame, [14, 26], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: brand.bg,
        fontFamily: brand.fontFamily,
        padding: '80px 60px',
      }}
    >
      {/* Index pill */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          right: 60,
          padding: '10px 22px',
          borderRadius: 999,
          background: brand.goldMuted,
          color: brand.gold,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 1.5,
        }}
      >
        0{index + 1} / 03
      </div>

      <div style={{ position: 'absolute', left: 60, top: 220, right: 60 }}>
        <div
          style={{
            transform: `translateY(${labelY}px)`,
            opacity: labelO,
            color: brand.text,
            fontSize: 104,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.02,
          }}
        >
          {label}
        </div>
        <div
          style={{
            opacity: subO,
            color: brand.textMuted,
            fontSize: 36,
            fontWeight: 500,
            marginTop: 20,
            lineHeight: 1.3,
          }}
        >
          {sub}
        </div>
      </div>

      {/* Phone mockup */}
      <div
        style={{
          position: 'absolute',
          bottom: -120,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <PhoneFrame screen={screen} delay={10} />
      </div>
    </AbsoluteFill>
  );
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const iconScale = spring({ frame, fps, config: { damping: 10, stiffness: 120 } });
  const wordmarkO = interpolate(frame, [14, 28], [0, 1], { extrapolateRight: 'clamp' });
  const wordmarkY = interpolate(frame, [14, 28], [20, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: brand.bg,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: brand.fontFamily,
      }}
    >
      <div
        style={{
          transform: `scale(${iconScale})`,
          width: 280,
          height: 280,
          borderRadius: 64,
          overflow: 'hidden',
          boxShadow: '0 30px 100px rgba(235,228,34,0.2)',
        }}
      >
        <Img src={staticFile('app-icon.png')} style={{ width: '100%', height: '100%' }} />
      </div>
      <div
        style={{
          marginTop: 40,
          opacity: wordmarkO,
          transform: `translateY(${wordmarkY}px)`,
          color: brand.text,
          fontSize: 92,
          fontWeight: 800,
          letterSpacing: -2,
        }}
      >
        MATCH
      </div>
      <div
        style={{
          opacity: wordmarkO,
          color: brand.gold,
          fontSize: 34,
          fontWeight: 600,
          letterSpacing: 8,
          marginTop: 4,
          textTransform: 'uppercase',
        }}
      >
        Golf
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleIn = spring({ frame, fps, config: { damping: 14 } });
  const titleY = interpolate(titleIn, [0, 1], [40, 0]);
  const ctaScale = spring({ frame: frame - 14, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 40%, ${brand.goldMuted} 0%, ${brand.bg} 60%)`,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: brand.fontFamily,
        padding: 80,
      }}
    >
      <div
        style={{
          transform: `translateY(${titleY}px)`,
          color: brand.text,
          fontSize: 110,
          fontWeight: 800,
          letterSpacing: -3,
          textAlign: 'center',
          lineHeight: 1,
        }}
      >
        Scoring,
        <br />
        <span style={{ color: brand.gold }}>settled.</span>
      </div>
      <div
        style={{
          marginTop: 80,
          transform: `scale(${ctaScale})`,
          padding: '28px 56px',
          borderRadius: 999,
          background: brand.gold,
          color: brand.ink,
          fontSize: 40,
          fontWeight: 800,
          letterSpacing: -0.5,
        }}
      >
        Download on the App Store
      </div>
      <div
        style={{
          marginTop: 24,
          color: brand.textMuted,
          fontSize: 26,
          fontWeight: 500,
        }}
      >
        matchgolf.app
      </div>
    </AbsoluteFill>
  );
};

export const AppPromo: React.FC = () => {
  // 30fps. Intro 36f, 3×44f features, Outro 42f → total 210f = 7.0s
  return (
    <>
      <Sequence from={0} durationInFrames={36}>
        <Intro />
      </Sequence>
      {FEATURES.map((f, i) => (
        <Sequence key={f.label} from={36 + i * 44} durationInFrames={44}>
          <FeatureSlide {...f} index={i} />
        </Sequence>
      ))}
      <Sequence from={36 + FEATURES.length * 44} durationInFrames={42}>
        <Outro />
      </Sequence>
    </>
  );
};
