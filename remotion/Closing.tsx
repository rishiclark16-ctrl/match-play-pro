import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { brand } from './brand';

const { fontFamily: sans } = loadInter();

// Shared closing card: drone flyover background, MATCH wordmark centered,
// CTA pill below. Used by GameSlam and NapkinVsMatch.
export const Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wordSp = spring({
    frame: frame - 4,
    fps,
    config: { damping: 14, stiffness: 200, mass: 0.8 },
  });
  const wordScale = interpolate(wordSp, [0, 1], [0.75, 1]);
  const wordOp = interpolate(frame, [4, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ctaSp = spring({
    frame: frame - 22,
    fps,
    config: { damping: 14, stiffness: 200 },
  });
  const ctaScale = interpolate(ctaSp, [0, 1], [0.85, 1]);
  const ctaOp = interpolate(frame, [22, 34], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill>
        <OffthreadVideo
          src={staticFile('videos/golf-bg-1.mp4')}
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </AbsoluteFill>
      {/* Darkening vignette for contrast */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 56,
        }}
      >
        {/* MATCH wordmark */}
        <div
          style={{
            fontFamily: sans,
            fontSize: 260,
            fontWeight: 900,
            letterSpacing: -10,
            color: '#ffffff',
            lineHeight: 0.9,
            transform: `scale(${wordScale})`,
            opacity: wordOp,
            textShadow: '0 8px 60px rgba(0,0,0,0.45)',
          }}
        >
          MATCH
        </div>

        {/* Accent underline */}
        <div
          style={{
            width: 260,
            height: 10,
            borderRadius: 999,
            background: brand.gold,
            marginTop: -30,
            opacity: wordOp,
            transform: `scaleX(${wordScale})`,
            boxShadow: `0 0 40px ${brand.gold}`,
          }}
        />

        {/* CTA pill */}
        <div
          style={{
            transform: `scale(${ctaScale})`,
            opacity: ctaOp,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 22,
            marginTop: 20,
          }}
        >
          <div
            style={{
              padding: '32px 72px',
              borderRadius: 999,
              background: brand.gold,
              color: brand.ink,
              fontFamily: sans,
              fontSize: 54,
              fontWeight: 900,
              letterSpacing: -0.5,
              border: `4px solid ${brand.ink}`,
            }}
          >
            Download Today
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
