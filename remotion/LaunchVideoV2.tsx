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

type OverlaySpec = {
  kicker?: string;
  headline: string;
  accent?: boolean;
  position?: 'bottom-left' | 'bottom-right' | 'top-left';
};

const clamp = (f: number, r: [number, number], o: [number, number]) =>
  interpolate(f, r, o, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// ── Clip scene with letterbox bars + natural audio ─────────────────────────
const ClipScene: React.FC<{
  src: string;
  durationFrames: number;
  startFrom?: number;
  volume?: number;
  overlay?: OverlaySpec;
  letterboxSize?: number; // px
}> = ({ src, durationFrames, startFrom = 0, volume = 1, overlay, letterboxSize = 90 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = clamp(frame, [0, 6], [0, 1]);
  const fadeOut = clamp(frame, [durationFrames - 8, durationFrames], [1, 0]);
  const sceneOpacity = Math.min(fadeIn, fadeOut);

  // Subtle pan — horizontal drift, not zoom (different from v1's Ken Burns push-in)
  const xDrift = interpolate(frame, [0, durationFrames], [-12, 12]);

  // Letterbox animates in from edges
  const barSize = clamp(frame, [0, 12], [0, letterboxSize]);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: sceneOpacity }}>
      <AbsoluteFill
        style={{
          transform: `translateX(${xDrift}px) scale(1.06)`,
          transformOrigin: 'center center',
        }}
      >
        <OffthreadVideo
          src={staticFile(src)}
          startFrom={startFrom}
          volume={volume}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>

      {/* Letterbox bars (cinematic crop) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: barSize,
          backgroundColor: INK,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: barSize,
          backgroundColor: INK,
        }}
      />

      {/* Thin gold accent line at top of bottom bar */}
      <div
        style={{
          position: 'absolute',
          bottom: barSize,
          left: 0,
          width: clamp(frame, [12, 32], [0, 1920]),
          height: 2,
          backgroundColor: GOLD,
          opacity: 0.85,
        }}
      />

      {overlay && <ClipOverlay frame={frame} fps={fps} localDuration={durationFrames} spec={overlay} letterboxSize={letterboxSize} />}
    </AbsoluteFill>
  );
};

const ClipOverlay: React.FC<{
  frame: number;
  fps: number;
  localDuration: number;
  spec: OverlaySpec;
  letterboxSize: number;
}> = ({ frame, fps, localDuration, spec, letterboxSize }) => {
  const inAt = 10;
  const outAt = localDuration - 14;
  const opacity = Math.min(
    clamp(frame, [inAt, inAt + 12], [0, 1]),
    clamp(frame, [outAt, outAt + 12], [1, 0])
  );
  const p = spring({ frame: frame - inAt, fps, config: { damping: 18, stiffness: 180 } });
  const x = interpolate(p, [0, 1], [-30, 0]);

  const pos = spec.position ?? 'bottom-left';
  const padY = letterboxSize + 32;

  const posStyle: React.CSSProperties =
    pos === 'bottom-left'
      ? { bottom: padY, left: 80, right: 80, textAlign: 'left' }
      : pos === 'bottom-right'
      ? { bottom: padY, left: 80, right: 80, textAlign: 'right' }
      : { top: padY, left: 80, right: 80, textAlign: 'left' };

  return (
    <div style={{ position: 'absolute', ...posStyle, opacity }}>
      <div style={{ transform: `translateX(${x}px)`, display: 'inline-block', textAlign: 'inherit' as React.CSSProperties['textAlign'] }}>
        {spec.kicker && (
          <div
            style={{
              fontFamily: sans,
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: GOLD,
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              justifyContent: pos === 'bottom-right' ? 'flex-end' : 'flex-start',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 36,
                height: 3,
                backgroundColor: GOLD,
              }}
            />
            {spec.kicker}
          </div>
        )}
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 82,
            letterSpacing: '-0.04em',
            lineHeight: 0.95,
            color: spec.accent ? GOLD : WHITE,
            textShadow: '0 4px 24px rgba(0,0,0,0.5)',
            whiteSpace: 'pre-line',
          }}
        >
          {spec.headline}
        </div>
      </div>
    </div>
  );
};

