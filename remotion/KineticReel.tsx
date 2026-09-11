import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Img,
} from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';

const { fontFamily: sans } = loadInter();
const { fontFamily: mono } = loadMono();

const INK = '#0A0A0A';
const GOLD = '#F0EE3A';
const WHITE = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.55)';
const GREEN = '#22C55E';
const GREEN_BADGE_BG = '#143A1F';

type Orientation = 'vertical' | 'horizontal';

const clampInterp = (frame: number, range: [number, number], out: [number, number]) =>
  interpolate(frame, range, out, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// Fade a scene's content in and out around its active window
const sceneOpacity = (frame: number, inAt: number, holdFrom: number, holdTo: number, outAt: number) => {
  return Math.min(
    clampInterp(frame, [inAt, holdFrom], [0, 1]),
    clampInterp(frame, [holdTo, outAt], [1, 0])
  );
};

const WordSlam: React.FC<{
  frame: number;
  fps: number;
  text: string;
  startFrame: number;
  accent?: boolean;
  size: number;
  letterSpacing?: number;
}> = ({ frame, fps, text, startFrame, accent, size, letterSpacing = -5 }) => {
  const p = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 11, stiffness: 260, mass: 0.55 },
  });
  const opacity = clampInterp(frame, [startFrame, startFrame + 4], [0, 1]);
  const y = interpolate(p, [0, 1], [60, 0]);
  const scale = interpolate(p, [0, 0.5, 1], [0.65, 1.08, 1]);
  return (
    <span
      style={{
        display: 'inline-block',
        opacity,
        color: accent ? GOLD : WHITE,
        transform: `translateY(${y}px) scale(${scale})`,
        fontFamily: sans,
        fontWeight: 900,
        fontSize: size,
        letterSpacing,
        lineHeight: 1,
      }}
    >
      {text}
    </span>
  );
};

const BracketFrame: React.FC<{
  frame: number;
  startFrame: number;
  width: number;
  height: number;
  color?: string;
  thickness?: number;
}> = ({ frame, startFrame, width, height, color = GOLD, thickness = 6 }) => {
  const p = clampInterp(frame, [startFrame, startFrame + 22], [0, 1]);
  const len = Math.round(Math.min(width, height) * 0.55);
  const armLen = p * (Math.min(width, height) * 0.35);
  const common = {
    position: 'absolute' as const,
    background: color,
    borderRadius: thickness / 2,
  };
  return (
    <div
      style={{
        position: 'absolute',
        width,
        height,
        left: -width / 2,
        top: -height / 2,
        pointerEvents: 'none',
      }}
    >
      <div style={{ ...common, left: 0, top: 0, width: thickness, height: len * p }} />
      <div style={{ ...common, left: 0, top: 0, height: thickness, width: armLen }} />
      <div style={{ ...common, right: 0, top: 0, width: thickness, height: len * p }} />
      <div style={{ ...common, right: 0, top: 0, height: thickness, width: armLen }} />
      <div style={{ ...common, left: 0, bottom: 0, width: thickness, height: len * p }} />
      <div style={{ ...common, left: 0, bottom: 0, height: thickness, width: armLen }} />
      <div style={{ ...common, right: 0, bottom: 0, width: thickness, height: len * p }} />
      <div style={{ ...common, right: 0, bottom: 0, height: thickness, width: armLen }} />
    </div>
  );
};

const Underline: React.FC<{
  frame: number;
  startFrame: number;
  width: number;
  color?: string;
  thickness?: number;
  y?: number;
}> = ({ frame, startFrame, width, color = GOLD, thickness = 8, y = 0 }) => {
  const p = clampInterp(frame, [startFrame, startFrame + 16], [0, 1]);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: y,
        width: width * p,
        height: thickness,
        background: color,
        borderRadius: thickness,
        transform: `translateX(-${(width * p) / 2}px)`,
      }}
    />
  );
};

