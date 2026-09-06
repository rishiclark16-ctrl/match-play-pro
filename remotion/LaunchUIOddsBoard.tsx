import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { ClipBeat, Outro, INK, BG, GOLD, WHITE, MUTED, SUBTLE, LINE, GREEN, RED, sans, clamp } from './launchScenes';

export const LAUNCH_UI_ODDSBOARD_DURATION = 540;

// ============================================================================
// SCENE 1 — TICKER (stock-style player quotes, 180f)
// Each player is a "stock" with sparkline, price, and delta. Scrolling ticker tape at bottom.
// ============================================================================
const tickerPlayers = [
  { sym: 'MIKE', name: 'Mike Peters', base: 24, deltas: [0, 3, -2, 5, 4, 3, 8, 12, 8] },
  { sym: 'DAN', name: 'Dan Riley', base: 0, deltas: [0, -1, 2, -1, 3, 2, 5, 4, 6] },
  { sym: 'YOU', name: 'You', base: 0, deltas: [0, 1, -2, -3, -4, -6, -8, -11, -12] },
  { sym: 'JOHN', name: 'John Lee', base: -6, deltas: [0, -2, -1, -3, -5, -4, -8, -10, -14] },
];

const tickerTape = [
  'FRONT 9 +$24',
  'MIKE BIRDIE H8 +$12',
  'SKIN H5 DAN +$5',
  'PRESS ACCEPTED H6',
  'CTP H3 YOU +$3',
  'STABLEFORD +14 MIKE',
  'NASSAU BACK PRESSED',
  'EAGLE ALERT H7',
  'SANDIE H4 DAN +$2',
];

const Sparkline: React.FC<{ values: number[]; color: string; stroke: number; w: number; h: number; revealPct: number }> = ({ values, color, stroke, w, h, revealPct }) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * h;
    return [x, y] as [number, number];
  });
  const visibleLen = Math.max(1, Math.floor(pts.length * revealPct));
  const slice = pts.slice(0, visibleLen);
  if (slice.length < 2) slice.push(pts[0]);
  const path = slice.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = slice[slice.length - 1];
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={path} fill="none" stroke={color} strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={stroke + 2} fill={color} />
    </svg>
  );
};