// ── Bar Opener — gold bar sweep + stacked title ─────────────────────────────
const BarOpener: React.FC<{
  line1: string;
  line2: string;
  durationFrames: number;
}> = ({ line1, line2, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const barW = clamp(frame, [0, 14], [0, 900]);
  const p1 = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 200 } });
  const p2 = spring({ frame: frame - 14, fps, config: { damping: 14, stiffness: 200 } });
  const y1 = interpolate(p1, [0, 1], [30, 0]);
  const y2 = interpolate(p2, [0, 1], [30, 0]);
  const op1 = clamp(frame, [6, 16], [0, 1]);
  const op2 = clamp(frame, [14, 24], [0, 1]);
  const fadeOut = clamp(frame, [durationFrames - 8, durationFrames], [1, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: INK,
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingLeft: 140,
        opacity: fadeOut,
      }}
    >
      <div>
        <div
          style={{
            width: barW,
            height: 14,
            backgroundColor: GOLD,
            marginBottom: 36,
          }}
        />
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 168,
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
            fontSize: 168,
            letterSpacing: '-0.05em',
            lineHeight: 0.9,
            color: GOLD,
            transform: `translateY(${y2}px)`,
            opacity: op2,
          }}
        >
          {line2}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Slam Light — inverted brand (off-white bg, ink text) ────────────────────
const SlamLight: React.FC<{
  text: string;
  accent?: boolean;
  durationFrames: number;
  subtext?: string;
}> = ({ text, accent, durationFrames, subtext }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p = spring({ frame, fps, config: { damping: 12, stiffness: 240, mass: 0.55 } });
  const scale = interpolate(p, [0, 0.6, 1], [0.75, 1.05, 1]);
  const y = interpolate(p, [0, 1], [38, 0]);
  const fadeIn = clamp(frame, [0, 4], [0, 1]);
  const fadeOut = clamp(frame, [durationFrames - 5, durationFrames], [1, 0]);
  const opacity = Math.min(fadeIn, fadeOut);
  const barW = clamp(frame, [4, 18], [0, 260]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: barW,
            height: 6,
            backgroundColor: INK,
            margin: '0 auto 28px',
          }}
        />
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 188,
            letterSpacing: '-0.05em',
            lineHeight: 0.9,
            color: accent ? GOLD : INK,
            transform: `translateY(${y}px) scale(${scale})`,
          }}
        >
          {text}
        </div>
        {subtext && (
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: MUTED,
              marginTop: 32,
              opacity: clamp(frame, [10, 20], [0, 1]),
            }}
          >
            {subtext}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ── Ticker — horizontal scrolling marquee on gold bar ──────────────────────
const Ticker: React.FC<{
  text: string;
  durationFrames: number;
}> = ({ text, durationFrames }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  const fadeIn = clamp(frame, [0, 6], [0, 1]);
  const fadeOut = clamp(frame, [durationFrames - 6, durationFrames], [1, 0]);
  const opacity = Math.min(fadeIn, fadeOut);

  // Repeat text to ensure continuous scroll
  const repeated = Array(6).fill(text).join('   •   ');
  // Scroll speed: ~600px/sec
  const scrollX = -frame * 20;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: INK,
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      <div
        style={{
          width: '100%',
          backgroundColor: GOLD,
          padding: '36px 0',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            whiteSpace: 'nowrap',
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 82,
            letterSpacing: '-0.02em',
            color: INK,
            transform: `translateX(${scrollX}px)`,
          }}
        >
          {repeated}
        </div>
      </div>
      {/* Upper context label */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          fontFamily: sans,
          fontWeight: 800,
          fontSize: 24,
          letterSpacing: '0.26em',
          textTransform: 'uppercase',
          color: MUTED,
        }}
      >
        Built for your group
      </div>
    </AbsoluteFill>
  );
};

