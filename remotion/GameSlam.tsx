import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { brand } from './brand';
import { Closing } from './Closing';

const { fontFamily: sans } = loadInter();
const { fontFamily: mono } = loadMono();

// v16 — Game Name Slam
// 1080×1920 (TikTok / Reel). 10 seconds, 300 frames @ 30fps.
// Hard type-slam of all 13 game names synced to a beat, ending
// with a pullback and CTA. No baked audio — pair with trending
// sound in the TikTok/IG editor.

const GAMES = [
  'Nassau',
  'Skins',
  'Wolf',
  'Vegas',
  'Stableford',
  'Best Ball',
  'Match Play',
  'Quota',
  'Nines',
  'Defender',
  'Sixes',
  'Rabbit',
  'Props',
];

const BEAT = 16;                        // frames per game (~0.53s)
const INTRO = 18;                       // cold-open
const SLAM_LEN = GAMES.length * BEAT;   // 13 × 16 = 208
const OUTRO_FROM = INTRO + SLAM_LEN;    // 226
const OUTRO_LEN = 74;                   // 74 → total 300 frames

// Dynamic size so 10-char names ("Stableford") still fill the screen.
const slamSize = (name: string) => {
  const len = name.length;
  if (len <= 5) return 320;
  if (len <= 6) return 280;
  if (len <= 7) return 250;
  if (len <= 8) return 220;
  if (len <= 9) return 195;
  return 170;
};

const ProgressDots: React.FC<{ activeIndex: number }> = ({ activeIndex }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 120,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      gap: 10,
    }}
  >
    {GAMES.map((_, i) => (
      <div
        key={i}
        style={{
          width: i === activeIndex ? 36 : 12,
          height: 12,
          borderRadius: 999,
          background: i <= activeIndex ? brand.gold : '#2a2a2a',
          transition: 'none',
        }}
      />
    ))}
  </div>
);

const Kicker: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, INTRO - 2, INTRO], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontFamily: mono,
          color: brand.gold,
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: 8,
          textTransform: 'uppercase',
          opacity,
        }}
      >
        13 BETS · ONE APP
      </div>
    </AbsoluteFill>
  );
};

const Slam: React.FC<{ name: string; index: number }> = ({ name, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame;

  const spr = spring({
    frame: local,
    fps,
    config: { damping: 12, stiffness: 260, mass: 0.6 },
  });
  const scale = interpolate(spr, [0, 1], [0.7, 1]);
  const shake = Math.sin(local * 0.8) * (1 - Math.min(local / 8, 1)) * 8;
  const opacity = interpolate(
    local,
    [0, 2, BEAT - 3, BEAT],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const size = slamSize(name);

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      {/* Count chip top-right */}
      <div
        style={{
          position: 'absolute',
          top: 140,
          right: 80,
          fontFamily: mono,
          fontSize: 38,
          color: brand.gold,
          fontWeight: 700,
          letterSpacing: 2,
        }}
      >
        {String(index + 1).padStart(2, '0')} / 13
      </div>

      {/* The slam */}
      <div
        style={{
          fontFamily: sans,
          fontSize: size,
          fontWeight: 900,
          color: brand.bgElevated,
          letterSpacing: -10,
          lineHeight: 0.88,
          textAlign: 'center',
          transform: `translateX(${shake}px) scale(${scale})`,
          padding: '0 40px',
        }}
      >
        {name}
      </div>

      {/* Bottom accent bar flash */}
      <div
        style={{
          position: 'absolute',
          bottom: 200,
          left: '50%',
          width: interpolate(local, [0, 4], [0, 280], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          transform: 'translateX(-50%)',
          height: 10,
          background: brand.gold,
          borderRadius: 5,
        }}
      />

      <ProgressDots activeIndex={index} />
    </AbsoluteFill>
  );
};

export const GameSlam: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: brand.ink }}>
      <Sequence from={0} durationInFrames={INTRO}>
        <Kicker />
      </Sequence>
      {GAMES.map((name, i) => (
        <Sequence
          key={name}
          from={INTRO + i * BEAT}
          durationInFrames={BEAT}
        >
          <Slam name={name} index={i} />
        </Sequence>
      ))}
      <Sequence from={OUTRO_FROM} durationInFrames={OUTRO_LEN}>
        <Closing />
      </Sequence>
    </AbsoluteFill>
  );
};