const Ticker: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const introOp = clamp(frame, [0, 10], [0, 1]);
  const fade = clamp(frame, [duration - 8, duration], [1, 0]);

  // prices tick every 12 frames
  const tickPer = 12;
  const tickProgress = Math.min(1, Math.max(0, (frame - 12) / (tickPer * 8)));
  const revealedIdx = Math.min(9, Math.floor(tickProgress * 9) + 1);

  // row entrances
  const rowStart = 8;
  const rowStagger = 5;

  // Scrolling tape at bottom
  const tapeSpeed = 280; // px/sec
  const tapeOffset = -(frame / fps) * tapeSpeed;
  const tapeText = tickerTape.join('  ·  ') + '  ·  ';
  const tapeRepeats = Array.from({ length: 8 }, (_, i) => `${tapeText}`);

  // Final gold highlight on leader at end
  const leaderF = 140;
  const leaderOp = clamp(frame, [leaderF, leaderF + 10], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: fade, padding: '54px 16px 0' }}>
      <div style={{ opacity: introOp, marginTop: 20, textAlign: 'center' }}>
        <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 26, letterSpacing: '0.48em', color: GOLD, textTransform: 'uppercase' }}>
          Live Quotes · USD
        </div>
        <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 108, letterSpacing: '-0.055em', color: WHITE, lineHeight: 0.9, marginTop: 8 }}>
          THE TAB
        </div>
      </div>

      <div style={{ flex: 1, marginTop: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', padding: '0 6px' }}>
        {tickerPlayers.map((p, pi) => {
          const localF = frame - (rowStart + pi * rowStagger);
          const rp = spring({ frame: localF, fps, config: { damping: 16, stiffness: 200 } });
          const rx = interpolate(rp, [0, 1], [-60, 0]);
          const rop = clamp(localF, [0, 10], [0, 1]);

          const series = [p.base, ...p.deltas.slice(1, revealedIdx).reduce<number[]>((acc, d, i) => {
            const prev = acc[acc.length - 1] ?? p.base;
            acc.push(prev + d);
            return acc;
          }, [])];
          while (series.length < 9) series.push(series[series.length - 1] ?? p.base);
          const price = series[Math.min(revealedIdx - 1, series.length - 1)];
          const priceDelta = price - p.base;
          const up = priceDelta > 0;
          const flat = priceDelta === 0;
          const color = flat ? MUTED : up ? GREEN : RED;

          const isLeader = pi === 0;
          const highlightScale = interpolate(leaderOp, [0, 1], [1, 1.04]);

          return (
            <div
              key={p.sym}
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 260px 1fr auto',
                alignItems: 'center',
                gap: 18,
                padding: '20px 24px',
                backgroundColor: isLeader ? `rgba(240,238,58,${0.08 * leaderOp})` : 'transparent',
                borderRadius: 16,
                borderBottom: `1px solid ${LINE}`,
                transform: `translateX(${rx}px) scale(${isLeader ? highlightScale : 1})`,
                opacity: rop,
              }}
            >
              <div
                style={{
                  fontFamily: sans,
                  fontWeight: 900,
                  fontSize: 48,
                  color: isLeader ? GOLD : WHITE,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {p.sym}
              </div>
              <div>
                <Sparkline values={series} color={color} stroke={4} w={240} h={60} revealPct={Math.min(1, revealedIdx / 9)} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 56, color: WHITE, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {price >= 0 ? '+' : '-'}${Math.abs(price).toFixed(0)}
                </div>
              </div>
              <div
                style={{
                  minWidth: 110,
                  textAlign: 'right',
                  fontFamily: sans,
                  fontWeight: 800,
                  fontSize: 28,
                  color,
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                }}
              >
                {flat ? '—' : (up ? '▲ ' : '▼ ') + `$${Math.abs(priceDelta)}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrolling ticker tape */}
      <div
        style={{
          height: 70,
          backgroundColor: GOLD,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          marginTop: 16,
          marginLeft: -56,
          marginRight: -56,
          opacity: introOp,
        }}
      >
        <div
          style={{
            whiteSpace: 'nowrap',
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 34,
            color: INK,
            letterSpacing: '0.08em',
            transform: `translateX(${tapeOffset}px)`,
          }}
        >
          {tapeRepeats.join('')}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// SCENE 2 — ODDS BOARD (sportsbook-style, 150f)
// ============================================================================
const odds = [
  { book: 'NASSAU · FRONT', line: '-$8', fave: 'MIKE', color: GOLD },
  { book: 'NASSAU · BACK', line: 'PK', fave: 'OPEN', color: WHITE },
  { book: 'SKINS · 3 CARRY', line: '+$15', fave: 'POT', color: GOLD },
  { book: 'STABLEFORD', line: '+14 pts', fave: 'MIKE', color: GOLD },
  { book: 'CTP · H11', line: 'OPEN', fave: 'UP FOR GRABS', color: WHITE },
];

const OddsBoard: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const introOp = clamp(frame, [0, 10], [0, 1]);
  const fade = clamp(frame, [duration - 8, duration], [1, 0]);

  const rowStart = 16;
  const rowPer = 12;

  const finalF = rowStart + odds.length * rowPer + 8;
  const finalP = spring({ frame: frame - finalF, fps, config: { damping: 10, stiffness: 220 } });
  const finalScale = interpolate(finalP, [0, 0.4, 1], [1.7, 1.08, 1]);
  const finalOp = clamp(frame, [finalF, finalF + 10], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: fade, padding: '54px 56px 40px' }}>
      <div style={{ textAlign: 'center', opacity: introOp, marginTop: 20 }}>
        <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 28, letterSpacing: '0.46em', color: GOLD, textTransform: 'uppercase' }}>
          Live Lines · Back 9
        </div>
        <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 116, letterSpacing: '-0.055em', color: WHITE, lineHeight: 0.9, marginTop: 8 }}>
          ODDS BOARD
        </div>
      </div>

      <div
        style={{
          flex: 1,
          marginTop: 36,
          backgroundColor: SUBTLE,
          borderRadius: 32,
          border: `1px solid ${LINE}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          opacity: introOp,
        }}
      >
        {/* header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 220px 220px',
            padding: '22px 28px',
            borderBottom: `1px solid ${LINE}`,
            backgroundColor: '#101010',
          }}
        >
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 18, color: MUTED, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
            Market
          </div>
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 18, color: MUTED, letterSpacing: '0.3em', textTransform: 'uppercase', textAlign: 'center' }}>
            Favorite
          </div>
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 18, color: MUTED, letterSpacing: '0.3em', textTransform: 'uppercase', textAlign: 'right' }}>
            Line
          </div>
        </div>

        {/* rows */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {odds.map((o, i) => {
            const localF = frame - (rowStart + i * rowPer);
            const p = spring({ frame: localF, fps, config: { damping: 16, stiffness: 200 } });
            const rx = interpolate(p, [0, 1], [80, 0]);
            const op = clamp(localF, [0, 8], [0, 1]);
            const pulseT = localF > 8 && localF < 16 ? (localF - 8) / 8 : 1;
            const pulseScale = interpolate(pulseT, [0, 0.5, 1], [1, 1.05, 1]);
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: '1fr 220px 220px',
                  alignItems: 'center',
                  padding: '0 28px',
                  borderBottom: i === odds.length - 1 ? 'none' : `1px solid ${LINE}`,
                  backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  opacity: op,
                  transform: `translateX(${rx}px)`,
                }}
              >
                <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 40, color: WHITE, letterSpacing: '-0.02em' }}>
                  {o.book}
                </div>
                <div
                  style={{
                    textAlign: 'center',
                    fontFamily: sans,
                    fontWeight: 900,
                    fontSize: 36,
                    color: o.color === GOLD ? GOLD : WHITE,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {o.fave}
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    fontFamily: sans,
                    fontWeight: 900,
                    fontSize: 56,
                    color: o.color === GOLD ? GOLD : WHITE,
                    letterSpacing: '-0.03em',
                    transform: `scale(${pulseScale})`,
                    transformOrigin: 'right center',
                  }}
                >
                  {o.line}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA bar */}
        <div
          style={{
            padding: '28px',
            backgroundColor: GOLD,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: finalOp,
            transform: `scale(${finalScale})`,
            transformOrigin: 'center bottom',
          }}
        >
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 20, letterSpacing: '0.32em', color: INK, textTransform: 'uppercase' }}>
            Total Action
          </div>
          <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 72, color: INK, letterSpacing: '-0.04em', lineHeight: 1 }}>
            $36
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// COMPOSITION
// Timeline (540f, 18s):
// 0-30    Hook "THE ODDS."                           (1s)
// 30-210  Ticker                                     (6s)
// 210-270 ClipBeat v1-01 closeup "MARKETS OPEN"     (2s)
// 270-420 OddsBoard                                  (5s)
// 420-480 ClipBeat v1-04 cinematic "MARKETS CLOSE"  (2s)
// 480-540 Outro                                      (2s)
// ============================================================================
const OddsHook: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 240 } });
  const scale = interpolate(p, [0, 0.5, 1], [1.6, 1.05, 1]);
  const op = clamp(frame, [0, 8], [0, 1]);
  const ruleW = clamp(frame, [6, 18], [0, 320]);
  const fade = clamp(frame, [duration - 5, duration], [1, 0]);
  return (
    <AbsoluteFill style={{ backgroundColor: INK, alignItems: 'center', justifyContent: 'center', opacity: fade }}>
      <div style={{ textAlign: 'center', opacity: op }}>
        <div style={{ width: ruleW, height: 8, backgroundColor: GOLD, margin: '0 auto 30px' }} />
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 280,
            letterSpacing: '-0.06em',
            color: WHITE,
            lineHeight: 0.9,
            transform: `scale(${scale})`,
          }}
        >
          THE
        </div>
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 280,
            letterSpacing: '-0.06em',
            color: GOLD,
            lineHeight: 0.9,
            transform: `scale(${scale})`,
          }}
        >
          ODDS.
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const LaunchUIOddsBoard: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Sequence from={0} durationInFrames={30}>
        <OddsHook duration={30} />
      </Sequence>

      <Sequence from={30} durationInFrames={180}>
        <Ticker duration={180} />
      </Sequence>

      <Sequence from={210} durationInFrames={60}>
        <ClipBeat
          src="launch-clips/clip-01-closeup.mp4"
          duration={60}
          startFrom={15}
          headline="MARKETS OPEN"
          sub="Back 9 · Live"
          accent
          position="bottom"
          volume={0.9}
        />
      </Sequence>

      <Sequence from={270} durationInFrames={150}>
        <OddsBoard duration={150} />
      </Sequence>

      <Sequence from={420} durationInFrames={60}>
        <ClipBeat
          src="launch-clips/clip-04-cinematic.mp4"
          duration={60}
          startFrom={25}
          headline="MARKETS CLOSE"
          sub="Tab Locked"
          position="bottom"
          volume={0.9}
        />
      </Sequence>

      <Sequence from={480} durationInFrames={60}>
        <Outro duration={60} />
      </Sequence>
    </AbsoluteFill>
  );
};