// ── Split Reveal — two halves, alternating colors, word on each ────────────
const SplitReveal: React.FC<{
  left: string;
  right: string;
  durationFrames: number;
}> = ({ left, right, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Left half slides in from left, right from right, with spring
  const pL = spring({ frame, fps, config: { damping: 14, stiffness: 180 } });
  const pR = spring({ frame: frame - 6, fps, config: { damping: 14, stiffness: 180 } });

  const xL = interpolate(pL, [0, 1], [-100, 0]);
  const xR = interpolate(pR, [0, 1], [100, 0]);

  const fadeOut = clamp(frame, [durationFrames - 6, durationFrames], [1, 0]);

  return (
    <AbsoluteFill style={{ flexDirection: 'row', opacity: fadeOut }}>
      <div
        style={{
          flex: 1,
          backgroundColor: BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: 48,
          transform: `translateX(${xL}px)`,
        }}
      >
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 220,
            letterSpacing: '-0.055em',
            lineHeight: 0.9,
            color: INK,
          }}
        >
          {left}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          backgroundColor: INK,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingLeft: 48,
          transform: `translateX(${xR}px)`,
        }}
      >
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 220,
            letterSpacing: '-0.055em',
            lineHeight: 0.9,
            color: GOLD,
          }}
        >
          {right}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Outro — minimal, Malbon-esque: cream bg, centered wordmark, hairline rule