const Pill: React.FC<{
  frame: number;
  fps: number;
  text: string;
  startFrame: number;
  bg: string;
  color: string;
  size: number;
  dot?: string;
}> = ({ frame, fps, text, startFrame, bg, color, size, dot }) => {
  const p = spring({ frame: frame - startFrame, fps, config: { damping: 13, stiffness: 220, mass: 0.5 } });
  const opacity = clampInterp(frame, [startFrame, startFrame + 4], [0, 1]);
  const scale = interpolate(p, [0, 0.5, 1], [0.6, 1.1, 1]);
  const pulse = dot ? 0.6 + 0.4 * Math.abs(Math.sin((frame - startFrame) / 6)) : 1;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.35,
        background: bg,
        color,
        padding: `${size * 0.45}px ${size * 1.1}px`,
        borderRadius: 9999,
        fontFamily: sans,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        opacity,
        transform: `scale(${scale})`,
        whiteSpace: 'nowrap',
      }}
    >
      {dot && (
        <div
          style={{
            width: size * 0.55,
            height: size * 0.55,
            borderRadius: 9999,
            background: dot,
            opacity: pulse,
          }}
        />
      )}
      {text}
    </div>
  );
};

const WashReveal: React.FC<{ frame: number; startFrame: number }> = ({ frame, startFrame }) => {
  const p = clampInterp(frame, [startFrame, startFrame + 26], [0, 1]);
  const fadeOut = clampInterp(frame, [startFrame + 40, startFrame + 80], [1, 0]);
  return (
    <AbsoluteFill
      style={{
        opacity: p * fadeOut,
        background:
          'radial-gradient(ellipse at center, #F0EE3A 0%, rgba(240,238,58,0.35) 40%, rgba(10,10,10,0) 72%)',
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }}
    />
  );
};

