import React from 'react';
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';

const { fontFamily: sans } = loadInter();

const INK = '#0A0A0A';
const BG = '#F5F5F0';
const GOLD = '#F0EE3A';
const WHITE = '#FFFFFF';
const MUTED = '#787878';

const clamp = (f: number, r: [number, number], o: [number, number]) =>
  interpolate(f, r, o, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// Vertical clip scene — natural audio preserved, clean overlay
const ClipScene: React.FC<{
  src: string;
  durationFrames: number;
  startFrom?: number;
  word: string;
  accent?: boolean;
  objectPosition?: string;
}> = ({ src, durationFrames, startFrom = 0, word, accent, objectPosition = 'center center' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const kenScale = interpolate(frame, [0, durationFrames], [1.06, 1.12], {
    extrapolateRight: 'clamp',
  });
  const fadeIn = clamp(frame, [0, 4], [0, 1]);
  const fadeOut = clamp(frame, [durationFrames - 5, durationFrames], [1, 0]);
  const sceneOpacity = Math.min(fadeIn, fadeOut);

  const wP = spring({
    frame: frame - 4,
    fps,
    config: { damping: 14, stiffness: 200, mass: 0.6 },
  });
  const wordY = interpolate(wP, [0, 1], [24, 0]);
  const wordOp = clamp(frame, [4, 12], [0, 1]);

  const ruleW = clamp(frame, [10, 22], [0, 100]);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: sceneOpacity }}>
      <AbsoluteFill
        style={{
          transform: `scale(${kenScale})`,
          transformOrigin: 'center center',
        }}
      >
        <OffthreadVideo
          src={staticFile(src)}
          startFrom={startFrom}
          volume={0.7}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition }}
        />
      </AbsoluteFill>

      {/* Subtle bottom darken for text */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 25%, rgba(0,0,0,0) 50%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 200,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: wordOp,
        }}
      >
        <div
          style={{
            width: ruleW,
            height: 3,
            backgroundColor: GOLD,
            margin: '0 auto 24px',
          }}
        />
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 112,
            letterSpacing: '-0.045em',
            lineHeight: 0.95,
            color: accent ? GOLD : WHITE,
            transform: `translateY(${wordY}px)`,
            textShadow: '0 4px 26px rgba(0,0,0,0.5)',
            whiteSpace: 'pre-line',
          }}
        >
          {word}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Bar opener — simpler vertical version of v2's BarOpener
const BarOpener: React.FC<{
  line1: string;
  line2: string;
  durationFrames: number;
}> = ({ line1, line2, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const barW = clamp(frame, [0, 14], [0, 560]);
  const p1 = spring({ frame: frame - 4, fps, config: { damping: 14, stiffness: 200 } });
  const p2 = spring({ frame: frame - 12, fps, config: { damping: 14, stiffness: 200 } });
  const y1 = interpolate(p1, [0, 1], [24, 0]);
  const y2 = interpolate(p2, [0, 1], [24, 0]);
  const op1 = clamp(frame, [4, 14], [0, 1]);
  const op2 = clamp(frame, [12, 22], [0, 1]);
  const fadeOut = clamp(frame, [durationFrames - 6, durationFrames], [1, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: INK,
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingLeft: 80,
        paddingRight: 80,
        opacity: fadeOut,
      }}
    >
      <div>
        <div
          style={{
            width: barW,
            height: 12,
            backgroundColor: GOLD,
            marginBottom: 32,
          }}
        />
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 138,
            letterSpacing: '-0.05em',
            lineHeight: 0.9,
            color: WHITE,
            transform: `translateY(${y1}px)`,
            opacity: op1,
          }}
        >
          {line1}
        </div>
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 138,
            letterSpacing: '-0.05em',
            lineHeight: 0.9,
            color: GOLD,
            transform: `translateY(${y2}px)`,
            opacity: op2,
            marginTop: 8,
          }}
        >
          {line2}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Malbon outro — minimal cream bg, centered MATCH, hairline rule
const OutroMalbon: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p = spring({ frame, fps, config: { damping: 20, stiffness: 120, mass: 0.8 } });
  const scale = interpolate(p, [0, 1], [0.96, 1]);
  const logoOp = clamp(frame, [2, 16], [0, 1]);
  const ruleW = clamp(frame, [16, 34], [0, 110]);
  const taglineOp = clamp(frame, [24, 36], [0, 1]);
  const fadeOut = clamp(frame, [durationFrames - 10, durationFrames], [1, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeOut,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 200,
            letterSpacing: '-0.055em',
            lineHeight: 1,
            color: INK,
            opacity: logoOp,
            transform: `scale(${scale})`,
            display: 'inline-block',
          }}
        >
          MATCH
        </div>
        <div
          style={{
            width: ruleW,
            height: 2,
            backgroundColor: INK,
            margin: '40px auto 0',
          }}
        />
        <div
          style={{
            marginTop: 40,
            fontFamily: sans,
            fontWeight: 600,
            fontSize: 16,
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            color: MUTED,
            opacity: taglineOp,
          }}
        >
          Score · Bet · Settle Up
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// 10s TikTok / Reels cut — v2 clips (letterbox-removed, natural audio)
// 1080x1920, 30fps, 300 frames
// ============================================================================
// 0    30f  1.0s  HOOK         "FROM THE TEE / TO THE TAB."
// 30   38f  1.27s CLIP 01      "LIVE."
// 68   38f  1.27s CLIP 02      "REAL TIME."
// 106  38f  1.27s CLIP 03      "SIX FORMATS."
// 144  38f  1.27s CLIP 04      "YOUR GAME." (gold)
// 182  38f  1.27s CLIP 05      "NO MATH."
// 220  38f  1.27s CLIP 06      "JUST PLAY." (gold)
// 258  42f  1.4s  OUTRO        Malbon cream
// TOTAL: 300 frames = 10.0s

export const LAUNCH_SHORT_V2_DURATION = 300;

export const LaunchShortV2: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Audio src={staticFile('launch-clips-v2/sfx-short.mp3')} />

      <Sequence from={0} durationInFrames={30}>
        <BarOpener line1="FROM THE TEE" line2="TO THE TAB." durationFrames={30} />
      </Sequence>

      <Sequence from={30} durationInFrames={38}>
        <ClipScene src="launch-clips-v2/clip-01.mp4" durationFrames={38} startFrom={12} word="LIVE." />
      </Sequence>

      <Sequence from={68} durationInFrames={38}>
        <ClipScene src="launch-clips-v2/clip-02.mp4" durationFrames={38} startFrom={12} word="REAL TIME." />
      </Sequence>

      <Sequence from={106} durationInFrames={38}>
        <ClipScene src="launch-clips-v2/clip-03.mp4" durationFrames={38} startFrom={12} word="SIX FORMATS." />
      </Sequence>

      <Sequence from={144} durationInFrames={38}>
        <ClipScene src="launch-clips-v2/clip-04.mp4" durationFrames={38} startFrom={12} word="YOUR GAME." accent />
      </Sequence>

      <Sequence from={182} durationInFrames={38}>
        <ClipScene src="launch-clips-v2/clip-05.mp4" durationFrames={38} startFrom={12} word="NO MATH." />
      </Sequence>

      <Sequence from={220} durationInFrames={38}>
        <ClipScene src="launch-clips-v2/clip-06.mp4" durationFrames={38} startFrom={12} word="JUST PLAY." accent objectPosition="25% center" />
      </Sequence>

      <Sequence from={258} durationInFrames={42}>
        <OutroMalbon durationFrames={42} />
      </Sequence>
    </AbsoluteFill>
  );
};
