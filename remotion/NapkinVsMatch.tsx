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
import { loadFont as loadCaveat } from '@remotion/google-fonts/Caveat';
import { brand } from './brand';
import { Closing } from './Closing';

const { fontFamily: sans } = loadInter();
const { fontFamily: mono } = loadMono();
const { fontFamily: handwritten } = loadCaveat();

// v15b — "Napkin vs MATCH"
// 1080×1920 TikTok/Reel, 12s (360 frames @ 30fps).
// Top half: beige napkin, handwritten chaos (Mike/Dave/Paul Nassau math).
// Bottom half: app settlement screen rendering cleanly at the same time.
// Ends with napkin dimming and app CTA taking over.

const DURATION = 360;

const NAPKIN_BG = '#f4ead2';
const NAPKIN_INK = '#1a1a1a';

// --------------------------------------------------------------------
// Napkin — the "old way"
// --------------------------------------------------------------------

type HandEntry = {
  text: string;
  frame: number;          // when it appears
  x: number;              // left px
  y: number;              // top px
  size: number;
  rotate?: number;
  crossedAt?: number;     // frame when strikethrough animates across it
};

const NAPKIN_ENTRIES: HandEntry[] = [
  { text: 'Nassau', frame: 6, x: 60, y: 40, size: 110, rotate: -2 },
  { text: '$5 / $5 / $5', frame: 14, x: 430, y: 70, size: 60, rotate: 1 },
  { text: 'Mike -2', frame: 26, x: 70, y: 190, size: 78, rotate: -1 },
  { text: 'Dave +1', frame: 38, x: 70, y: 280, size: 78, rotate: 1 },
  { text: 'Paul  E', frame: 50, x: 70, y: 370, size: 78, rotate: -2 },
  { text: '→ front 9 = Mike?', frame: 64, x: 430, y: 200, size: 52, rotate: -3 },
  { text: 'press on 14??', frame: 80, x: 430, y: 280, size: 56, rotate: 2, crossedAt: 160 },
  { text: 'back 9: Dave', frame: 96, x: 60, y: 470, size: 66, rotate: 0 },
  { text: '$10 - $5 = ?', frame: 112, x: 60, y: 560, size: 68, rotate: 1, crossedAt: 175 },
  { text: 'no wait -', frame: 128, x: 470, y: 380, size: 60, rotate: -4 },
  { text: 'auto press?', frame: 144, x: 460, y: 470, size: 58, rotate: 3 },
  { text: 'total: $12??', frame: 162, x: 80, y: 660, size: 82, rotate: -2, crossedAt: 195 },
  { text: '...$8??', frame: 180, x: 480, y: 660, size: 78, rotate: 2, crossedAt: 210 },
  { text: '???', frame: 200, x: 300, y: 770, size: 140, rotate: -1 },
];

