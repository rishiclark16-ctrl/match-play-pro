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
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';

const { fontFamily: sans } = loadInter();
const { fontFamily: mono } = loadMono();

// Brand tokens
const INK = '#0A0A0A';
const GOLD = '#F0EE3A';
const WHITE = '#FFFFFF';
const MUTED = '#787878';
const GREEN = '#22C55E';

type ClipSpec = {
  src: string;
  durationFrames: number;
  startFrom?: number;
  overlay?: OverlaySpec;
};

type OverlaySpec = {
  kicker?: string;
  headline: string;
  accent?: boolean;
  position?: 'bottom' | 'top' | 'center';
};

const clamp = (f: number, r: [number, number], o: [number, number]) =>
  interpolate(f, r, o, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const VIGNETTE =
  'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)';

const TextBackdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0) 60%)',
    }}
  />
);

const Overlay: React.FC<{
  frame: number;
  localDuration: number;
  spec: OverlaySpec;
  fps: number;
}> = ({ frame, localDuration, spec, fps }) => {
  const inAt = 6;
  const outAt = localDuration - 12;
  const opacity = Math.min(
    clamp(frame, [inAt, inAt + 10], [0, 1]),
    clamp(frame, [outAt, outAt + 12], [1, 0])
  );
  const p = spring({ frame: frame - inAt, fps, config: { damping: 18, stiffness: 180, mass: 0.6 } });
  const y = interpolate(p, [0, 1], [24, 0]);

  const pos = spec.position ?? 'bottom';
  const posStyle: React.CSSProperties =
    pos === 'bottom'
      ? { bottom: 88, left: 88, right: 88 }
      : pos === 'top'
      ? { top: 88, left: 88, right: 88 }
      : { top: '50%', left: 0, right: 0, transform: 'translateY(-50%)' };

  return (
    <div style={{ position: 'absolute', ...posStyle, opacity }}>
      <div
        style={{
          transform: `translateY(${y}px)`,
          textAlign: pos === 'center' ? 'center' : 'left',
        }}
      >
        {spec.kicker && (
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: GOLD,
              marginBottom: 14,
            }}
          >
            {spec.kicker}
          </div>
        )}
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 88,
            letterSpacing: '-0.035em',
            lineHeight: 0.95,
            color: spec.accent ? GOLD : WHITE,
            textShadow: '0 4px 24px rgba(0,0,0,0.45)',
            whiteSpace: 'pre-line',
          }}
        >
          {spec.headline}
        </div>
      </div>
    </div>
  );
};

const ClipScene: React.FC<{ clip: ClipSpec }> = ({ clip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = interpolate(frame, [0, clip.durationFrames], [1.02, 1.08], {
    extrapolateRight: 'clamp',
  });
  const fadeIn = clamp(frame, [0, 6], [0, 1]);
  const fadeOut = clamp(frame, [clip.durationFrames - 8, clip.durationFrames], [1, 0]);
  const sceneOpacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: sceneOpacity }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <OffthreadVideo
          src={staticFile(clip.src)}
          startFrom={clip.startFrom ?? 0}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          muted
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: VIGNETTE, pointerEvents: 'none' }} />
      {clip.overlay && <TextBackdrop />}
      {clip.overlay && (
        <Overlay frame={frame} localDuration={clip.durationFrames} spec={clip.overlay} fps={fps} />
      )}
    </AbsoluteFill>
  );
};

