import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { brand } from './brand';

// 5-second launch announcement. Logo drop → "NOW LIVE" stinger → CTA.

export const Launch: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Icon drop + bounce
  const iconSpring = spring({ frame, fps, config: { damping: 8, stiffness: 100, mass: 0.9 } });
  const iconY = interpolate(iconSpring, [0, 1], [-600, 0]);
  const iconRot = interpolate(iconSpring, [0, 1], [-12, 0]);

  // Flash on land
  const flash = interpolate(frame, [16, 22, 30], [0, 0.8, 0], { extrapolateRight: 'clamp' });

  // "NOW LIVE" stinger
  const stingerIn = spring({ frame: frame - 22, fps, config: { damping: 10, stiffness: 180 } });
  const stingerScale = interpolate(stingerIn, [0, 1], [0.6, 1]);
  const stingerO = interpolate(frame, [22, 30], [0, 1], { extrapolateRight: 'clamp' });

  // Wordmark slide up
  const wordIn = spring({ frame: frame - 40, fps, config: { damping: 14 } });
  const wordY = interpolate(wordIn, [0, 1], [40, 0]);
  const wordO = interpolate(frame, [40, 54], [0, 1], { extrapolateRight: 'clamp' });

  // Tagline
  const taglineO = interpolate(frame, [58, 72], [0, 1], { extrapolateRight: 'clamp' });

  // CTA
  const ctaIn = spring({ frame: frame - 78, fps, config: { damping: 12 } });
  const ctaY = interpolate(ctaIn, [0, 1], [60, 0]);
  const ctaO = interpolate(frame, [78, 92], [0, 1], { extrapolateRight: 'clamp' });

  // Background pulse
  const bgPulse = interpolate(
    Math.sin((frame / fps) * 2.5),
    [-1, 1],
    [0.15, 0.35]
  );

  return (
    <AbsoluteFill
      style={{
        background: brand.bg,
        fontFamily: brand.fontFamily,
        overflow: 'hidden',
      }}
    >
      {/* Ambient gold glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 45%, rgba(235,228,34,${bgPulse}) 0%, transparent 55%)`,
        }}
      />

      {/* Flash overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: brand.gold,
          opacity: flash,
          mixBlendMode: 'screen',
        }}
      />

      {/* Icon */}
      <div
        style={{
          position: 'absolute',
          top: 380,
          left: '50%',
          transform: `translateX(-50%) translateY(${iconY}px) rotate(${iconRot}deg)`,
          width: 340,
          height: 340,
          borderRadius: 76,
          overflow: 'hidden',
          boxShadow: '0 40px 120px rgba(235,228,34,0.35), 0 0 0 3px rgba(235,228,34,0.2)',
        }}
      >
        <Img src={staticFile('app-icon.png')} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* NOW LIVE stinger */}
      <div
        style={{
          position: 'absolute',
          top: 240,
          left: '50%',
          transform: `translateX(-50%) scale(${stingerScale})`,
          opacity: stingerO,
          padding: '14px 36px',
          background: brand.gold,
          color: brand.ink,
          fontSize: 34,
          fontWeight: 900,
          letterSpacing: 4,
          borderRadius: 8,
        }}
      >
        NOW LIVE
      </div>

      {/* Wordmark */}
      <div
        style={{
          position: 'absolute',
          top: 820,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: wordO,
          transform: `translateY(${wordY}px)`,
        }}
      >
        <div
          style={{
            color: brand.text,
            fontSize: 140,
            fontWeight: 900,
            letterSpacing: -5,
            lineHeight: 1,
          }}
        >
          MATCH
        </div>
        <div
          style={{
            color: brand.gold,
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: 12,
            textTransform: 'uppercase',
            marginTop: 8,
          }}
        >
          Golf
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          position: 'absolute',
          top: 1130,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: taglineO,
          color: brand.textMuted,
          fontSize: 38,
          fontWeight: 500,
          letterSpacing: -0.5,
        }}
      >
        Score the round. Settle the bets.
      </div>

      {/* CTA */}
      <div
        style={{
          position: 'absolute',
          bottom: 280,
          left: '50%',
          transform: `translateX(-50%) translateY(${ctaY}px)`,
          opacity: ctaO,
          padding: '32px 64px',
          borderRadius: 999,
          background: brand.gold,
          color: brand.ink,
          fontSize: 42,
          fontWeight: 800,
          letterSpacing: -0.5,
          boxShadow: '0 20px 60px rgba(235,228,34,0.3)',
        }}
      >
        Get it on the App Store
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 210,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: ctaO,
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