const HandText: React.FC<{ entry: HandEntry }> = ({ entry }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - entry.frame;
  if (local < 0) return null;

  const sp = spring({ frame: local, fps, config: { damping: 14, stiffness: 220 } });
  const scale = interpolate(sp, [0, 1], [0.6, 1]);
  const opacity = interpolate(local, [0, 3], [0, 1], { extrapolateRight: 'clamp' });

  // strikethrough progress
  const crossProgress = entry.crossedAt
    ? interpolate(frame - entry.crossedAt, [0, 8], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: entry.x,
        top: entry.y,
        fontFamily: handwritten,
        fontSize: entry.size,
        color: NAPKIN_INK,
        fontWeight: 700,
        transform: `rotate(${entry.rotate ?? 0}deg) scale(${scale})`,
        transformOrigin: 'left top',
        opacity,
        whiteSpace: 'nowrap',
      }}
    >
      {entry.text}
      {entry.crossedAt !== undefined && (
        <div
          style={{
            position: 'absolute',
            top: '55%',
            left: -10,
            height: 6,
            background: '#a01818',
            width: `${crossProgress * 110}%`,
            borderRadius: 3,
            transform: 'rotate(-2deg)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};

const Napkin: React.FC = () => {
  const frame = useCurrentFrame();
  // Fade + slight rotation on the napkin after the app takes over (~frame 240)
  const dim = interpolate(frame, [240, 285], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const drop = interpolate(frame, [240, 300], [0, 40], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rot = interpolate(frame, [240, 300], [0, -1.5], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 960,
        background: NAPKIN_BG,
        overflow: 'hidden',
        opacity: dim,
        transform: `translateY(${drop}px) rotate(${rot}deg)`,
        boxShadow: 'inset 0 -40px 80px rgba(60,40,0,0.08)',
      }}
    >
      {/* Paper grain: faint diagonal stripes */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(120,90,20,0.03) 0 2px, transparent 2px 40px)',
        }}
      />
      {/* Label top-right */}
      <div
        style={{
          position: 'absolute',
          top: 36,
          right: 48,
          fontFamily: mono,
          fontSize: 28,
          color: '#8a6a20',
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: 'uppercase',
        }}
      >
        THE OLD WAY
      </div>
      {NAPKIN_ENTRIES.map((e) => (
        <HandText key={`${e.text}-${e.frame}`} entry={e} />
      ))}
    </div>
  );
};

// --------------------------------------------------------------------
// App side — the "MATCH way"
// --------------------------------------------------------------------

type LedgerRow = { name: string; amount: string; positive: boolean; frame: number };

const LEDGER: LedgerRow[] = [
  { name: 'Mike',  amount: '+$15', positive: true,  frame: 60 },
  { name: 'Dave',  amount: '+$5',  positive: true,  frame: 84 },
  { name: 'Paul',  amount: '-$10', positive: false, frame: 108 },
  { name: 'Ryan',  amount: '-$10', positive: false, frame: 132 },
];

const AppCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardIn = spring({
    frame: frame - 30,
    fps,
    config: { damping: 14, stiffness: 200 },
  });
  const cardY = interpolate(cardIn, [0, 1], [120, 0]);
  const cardFadeIn = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cardFadeOut = interpolate(frame, [260, 285], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cardOp = cardFadeIn * cardFadeOut;

  // Hero lift: after frame 240, card scales up + centers
  const lift = interpolate(frame, [240, 280], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const liftScale = interpolate(lift, [0, 1], [1, 1.04]);
  const liftY = interpolate(lift, [0, 1], [0, -40]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 1000,
        left: 60,
        right: 60,
        height: 680,
        opacity: cardOp,
        transform: `translateY(${cardY + liftY}px) scale(${liftScale})`,
        transformOrigin: 'center center',
      }}
    >
      <div
        style={{
          background: brand.bgElevated,
          borderRadius: 32,
          border: `3px solid ${brand.ink}`,
          padding: '32px 40px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 24,
            borderBottom: `2px solid ${brand.ink}`,
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontSize: 34,
              fontWeight: 900,
              color: brand.ink,
              letterSpacing: -1,
            }}
          >
            Nassau · Settlement
          </div>
          <div
            style={{
              background: brand.gold,
              color: brand.ink,
              padding: '8px 18px',
              borderRadius: 999,
              fontFamily: mono,
              fontSize: 22,
              fontWeight: 800,
              border: `2px solid ${brand.ink}`,
            }}
          >
            LIVE
          </div>
        </div>

        {/* Ledger rows */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {LEDGER.map((row) => {
            const rowIn = interpolate(frame, [row.frame, row.frame + 12], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const rowOp = rowIn;
            const rowX = interpolate(rowIn, [0, 1], [40, 0]);
            return (
              <div
                key={row.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '22px 28px',
                  background: row.positive ? brand.goldMuted : brand.bg,
                  borderRadius: 20,
                  border: `2px solid ${brand.ink}`,
                  opacity: rowOp,
                  transform: `translateX(${rowX}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 42,
                    fontWeight: 800,
                    color: brand.ink,
                  }}
                >
                  {row.name}
                </div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 48,
                    fontWeight: 800,
                    color: brand.ink,
                  }}
                >
                  {row.amount}
                </div>
              </div>
            );
          })}
        </div>

        {/* Settled bar */}
        <div
          style={{
            marginTop: 'auto',
            padding: '24px 28px',
            background: brand.ink,
            borderRadius: 20,
            color: brand.bgElevated,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: interpolate(frame, [156, 180], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: -0.5,
            }}
          >
            Auto-settled at 19th
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: 28,
              color: brand.gold,
              fontWeight: 800,
            }}
          >
            ✓
          </div>
        </div>
      </div>
    </div>
  );
};

// Divider with "VS" label sitting on the boundary between napkin + app
const VsBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({
    frame: frame - 4,
    fps,
    config: { damping: 12, stiffness: 260 },
  });
  const scale = interpolate(sp, [0, 1], [0.2, 1]);
  const fade = interpolate(frame, [240, 280], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        top: 910,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        opacity: fade,
      }}
    >
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: 999,
          background: brand.gold,
          color: brand.ink,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: sans,
          fontSize: 72,
          fontWeight: 900,
          letterSpacing: -4,
          border: `6px solid ${brand.ink}`,
          transform: `scale(${scale})`,
        }}
      >
        VS
      </div>
    </div>
  );
};


export const NapkinVsMatch: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: brand.bg, fontFamily: sans }}>
      <Napkin />
      <AppCard />
      <Sequence from={0} durationInFrames={285}>
        <VsBadge />
      </Sequence>
      <Sequence from={270} durationInFrames={DURATION - 270}>
        <Closing />
      </Sequence>
    </AbsoluteFill>
  );
};
