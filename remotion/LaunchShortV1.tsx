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
const GOLD = '#F0EE3A';
const WHITE = '#FFFFFF';
const MUTED = '#787878';

const clamp = (f: number, r: [number, number], o: [number, number]) =>
  interpolate(f, r, o, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// Vertical clip scene (9:16) — clips are 16:9 so we center-crop heavily
const ClipScene: React.FC<{
  src: string;
  durationFrames: number;
  startFrom?: number;
  word: string;
  accent?: boolean;
}> = ({ src, durationFrames, startFrom = 0, word, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const kenScale = interpolate(frame, [0, durationFrames], [1.04, 1.12], {
    extrapolateRight: 'clamp',
  });
  const fadeIn = clamp(frame, [0, 4], [0, 1]);
  const fadeOut = clamp(frame, [durationFrames - 5, durationFrames], [1, 0]);
  const sceneOpacity = Math.min(fadeIn, fadeOut);

  // Word slam in
  const wP = spring({
    frame: frame - 4,
    fps,
    config: { damping: 12, stiffness: 240, mass: 0.5 },
  });
  const wordScale = interpolate(wP, [0, 0.6, 1], [0.7, 1.08, 1]);
  const wordY = interpolate(wP, [0, 1], [36, 0]);
  const wordOp = clamp(frame, [4, 12], [0, 1]);

  // Gold bar sweep above word
  const barW = clamp(frame, [8, 20], [0, 220]);

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
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          muted
        />
      </AbsoluteFill>

      {/* Darken bottom for text legibility */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.35) 28%, rgba(0,0,0,0) 55%)',
          pointerEvents: 'none',
        }}
      />

      {/* Word slam */}
      <div
        style={{
          position: 'absolute',
          bottom: 180,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: wordOp,
        }}
      >
        <div
          style={{
            width: barW,
            height: 6,
            backgroundColor: GOLD,
            margin: '0 auto 28px',
          }}
        />
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 128,
            letterSpacing: '-0.05em',
            lineHeight: 0.95,
            color: accent ? GOLD : WHITE,
            transform: `translateY(${wordY}px) scale(${wordScale})`,
            textShadow: '0 4px 30px rgba(0,0,0,0.5)',
            whiteSpace: 'pre-line',
          }}
        >
          {word}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const HookSlam: React.FC<{
  line1: string;
  line2: string;
  durationFrames: number;
}> = ({ line1, line2, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p1 = spring({ frame, fps, config: { damping: 12, stiffness: 240 } });
  const p2 = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 200 } });
  const y1 = interpolate(p1, [0, 1], [40, 0]);
  const y2 = interpolate(p2, [0, 1], [40, 0]);
  const op1 = clamp(frame, [0, 8], [0, 1]);
  const op2 = clamp(frame, [6, 14], [0, 1]);
  const barW = clamp(frame, [4, 16], [0, 260]);
  const fadeOut = clamp(frame, [durationFrames - 5, durationFrames], [1, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: INK,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeOut,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: barW,
            height: 6,
            backgroundColor: GOLD,
            margin: '0 auto 28px',
          }}
        />
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 140,
            letterSpacing: '-0.05em',
            lineHeight: 0.92,
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
            fontSize: 140,
            letterSpacing: '-0.05em',
            lineHeight: 0.92,
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

const OutroDark: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const letters = ['M', 'A', 'T', 'C', 'H'];
  const stagger = 3;
  const underlineW = clamp(frame, [20, 38], [0, 520]);
  const fadeOut = clamp(frame, [durationFrames - 8, durationFrames], [1, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: INK,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeOut,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
          {letters.map((L, i) => {
            const start = i * stagger;
            const p = spring({
              frame: frame - start,
              fps,
              config: { damping: 12, stiffness: 240, mass: 0.5 },
            });
            const scale = interpolate(p, [0, 0.6, 1], [1.6, 1.08, 1]);
            const y = interpolate(p, [0, 1], [40, 0]);
            const op = clamp(frame, [start, start + 4], [0, 1]);
            const isA = L === 'A';
            return (
              <span
                key={i}
                style={{
                  fontFamily: sans,
                  fontWeight: 900,
                  fontSize: 220,
                  letterSpacing: '-0.07em',
                  lineHeight: 0.9,
                  color: isA ? GOLD : WHITE,
                  display: 'inline-block',
                  transform: `translateY(${y}px) scale(${scale})`,
                  opacity: op,
                }}
              >
                {L}
              </span>
            );
          })}
        </div>
        <div
          style={{
            width: underlineW,
            height: 8,
            backgroundColor: GOLD,
            margin: '28px auto 0',
          }}
        />
        <div
          style={{
            marginTop: 36,
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: MUTED,
            opacity: clamp(frame, [24, 38], [0, 1]),
          }}
        >
          Score · Bet · Settle Up
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// 10s TikTok / Reels cut — v1 clips (dark/gold aesthetic)
// 1080x1920, 30fps, 300 frames
// ============================================================================
// 0    30f  1.0s  HOOK       "PLAYING FOR / something?"
// 30   45f  1.5s  CLIP 04    "SCORE."
// 75   45f  1.5s  CLIP 03    "BET."
// 120  45f  1.5s  CLIP 01    "SETTLE UP." (gold)
// 165  45f  1.5s  CLIP 02    "NO MATH."
// 210  45f  1.5s  CLIP 05    "JUST PLAY." (gold)
// 255  45f  1.5s  OUTRO      MATCH dark+gold
// TOTAL: 300 frames = 10.0s

export const LAUNCH_SHORT_V1_DURATION = 300;

export const LaunchShortV1: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Audio src={staticFile('launch-clips/sfx-short.mp3')} />

      <Sequence from={0} durationInFrames={30}>
        <HookSlam line1="PLAYING FOR" line2="something?" durationFrames={30} />
      </Sequence>

      <Sequence from={30} durationInFrames={45}>
        <ClipScene
          src="launch-clips/clip-04-cinematic.mp4"
          durationFrames={45}
          startFrom={14}
          word="SCORE."
        />
      </Sequence>

      <Sequence from={75} durationInFrames={45}>
        <ClipScene
          src="launch-clips/clip-03-dolly.mp4"
          durationFrames={45}
          startFrom={14}
          word="BET."
        />
      </Sequence>

      <Sequence from={120} durationInFrames={45}>
        <ClipScene
          src="launch-clips/clip-01-closeup.mp4"
          durationFrames={45}
          startFrom={14}
          word="SETTLE UP."
          accent
        />
      </Sequence>

      <Sequence from={165} durationInFrames={45}>
        <ClipScene
          src="launch-clips/clip-02-singlegolfer.mp4"
          durationFrames={45}
          startFrom={14}
          word="NO MATH."
        />
      </Sequence>

      <Sequence from={210} durationInFrames={45}>
        <ClipScene
          src="launch-clips/clip-05-travel.mp4"
          durationFrames={45}
          startFrom={14}
          word="JUST PLAY."
          accent
        />
      </Sequence>

      <Sequence from={255} durationInFrames={45}>
        <OutroDark durationFrames={45} />
      </Sequence>
    </AbsoluteFill>
  );
};