// ── Intertitle: single slam word/phrase ─────────────────────────────────────
const Intertitle: React.FC<{
  text: string;
  accent?: boolean;
  durationFrames: number;
  subtext?: string;
}> = ({ text, accent, durationFrames, subtext }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p = spring({ frame, fps, config: { damping: 12, stiffness: 260, mass: 0.5 } });
  const scale = interpolate(p, [0, 0.6, 1], [0.7, 1.06, 1]);
  const y = interpolate(p, [0, 1], [40, 0]);
  const fadeIn = clamp(frame, [0, 4], [0, 1]);
  const fadeOut = clamp(frame, [durationFrames - 5, durationFrames], [1, 0]);
  const opacity = Math.min(fadeIn, fadeOut);
  const barWidth = clamp(frame, [4, 16], [0, 240]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: INK,
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: barWidth,
            height: 6,
            backgroundColor: GOLD,
            margin: '0 auto 28px',
          }}
        />
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 180,
            letterSpacing: '-0.05em',
            lineHeight: 0.9,
            color: accent ? GOLD : WHITE,
            transform: `translateY(${y}px) scale(${scale})`,
          }}
        >
          {text}
        </div>
        {subtext && (
          <div
            style={{
              fontFamily: sans,
              fontWeight: 600,
              fontSize: 28,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: MUTED,
              marginTop: 28,
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

// ── Typewriter: terminal-style reveal with blinking cursor ─────────────────
const Typewriter: React.FC<{
  lines: string[]; // each line revealed sequentially
  durationFrames: number;
  prompt?: string; // e.g. "> "
  accentLast?: boolean;
}> = ({ lines, durationFrames, prompt = '> ', accentLast = true }) => {
  const frame = useCurrentFrame();

  const totalChars = lines.reduce((a, l) => a + l.length, 0);
  // Reserve last 10 frames for hold, rest for typing
  const typeFrames = durationFrames - 14;
  const charsPerFrame = totalChars / typeFrames;
  const revealed = Math.max(0, Math.floor(frame * charsPerFrame));

  const fadeIn = clamp(frame, [0, 4], [0, 1]);
  const fadeOut = clamp(frame, [durationFrames - 8, durationFrames], [1, 0]);
  const opacity = Math.min(fadeIn, fadeOut);

  const cursorOn = Math.floor(frame / 10) % 2 === 0;

  let remaining = revealed;
  const rendered = lines.map((line, idx) => {
    const take = Math.min(line.length, Math.max(0, remaining));
    remaining -= take;
    return { text: line, shown: line.slice(0, take), done: take >= line.length };
  });
  const activeLineIdx = rendered.findIndex((r) => !r.done);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: INK,
        alignItems: 'flex-start',
        justifyContent: 'center',
        opacity,
        padding: '0 160px',
      }}
    >
      <div>
        {rendered.map((r, idx) => {
          const isLast = idx === lines.length - 1;
          const color = accentLast && isLast && r.done ? GOLD : WHITE;
          const showCursorHere =
            (activeLineIdx === -1 && isLast) || activeLineIdx === idx;
          return (
            <div
              key={idx}
              style={{
                fontFamily: mono,
                fontWeight: 500,
                fontSize: 84,
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
                color,
                whiteSpace: 'pre',
              }}
            >
              <span style={{ color: GREEN, marginRight: 16 }}>{prompt}</span>
              {r.shown}
              {showCursorHere && (
                <span
                  style={{
                    display: 'inline-block',
                    width: '0.6em',
                    marginLeft: 6,
                    background: cursorOn ? GOLD : 'transparent',
                    height: '0.9em',
                    verticalAlign: '-0.12em',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── WordStack: words slam in one after another, stack vertically ───────────
const WordStack: React.FC<{
  words: string[];
  accents?: boolean[]; // match word index — highlight with gold
  durationFrames: number;
  align?: 'center' | 'left';
}> = ({ words, accents = [], durationFrames, align = 'center' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stagger = Math.floor((durationFrames - 14) / (words.length + 1));
  const fadeOut = clamp(frame, [durationFrames - 8, durationFrames], [1, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: INK,
        alignItems: align === 'center' ? 'center' : 'flex-start',
        justifyContent: 'center',
        padding: '0 120px',
        opacity: fadeOut,
      }}
    >
      <div style={{ textAlign: align }}>
        {words.map((w, i) => {
          const start = i * stagger + 2;
          const p = spring({
            frame: frame - start,
            fps,
            config: { damping: 13, stiffness: 260, mass: 0.5 },
          });
          const y = interpolate(p, [0, 1], [60, 0]);
          const scale = interpolate(p, [0, 0.6, 1], [0.7, 1.08, 1]);
          const op = clamp(frame, [start, start + 4], [0, 1]);
          const isAccent = accents[i] ?? false;
          return (
            <div
              key={i}
              style={{
                fontFamily: sans,
                fontWeight: 900,
                fontSize: 148,
                letterSpacing: '-0.05em',
                lineHeight: 0.95,
                color: isAccent ? GOLD : WHITE,
                transform: `translateY(${y}px) scale(${scale})`,
                opacity: op,
              }}
            >
              {w}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── TagSweep: headline with gold underline sweep ───────────────────────────
const TagSweep: React.FC<{
  text: string;
  durationFrames: number;
  kicker?: string;
}> = ({ text, durationFrames, kicker }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p = spring({ frame, fps, config: { damping: 16, stiffness: 200 } });
  const y = interpolate(p, [0, 1], [30, 0]);
  const fadeIn = clamp(frame, [0, 6], [0, 1]);
  const fadeOut = clamp(frame, [durationFrames - 8, durationFrames], [1, 0]);
  const opacity = Math.min(fadeIn, fadeOut);
  const underlineW = clamp(frame, [10, 28], [0, 780]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: INK,
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      <div style={{ textAlign: 'center', transform: `translateY(${y}px)` }}>
        {kicker && (
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: GOLD,
              marginBottom: 24,
            }}
          >
            {kicker}
          </div>
        )}
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 108,
            letterSpacing: '-0.045em',
            lineHeight: 0.95,
            color: WHITE,
            whiteSpace: 'pre-line',
          }}
        >
          {text}
        </div>
        <div
          style={{
            width: underlineW,
            height: 8,
            backgroundColor: GOLD,
            margin: '32px auto 0',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ── Outro: MATCH wordmark + CTA ─────────────────────────────────────────────
const OutroCard: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoP = spring({ frame, fps, config: { damping: 14, stiffness: 200 } });
  const logoScale = interpolate(logoP, [0, 1], [0.85, 1]);
  const logoY = interpolate(logoP, [0, 1], [30, 0]);

  const ctaStart = 18;
  const ctaP = spring({ frame: frame - ctaStart, fps, config: { damping: 16, stiffness: 200 } });
  const ctaOpacity = clamp(frame, [ctaStart, ctaStart + 10], [0, 1]);
  const ctaY = interpolate(ctaP, [0, 1], [20, 0]);
  const underlineWidth = clamp(frame, [6, 24], [0, 540]);
  const fadeOut = clamp(frame, [durationFrames - 10, durationFrames], [1, 0]);

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
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 280,
            letterSpacing: '-0.06em',
            lineHeight: 0.9,
            color: WHITE,
            transform: `translateY(${logoY}px) scale(${logoScale})`,
            display: 'inline-block',
          }}
        >
          MATCH
        </div>
        <div
          style={{
            width: underlineWidth,
            height: 10,
            backgroundColor: GOLD,
            margin: '20px auto 0',
          }}
        />
        <div
          style={{
            marginTop: 48,
            opacity: ctaOpacity,
            transform: `translateY(${ctaY}px)`,
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: MUTED,
              marginBottom: 18,
            }}
          >
            Score. Bet. Settle Up.
          </div>
          <div
            style={{
              display: 'inline-block',
              backgroundColor: GOLD,
              color: INK,
              fontFamily: sans,
              fontWeight: 900,
              fontSize: 44,
              letterSpacing: '-0.02em',
              padding: '22px 44px',
              borderRadius: 12,
            }}
          >
            Download Today
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// SEQUENCE PLAN (30fps, 1920x1080) — v2: more text, shorter clips (3.8s each)
// ============================================================================
// 0    45f  1.5s  OPEN        Intertitle  "PLAYING FOR"  sub: Something?
// 45   54f  1.8s  TYPEWRITER  "> your saturday group" "> needs this."
// 99   114f 3.8s  CLIP 04     cinematic — overlay: "Golf is more fun / when money's on the line."
// 213  66f  2.2s  WORDSTACK   "SCORE." "BET." "SETTLE UP." (gold)
// 279  114f 3.8s  CLIP 03     dolly — overlay: "Every game. Every hole. / Real time."
// 393  60f  2.0s  TAGSWEEP    kicker: SIX FORMATS. ONE ROUND. / text: "Zero math."
// 453  114f 3.8s  CLIP 01     closeup — overlay: "Nassau. Skins. Wolf. / All at once."
// 567  75f  2.5s  TYPEWRITER  "> press detected." "> up $20." (gold last)
// 642  114f 3.8s  CLIP 02     single — overlay: "Auto-settled / the second you finish 18."
// 756  45f  1.5s  INTERTITLE  "NO MATH." sub: NO ARGUMENTS.
// 801  114f 3.8s  CLIP 05     travel — overlay: "Your group chat / will thank you."
// 915  42f  1.4s  WORDSTACK   "JUST" "PLAY." (accent last)
// 957  90f  3.0s  OUTRO       MATCH + Download Today
// TOTAL: 1047 frames = 34.9s
// ============================================================================

export const LAUNCH_VIDEO_DURATION = 1047;

export const LaunchVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      {/* Sound design stem — bass hits, whooshes, typewriter, stinger, drone pad */}
      <Audio src={staticFile('launch-clips/sfx.mp3')} />

      {/* 0 — Opener */}
      <Sequence from={0} durationInFrames={45}>
        <Intertitle text="PLAYING FOR" subtext="Something?" durationFrames={45} />
      </Sequence>

      {/* 45 — Typewriter intro */}
      <Sequence from={45} durationInFrames={54}>
        <Typewriter
          lines={['your saturday group', 'needs this.']}
          durationFrames={54}
        />
      </Sequence>

      {/* 99 — Clip 4 cinematic */}
      <Sequence from={99} durationInFrames={114}>
        <ClipScene
          clip={{
            src: 'launch-clips/clip-04-cinematic.mp4',
            durationFrames: 114,
            startFrom: 10,
            overlay: {
              kicker: 'MATCH GOLF',
              headline: "Golf is more fun\nwhen money's on the line.",
              position: 'bottom',
            },
          }}
        />
      </Sequence>

      {/* 213 — Word stack: SCORE. BET. SETTLE UP. */}
      <Sequence from={213} durationInFrames={66}>
        <WordStack
          words={['SCORE.', 'BET.', 'SETTLE UP.']}
          accents={[false, false, true]}
          durationFrames={66}
        />
      </Sequence>

      {/* 279 — Clip 3 dolly */}
      <Sequence from={279} durationInFrames={114}>
        <ClipScene
          clip={{
            src: 'launch-clips/clip-03-dolly.mp4',
            durationFrames: 114,
            startFrom: 8,
            overlay: {
              kicker: 'Every game. Every hole.',
              headline: 'Real time.',
              accent: true,
              position: 'bottom',
            },
          }}
        />
      </Sequence>

      {/* 393 — Tag sweep */}
      <Sequence from={393} durationInFrames={60}>
        <TagSweep
          kicker="Six formats. One round."
          text="Zero math."
          durationFrames={60}
        />
      </Sequence>

      {/* 453 — Clip 1 closeup */}
      <Sequence from={453} durationInFrames={114}>
        <ClipScene
          clip={{
            src: 'launch-clips/clip-01-closeup.mp4',
            durationFrames: 114,
            startFrom: 8,
            overlay: {
              kicker: 'Nassau. Skins. Wolf.',
              headline: 'All at once.',
              position: 'bottom',
            },
          }}
        />
      </Sequence>

      {/* 567 — Typewriter: press detected */}
      <Sequence from={567} durationInFrames={75}>
        <Typewriter
          lines={['press detected.', "you're up $20."]}
          durationFrames={75}
        />
      </Sequence>

      {/* 642 — Clip 2 single golfer */}
      <Sequence from={642} durationInFrames={114}>
        <ClipScene
          clip={{
            src: 'launch-clips/clip-02-singlegolfer.mp4',
            durationFrames: 114,
            startFrom: 8,
            overlay: {
              kicker: 'Auto-settlement',
              headline: 'The second you\nfinish 18.',
              position: 'bottom',
            },
          }}
        />
      </Sequence>

      {/* 756 — Slam: NO MATH */}
      <Sequence from={756} durationInFrames={45}>
        <Intertitle text="NO MATH." subtext="NO ARGUMENTS." durationFrames={45} />
      </Sequence>

      {/* 801 — Clip 5 travel */}
      <Sequence from={801} durationInFrames={114}>
        <ClipScene
          clip={{
            src: 'launch-clips/clip-05-travel.mp4',
            durationFrames: 114,
            startFrom: 8,
            overlay: {
              kicker: 'Your group chat',
              headline: 'will thank you.',
              accent: true,
              position: 'bottom',
            },
          }}
        />
      </Sequence>

      {/* 915 — WordStack: JUST PLAY. */}
      <Sequence from={915} durationInFrames={42}>
        <WordStack
          words={['JUST', 'PLAY.']}
          accents={[false, true]}
          durationFrames={42}
        />
      </Sequence>

      {/* 957 — Outro */}
      <Sequence from={957} durationInFrames={90}>
        <OutroCard durationFrames={90} />
      </Sequence>
    </AbsoluteFill>
  );
};