const MatchLogoLockup: React.FC<{ frame: number; fps: number; startFrame: number; scale?: number }> = ({
  frame,
  fps,
  startFrame,
  scale = 1,
}) => {
  const p = spring({ frame: frame - startFrame, fps, config: { damping: 13, stiffness: 180, mass: 0.7 } });
  const opacity = clampInterp(frame, [startFrame, startFrame + 8], [0, 1]);
  const letterY = interpolate(p, [0, 1], [40, 0]);
  return (
    <div
      style={{
        opacity,
        transform: `scale(${(0.92 + 0.08 * p) * scale})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: sans,
          fontWeight: 900,
          fontSize: 220,
          letterSpacing: -10,
          lineHeight: 1,
          color: WHITE,
        }}
      >
        M<span style={{ color: GOLD, display: 'inline-block', transform: `translateY(${letterY}px)` }}>A</span>TCH
      </div>
      <div
        style={{
          width: 160,
          height: 8,
          background: GOLD,
          borderRadius: 4,
          marginTop: 18,
        }}
      />
      <div
        style={{
          marginTop: 34,
          fontFamily: sans,
          fontWeight: 800,
          color: MUTED,
          fontSize: 28,
          letterSpacing: 8,
          textTransform: 'uppercase',
        }}
      >
        Score. Bet. Win.
      </div>
    </div>
  );
};

const PhoneMockup: React.FC<{ frame: number; fps: number; startFrame: number; orientation: Orientation }> = ({
  frame,
  fps,
  startFrame,
  orientation,
}) => {
  const p = spring({ frame: frame - startFrame, fps, config: { damping: 14, stiffness: 130, mass: 0.9 } });
  const opacity = clampInterp(frame, [startFrame, startFrame + 10], [0, 1]);
  const y = interpolate(p, [0, 1], [400, 0]);
  const phoneW = orientation === 'vertical' ? 540 : 380;
  const phoneH = Math.round(phoneW * 2.05);
  const iconSize = Math.round(phoneW * 0.45);
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        width: phoneW,
        height: phoneH,
        borderRadius: phoneW * 0.13,
        background: '#050505',
        border: '3px solid rgba(255,255,255,0.12)',
        boxShadow: '0 60px 140px rgba(240,238,58,0.15), 0 30px 60px rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 55%, rgba(240,238,58,0.18), rgba(0,0,0,0) 60%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: phoneW * 0.04,
          left: '50%',
          transform: 'translateX(-50%)',
          width: phoneW * 0.3,
          height: phoneW * 0.055,
          background: '#000',
          borderRadius: 9999,
        }}
      />
      <Img
        src={staticFile('app-icon.png')}
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: iconSize * 0.22,
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        }}
      />
    </div>
  );
};

const VoiceBubble: React.FC<{ frame: number; fps: number; startFrame: number; orientation: Orientation }> = ({
  frame,
  fps,
  startFrame,
  orientation,
}) => {
  const p = spring({ frame: frame - startFrame, fps, config: { damping: 13, stiffness: 220, mass: 0.55 } });
  const opacity = clampInterp(frame, [startFrame, startFrame + 6], [0, 1]);
  const scale = interpolate(p, [0, 0.5, 1], [0.7, 1.06, 1]);
  const size = orientation === 'vertical' ? 54 : 64;
  const padX = orientation === 'vertical' ? 56 : 72;
  const padY = orientation === 'vertical' ? 32 : 40;
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1.5px solid rgba(240,238,58,0.35)',
        borderRadius: 28,
        padding: `${padY}px ${padX}px`,
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        opacity,
        transform: `scale(${scale})`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 9999,
          background: GOLD,
          boxShadow: `0 0 0 ${4 + 4 * Math.abs(Math.sin((frame - startFrame) / 5))}px rgba(240,238,58,0.25)`,
        }}
      />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: size }}>
        {Array.from({ length: 9 }).map((_, i) => {
          const h = 18 + 36 * Math.abs(Math.sin((frame - startFrame + i * 3) / 4));
          return (
            <div
              key={i}
              style={{
                width: 6,
                height: h,
                borderRadius: 3,
                background: i % 2 === 0 ? GOLD : 'rgba(255,255,255,0.8)',
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          fontFamily: sans,
          fontWeight: 800,
          fontSize: size,
          color: WHITE,
          letterSpacing: -1.5,
        }}
      >
        "Mike got a <span style={{ color: GOLD }}>4</span>"
      </div>
    </div>
  );
};

const MoneyDrop: React.FC<{ frame: number; fps: number; startFrame: number; size: number }> = ({
  frame,
  fps,
  startFrame,
  size,
}) => {
  const p = spring({ frame: frame - startFrame, fps, config: { damping: 10, stiffness: 200, mass: 0.5 } });
  const opacity = clampInterp(frame, [startFrame, startFrame + 4], [0, 1]);
  const y = interpolate(p, [0, 1], [80, 0]);
  const scale = interpolate(p, [0, 0.5, 1], [0.6, 1.12, 1]);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        fontFamily: mono,
        fontWeight: 700,
        color: GREEN,
        letterSpacing: -4,
        fontSize: size,
        textShadow: '0 0 60px rgba(34,197,94,0.25)',
      }}
    >
      +$14.00
    </div>
  );
};

export const KineticReel: React.FC<{ orientation: Orientation }> = ({ orientation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const BIG = orientation === 'vertical' ? 200 : 230;
  const MID = orientation === 'vertical' ? 150 : 170;
  const SUB = orientation === 'vertical' ? 44 : 48;
  const PILL = orientation === 'vertical' ? 38 : 44;

  const bgOpacity = clampInterp(frame, [0, 10], [0, 1]);
  const globalOut = clampInterp(frame, [585, 600], [1, 0]);

  const B = {
    saturday: 6,
    bracket1: 52,
    justGot: 48,
    real: 72,
    washStart: 112,
    thirteen: 132,
    gamesWord: 156,
    pillsStart: 206,
    live: 272,
    everyHole: 300,
    sayIt: 346,
    bubble: 378,
    youreUp: 432,
    money: 456,
    phone: 494,
    logo: 556,
  };

  // Scene opacities
  const sc1 = sceneOpacity(frame, 0, 20, 94, 110); // Saturday / just got real
  const sc2 = sceneOpacity(frame, B.thirteen - 6, B.gamesWord, B.pillsStart - 10, B.pillsStart + 2); // 13 games
  const sc3 = sceneOpacity(frame, B.pillsStart - 4, B.pillsStart + 20, B.live - 14, B.live - 2); // pills
  const sc4 = sceneOpacity(frame, B.live - 6, B.live + 10, B.sayIt - 14, B.sayIt - 2); // live / every hole
  const sc5 = sceneOpacity(frame, B.sayIt - 6, B.sayIt + 14, B.youreUp - 14, B.youreUp - 2); // say it / bubble
  const sc6 = sceneOpacity(frame, B.youreUp - 6, B.youreUp + 14, B.phone - 14, B.phone - 2); // payout
  const sc7 = sceneOpacity(frame, B.phone - 8, B.phone + 16, B.logo - 14, B.logo - 2); // phone mockup
  const sc8 = sceneOpacity(frame, B.logo - 6, B.logo + 10, 600, 605); // logo end card

  const washOpacity = sceneOpacity(frame, B.washStart, B.washStart + 26, B.washStart + 40, B.washStart + 80);
  const noise = clampInterp(frame, [0, 120], [0, 0.06]);

  return (
    <AbsoluteFill style={{ background: '#000000' }}>
      <Audio src={staticFile('sfx/bass-hit.mp3')} volume={0.7} />
      <Sequence from={B.washStart}>
        <Audio src={staticFile('sfx/whoosh.mp3')} volume={0.55} />
      </Sequence>
      <Sequence from={B.phone}>
        <Audio src={staticFile('sfx/whoosh.mp3')} volume={0.5} />
      </Sequence>
      <Sequence from={B.logo}>
        <Audio src={staticFile('sfx/snap.mp3')} volume={0.7} />
      </Sequence>

      <AbsoluteFill style={{ opacity: bgOpacity * globalOut }}>
        <AbsoluteFill style={{ background: INK }} />
        <AbsoluteFill
          style={{
            background: 'radial-gradient(ellipse at 50% 55%, rgba(240,238,58,0.05), rgba(0,0,0,0) 55%)',
            opacity: 0.5 + 0.5 * Math.abs(Math.sin(frame / 60)),
          }}
        />
        <AbsoluteFill
          style={{
            backgroundImage: `radial-gradient(rgba(255,255,255,${noise}) 1.4px, transparent 2px)`,
            backgroundSize: '52px 52px',
            opacity: 0.4,
          }}
        />

        {/* Scene 1: Saturday + just got real */}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: sc1 }}>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
            <WordSlam frame={frame} fps={fps} text="Saturday" startFrame={B.saturday} size={BIG} accent />
            <div style={{ position: 'relative', padding: '20px 72px', display: 'flex', gap: 24, alignItems: 'baseline' }}>
              <BracketFrame
                frame={frame}
                startFrame={B.bracket1}
                width={orientation === 'vertical' ? 920 : 1280}
                height={orientation === 'vertical' ? 230 : 260}
                color={GOLD}
                thickness={orientation === 'vertical' ? 6 : 7}
              />
              <WordSlam frame={frame} fps={fps} text="just got" startFrame={B.justGot} size={MID} />
              <WordSlam frame={frame} fps={fps} text="real." startFrame={B.real} size={MID} accent />
            </div>
          </div>
        </AbsoluteFill>

        {/* Wash reveal between scene 1 and scene 2 */}
        <AbsoluteFill style={{ opacity: washOpacity }}>
          <WashReveal frame={frame} startFrame={B.washStart} />
        </AbsoluteFill>

        {/* Scene 2: 13 GAMES */}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: sc2 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 32, alignItems: 'baseline' }}>
              <WordSlam frame={frame} fps={fps} text="13" startFrame={B.thirteen} size={BIG * 1.15} letterSpacing={-8} />
              <WordSlam frame={frame} fps={fps} text="GAMES." startFrame={B.gamesWord} size={BIG * 0.92} accent />
            </div>
            <div style={{ position: 'relative', width: 1, height: 30, marginTop: 8 }}>
              <Underline
                frame={frame}
                startFrame={B.gamesWord + 8}
                width={orientation === 'vertical' ? 360 : 440}
                thickness={8}
              />
            </div>
            <div
              style={{
                marginTop: 36,
                fontFamily: sans,
                fontWeight: 700,
                fontSize: SUB,
                color: MUTED,
                letterSpacing: 3,
                textTransform: 'uppercase',
                opacity: clampInterp(frame, [B.gamesWord + 14, B.gamesWord + 32], [0, 1]),
              }}
            >
              One scorecard. Every bet.
            </div>
          </div>
        </AbsoluteFill>

        {/* Scene 3: Pill cascade */}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: sc3 }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: orientation === 'vertical' ? 20 : 28,
              justifyContent: 'center',
              maxWidth: orientation === 'vertical' ? 960 : 1600,
            }}
          >
            {['Nassau', 'Skins', 'Wolf', 'Vegas', 'Match Play', 'Stableford'].map((t, i) => (
              <Pill
                key={t}
                frame={frame}
                fps={fps}
                text={t}
                startFrame={B.pillsStart + i * 6}
                bg={i === 2 ? GOLD : 'rgba(255,255,255,0.08)'}
                color={i === 2 ? INK : WHITE}
                size={PILL}
              />
            ))}
          </div>
        </AbsoluteFill>

        {/* Scene 4: LIVE + every hole */}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: sc4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 56 }}>
            <Pill
              frame={frame}
              fps={fps}
              text="Live"
              startFrame={B.live}
              bg={GREEN_BADGE_BG}
              color={GREEN}
              size={PILL * 1.1}
              dot={GREEN}
            />
            <div style={{ display: 'flex', gap: 26, alignItems: 'baseline' }}>
              <WordSlam frame={frame} fps={fps} text="Every" startFrame={B.everyHole} size={MID} />
              <WordSlam frame={frame} fps={fps} text="hole." startFrame={B.everyHole + 12} size={MID} accent />
            </div>
          </div>
        </AbsoluteFill>

        {/* Scene 5: Say it + voice bubble */}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: sc5 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48 }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'baseline' }}>
              <WordSlam frame={frame} fps={fps} text="Say" startFrame={B.sayIt} size={MID} accent />
              <WordSlam frame={frame} fps={fps} text="it." startFrame={B.sayIt + 10} size={MID} />
            </div>
            <VoiceBubble frame={frame} fps={fps} startFrame={B.bubble} orientation={orientation} />
          </div>
        </AbsoluteFill>

        {/* Scene 6: Payout */}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: sc6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
            <div
              style={{
                fontFamily: sans,
                fontWeight: 900,
                fontSize: MID * 0.85,
                color: WHITE,
                letterSpacing: -3,
                opacity: clampInterp(frame, [B.youreUp, B.youreUp + 8], [0, 1]),
                transform: `translateY(${interpolate(
                  clampInterp(frame, [B.youreUp, B.youreUp + 20], [0, 1]),
                  [0, 1],
                  [30, 0]
                )}px)`,
              }}
            >
              You're up
            </div>
            <MoneyDrop frame={frame} fps={fps} startFrame={B.money} size={BIG * 1.15} />
          </div>
        </AbsoluteFill>

        {/* Scene 7: Phone mockup */}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: sc7 }}>
          <PhoneMockup frame={frame} fps={fps} startFrame={B.phone} orientation={orientation} />
        </AbsoluteFill>

        {/* Scene 8: Logo lockup */}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: sc8 }}>
          <MatchLogoLockup frame={frame} fps={fps} startFrame={B.logo} scale={orientation === 'vertical' ? 1 : 1.15} />
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