const OutroCard: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Single gentle fade + micro-scale on the wordmark
  const p = spring({ frame, fps, config: { damping: 20, stiffness: 120, mass: 0.8 } });
  const scale = interpolate(p, [0, 1], [0.96, 1]);
  const logoOp = clamp(frame, [4, 20], [0, 1]);

  // Hairline rule — slow draw after logo settles
  const ruleW = clamp(frame, [22, 46], [0, 120]);

  // Tagline fade
  const taglineOp = clamp(frame, [34, 48], [0, 1]);

  const fadeOut = clamp(frame, [durationFrames - 14, durationFrames], [1, 0]);

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
            fontSize: 240,
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
            margin: '44px auto 0',
          }}
        />

        <div
          style={{
            marginTop: 44,
            fontFamily: sans,
            fontWeight: 600,
            fontSize: 18,
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
// SEQUENCE PLAN (30fps, 1920x1080)
// ============================================================================
// 0    45f  1.5s  BAR OPENER    "FROM THE TEE" / "TO THE TAB"
// 45   105f 3.5s  CLIP 01       overlay kicker "YOUR GROUP" / "One app."
// 150  36f  1.2s  SLAM LIGHT    "LIVE." (gold on off-white)
// 186  105f 3.5s  CLIP 02       "Every score. / Every player. / Instant."
// 291  30f  1.0s  TICKER        "LIVE LEADERBOARD · JOIN WITH A CODE · REAL TIME"
// 321  105f 3.5s  CLIP 03       "They birdied 17. / You already saw it."
// 426  45f  1.5s  SPLIT REVEAL  "REAL" (light) | "PRESSURE." (ink + gold)
// 471  105f 3.5s  CLIP 04       "No waiting. / Just golf."
// 576  30f  1.0s  TICKER        "NASSAU · SKINS · WOLF · MATCH PLAY · STABLEFORD"
// 606  105f 3.5s  CLIP 05       "Six formats. / Simultaneously."
// 711  45f  1.5s  SLAM LIGHT    "YOUR GROUP'S GAME." (subtext: PLAY IT YOUR WAY)
// 756  105f 3.5s  CLIP 06       "Or build a new one."
// 861  90f  3.0s  OUTRO         MATCH + Download Today
// TOTAL: 951 frames = 31.7s
// ============================================================================

export const LAUNCH_VIDEO_V2_DURATION = 951;

export const LaunchVideoV2: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      {/* Sound design stem — bass hits, whooshes, stinger (natural clip audio preserved) */}
      <Audio src={staticFile('launch-clips-v2/sfx.mp3')} />

      {/* 0 — Bar Opener */}
      <Sequence from={0} durationInFrames={45}>
        <BarOpener line1="FROM THE TEE" line2="TO THE TAB." durationFrames={45} />
      </Sequence>

      {/* 45 — Clip 1 */}
      <Sequence from={45} durationInFrames={105}>
        <ClipScene
          src="launch-clips-v2/clip-01.mp4"
          durationFrames={105}
          startFrom={10}
          volume={0.7}
          overlay={{
            kicker: 'Your group',
            headline: 'One app.',
            position: 'bottom-left',
          }}
        />
      </Sequence>

      {/* 150 — SLAM LIGHT: LIVE. */}
      <Sequence from={150} durationInFrames={36}>
        <SlamLight text="LIVE." durationFrames={36} />
      </Sequence>

      {/* 186 — Clip 2 */}
      <Sequence from={186} durationInFrames={105}>
        <ClipScene
          src="launch-clips-v2/clip-02.mp4"
          durationFrames={105}
          startFrom={10}
          volume={0.7}
          overlay={{
            kicker: 'In real time',
            headline: 'Every score.\nEvery player.',
            position: 'bottom-left',
          }}
        />
      </Sequence>

      {/* 291 — Ticker 1 */}
      <Sequence from={291} durationInFrames={30}>
        <Ticker
          text="LIVE LEADERBOARD · JOIN WITH A CODE · REAL-TIME SCORES"
          durationFrames={30}
        />
      </Sequence>

      {/* 321 — Clip 3 */}
      <Sequence from={321} durationInFrames={105}>
        <ClipScene
          src="launch-clips-v2/clip-03.mp4"
          durationFrames={105}
          startFrom={10}
          volume={0.7}
          overlay={{
            kicker: 'Hole 17',
            headline: 'They birdied.\nYou already saw it.',
            position: 'bottom-left',
          }}
        />
      </Sequence>

      {/* 426 — Split: REAL / PRESSURE. */}
      <Sequence from={426} durationInFrames={45}>
        <SplitReveal left="REAL" right="PRESSURE." durationFrames={45} />
      </Sequence>

      {/* 471 — Clip 4 */}
      <Sequence from={471} durationInFrames={105}>
        <ClipScene
          src="launch-clips-v2/clip-04.mp4"
          durationFrames={105}
          startFrom={10}
          volume={0.7}
          overlay={{
            kicker: 'No uploading',
            headline: 'No waiting.\nJust golf.',
            position: 'bottom-right',
          }}
        />
      </Sequence>

      {/* 576 — Ticker 2 */}
      <Sequence from={576} durationInFrames={30}>
        <Ticker
          text="NASSAU · SKINS · WOLF · MATCH PLAY · STABLEFORD · SIXES"
          durationFrames={30}
        />
      </Sequence>

      {/* 606 — Clip 5 */}
      <Sequence from={606} durationInFrames={105}>
        <ClipScene
          src="launch-clips-v2/clip-05.mp4"
          durationFrames={105}
          startFrom={10}
          volume={0.7}
          overlay={{
            kicker: 'Six formats',
            headline: 'Run them all.\nAt once.',
            position: 'bottom-left',
          }}
        />
      </Sequence>

      {/* 711 — SLAM LIGHT */}
      <Sequence from={711} durationInFrames={45}>
        <SlamLight
          text="YOUR GAME."
          subtext="Play it your way."
          durationFrames={45}
        />
      </Sequence>

      {/* 756 — Clip 6 */}
      <Sequence from={756} durationInFrames={105}>
        <ClipScene
          src="launch-clips-v2/clip-06.mp4"
          durationFrames={105}
          startFrom={10}
          volume={0.7}
          overlay={{
            kicker: 'Or build one',
            headline: 'Describe your game.\nAI does the rest.',
            accent: true,
            position: 'bottom-left',
          }}
        />
      </Sequence>

      {/* 861 — Outro */}
      <Sequence from={861} durationInFrames={90}>
        <OutroCard durationFrames={90} />
      </Sequence>
    </AbsoluteFill>
  );
};
