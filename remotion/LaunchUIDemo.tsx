import React from 'react';
import {
  AbsoluteFill,
  Audio,
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
const SUBTLE = '#1A1A1A';
const LINE = '#2A2A2A';
const GREEN = '#34C759';
const RED = '#FF3B30';
const BLUE = '#0A84FF';

const clamp = (f: number, r: [number, number], o: [number, number]) =>
  interpolate(f, r, o, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// ============================================================================
// HOOK — 24f (0.8s)
// ============================================================================
const Hook: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 220 } });
  const y = interpolate(p, [0, 1], [40, 0]);
  const op = clamp(frame, [0, 8], [0, 1]);
  const fade = clamp(frame, [duration - 6, duration], [1, 0]);
  const ruleW = clamp(frame, [4, 16], [0, 220]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: INK,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fade,
      }}
    >
      <div style={{ textAlign: 'center', opacity: op, transform: `translateY(${y}px)` }}>
        <div
          style={{
            width: ruleW,
            height: 6,
            backgroundColor: GOLD,
            margin: '0 auto 32px',
          }}
        />
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 156,
            letterSpacing: '-0.05em',
            lineHeight: 0.92,
            color: WHITE,
          }}
        >
          WATCH IT
        </div>
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 156,
            letterSpacing: '-0.05em',
            lineHeight: 0.92,
            color: GOLD,
            marginTop: 4,
          }}
        >
          WORK.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// SCENE 1 — SCORECARD AUTOFILL — 150f (5.0s)
// ============================================================================
const players = [
  { name: 'You', hcp: 12 },
  { name: 'Mike', hcp: 8 },
  { name: 'John', hcp: 18 },
  { name: 'Dan', hcp: 14 },
];

const pars = [4, 5, 3, 4, 4, 3, 5, 4, 4]; // front 9
const scores = [
  [4, 5, 2, 5, 4, 3, 6, 4, 4], // You
  [5, 4, 3, 4, 5, 4, 5, 3, 4], // Mike — birdie hole 8
  [6, 6, 4, 5, 5, 4, 6, 5, 5], // John
  [4, 5, 3, 4, 4, 3, 5, 4, 5], // Dan — gross under
];

const Scorecard: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card slides up, scores slam in column by column, totals fill last
  const cardP = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
  const cardY = interpolate(cardP, [0, 1], [60, 0]);
  const cardOp = clamp(frame, [0, 8], [0, 1]);
  const fade = clamp(frame, [duration - 8, duration], [1, 0]);

  // Scores fill across 9 holes in 90 frames (3s) → ~10f per column
  const scoreStartFrame = 18;
  const perCol = 10;

  const totals = players.map((_, pi) => {
    const completedCols = Math.max(
      0,
      Math.min(9, Math.floor((frame - scoreStartFrame) / perCol)),
    );
    return scores[pi].slice(0, completedCols).reduce((a, b) => a + b, 0);
  });

  const totalsRevealed = clamp(frame, [scoreStartFrame + 95, scoreStartFrame + 105], [0, 1]);

  // Money below the card animating with current leader
  const moneyOp = clamp(frame, [scoreStartFrame + 110, scoreStartFrame + 122], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: INK,
        opacity: fade,
        padding: '160px 36px 0',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: sans,
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          color: GOLD,
          textAlign: 'center',
          marginBottom: 10,
          opacity: cardOp,
        }}
      >
        Live Scorecard
      </div>
      <div
        style={{
          fontFamily: sans,
          fontWeight: 900,
          fontSize: 64,
          letterSpacing: '-0.04em',
          color: WHITE,
          textAlign: 'center',
          marginBottom: 36,
          opacity: cardOp,
        }}
      >
        Front 9
      </div>

      {/* Card */}
      <div
        style={{
          backgroundColor: BG,
          borderRadius: 28,
          padding: '28px 24px',
          opacity: cardOp,
          transform: `translateY(${cardY}px)`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Hole row */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(9, 1fr) 90px', gap: 6, marginBottom: 8 }}>
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 18, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Hole</div>
          {pars.map((_, i) => (
            <div
              key={`h-${i}`}
              style={{
                fontFamily: sans,
                fontWeight: 800,
                fontSize: 24,
                color: INK,
                textAlign: 'center',
              }}
            >
              {i + 1}
            </div>
          ))}
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 18, color: MUTED, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Tot</div>
        </div>

        {/* Par row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px repeat(9, 1fr) 90px',
            gap: 6,
            paddingBottom: 14,
            borderBottom: `2px solid ${INK}`,
            marginBottom: 14,
          }}
        >
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 18, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Par</div>
          {pars.map((p, i) => (
            <div
              key={`p-${i}`}
              style={{
                fontFamily: sans,
                fontWeight: 600,
                fontSize: 22,
                color: MUTED,
                textAlign: 'center',
              }}
            >
              {p}
            </div>
          ))}
          <div style={{ fontFamily: sans, fontWeight: 800, fontSize: 22, color: INK, textAlign: 'right' }}>
            {pars.reduce((a, b) => a + b, 0)}
          </div>
        </div>

        {/* Player rows */}
        {players.map((pl, pi) => (
          <div
            key={pl.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '120px repeat(9, 1fr) 90px',
              gap: 6,
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: pi === players.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                fontFamily: sans,
                fontWeight: 800,
                fontSize: 24,
                color: INK,
                letterSpacing: '-0.02em',
              }}
            >
              {pl.name}
            </div>
            {scores[pi].map((s, i) => {
              const cellFrame = scoreStartFrame + i * perCol;
              const localF = frame - cellFrame;
              const cellP = spring({
                frame: localF,
                fps,
                config: { damping: 12, stiffness: 260, mass: 0.4 },
              });
              const cScale = interpolate(cellP, [0, 0.5, 1], [0, 1.25, 1]);
              const cellOp = clamp(localF, [0, 4], [0, 1]);
              const par = pars[i];
              const isBirdie = s < par;
              const isEagle = s <= par - 2;
              const isBogey = s > par;
              const ringColor = isEagle ? GOLD : isBirdie ? GOLD : isBogey ? '#E0E0E0' : 'transparent';
              const ringDouble = isEagle;
              return (
                <div
                  key={`s-${pi}-${i}`}
                  style={{
                    textAlign: 'center',
                    position: 'relative',
                    height: 38,
                    opacity: cellOp,
                  }}
                >
                  {/* circle/square overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      margin: 'auto',
                      width: 38,
                      height: 38,
                      borderRadius: isBogey ? 4 : 999,
                      border: ringColor === 'transparent' ? 'none' : `2.5px solid ${ringColor}`,
                      boxShadow: ringDouble ? `0 0 0 4px ${BG}, 0 0 0 6px ${GOLD}` : 'none',
                      backgroundColor: isBirdie || isEagle ? `${GOLD}33` : 'transparent',
                    }}
                  />
                  <div
                    style={{
                      fontFamily: sans,
                      fontWeight: 800,
                      fontSize: 24,
                      color: INK,
                      transform: `scale(${cScale})`,
                      lineHeight: '38px',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {s}
                  </div>
                </div>
              );
            })}
            {/* Total */}
            <div
              style={{
                textAlign: 'right',
                fontFamily: sans,
                fontWeight: 900,
                fontSize: 28,
                color: pi === 1 ? GOLD : INK,
                transform: `scale(${interpolate(totalsRevealed, [0, 1], [0.85, 1])})`,
                opacity: totalsRevealed,
              }}
            >
              {totals[pi]}
            </div>
          </div>
        ))}
      </div>

      {/* Live tally chip */}
      <div
        style={{
          marginTop: 28,
          opacity: moneyOp,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <Chip label="Nassau" value="Mike +$8" />
        <Chip label="Skins" value="3 carryover" />
        <Chip label="Stableford" value="Mike +14" gold />
      </div>
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ label: string; value: string; gold?: boolean }> = ({ label, value, gold }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 20px',
      borderRadius: 999,
      backgroundColor: gold ? GOLD : SUBTLE,
      border: gold ? 'none' : `1px solid ${LINE}`,
    }}
  >
    <div
      style={{
        fontFamily: sans,
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: gold ? INK : MUTED,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: sans,
        fontWeight: 900,
        fontSize: 18,
        color: gold ? INK : WHITE,
      }}
    >
      {value}
    </div>
  </div>
);

// ============================================================================
// SCENE 2 — MONEY TRACKER LIVE — 120f (4.0s)
// ============================================================================
const moneyTimeline = [
  // {atFrame, player, delta, reason}
  { at: 4, player: 1, delta: 5, reason: 'Skin · H1' },
  { at: 18, player: 0, delta: 3, reason: 'CTP · H3' },
  { at: 30, player: 1, delta: 5, reason: 'Birdie · H4' },
  { at: 42, player: 3, delta: 5, reason: 'Skin · H5' },
  { at: 54, player: 1, delta: 8, reason: 'Press · H6' },
  { at: 66, player: 0, delta: 4, reason: 'Front 9' },
  { at: 78, player: 1, delta: 12, reason: 'Birdie · H8' },
  { at: 90, player: 3, delta: 6, reason: 'Sandie' },
];

const initial = [0, 0, 0, 0];

const MoneyTracker: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardOp = clamp(frame, [0, 8], [0, 1]);
  const fade = clamp(frame, [duration - 8, duration], [1, 0]);

  // Compute running totals up to current frame
  const totals = [...initial];
  const losers = [0, 0, 0, 0]; // others lose collectively to keep balance simple
  for (const e of moneyTimeline) {
    if (frame >= e.at) {
      totals[e.player] += e.delta;
      // Distribute loss equally to other players
      for (let i = 0; i < 4; i++) {
        if (i !== e.player) losers[i] += e.delta / 3;
      }
    }
  }
  const balances = totals.map((t, i) => t - losers[i]);

  // Find latest event for floater
  let activeEvent = null as null | { e: (typeof moneyTimeline)[number]; localF: number };
  for (const e of moneyTimeline) {
    const localF = frame - e.at;
    if (localF >= 0 && localF < 22) activeEvent = { e, localF };
  }

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: fade, padding: '180px 36px 0' }}>
      <div
        style={{
          fontFamily: sans,
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          color: GOLD,
          textAlign: 'center',
          marginBottom: 10,
          opacity: cardOp,
        }}
      >
        Money · Live
      </div>
      <div
        style={{
          fontFamily: sans,
          fontWeight: 900,
          fontSize: 64,
          letterSpacing: '-0.04em',
          color: WHITE,
          textAlign: 'center',
          marginBottom: 40,
          opacity: cardOp,
        }}
      >
        Running Tab
      </div>

      <div
        style={{
          backgroundColor: BG,
          borderRadius: 28,
          padding: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          opacity: cardOp,
          position: 'relative',
        }}
      >
        {players.map((p, pi) => {
          const bal = balances[pi];
          const isUp = bal > 0;
          const isFlat = bal === 0;
          // Pulse when this player's event just fired
          const pulseEvent = moneyTimeline.find(
            (e) => e.player === pi && frame >= e.at && frame < e.at + 14,
          );
          const pulseT = pulseEvent ? (frame - pulseEvent.at) / 14 : 1;
          const pulseScale = interpolate(pulseT, [0, 0.4, 1], [1, 1.06, 1]);
          return (
            <div
              key={p.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '54px 1fr 200px',
                alignItems: 'center',
                gap: 18,
                padding: '20px 4px',
                borderBottom: pi === players.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.06)',
                transform: `scale(${pulseScale})`,
                transformOrigin: 'left center',
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 999,
                  backgroundColor: pi === 1 ? GOLD : '#E5E5E0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: sans,
                  fontWeight: 900,
                  fontSize: 24,
                  color: INK,
                }}
              >
                {p.name[0]}
              </div>
              <div
                style={{
                  fontFamily: sans,
                  fontWeight: 800,
                  fontSize: 32,
                  color: INK,
                  letterSpacing: '-0.02em',
                }}
              >
                {p.name}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: sans,
                    fontWeight: 900,
                    fontSize: 44,
                    color: isFlat ? MUTED : isUp ? GREEN : RED,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  {isUp ? '+' : ''}${bal.toFixed(0)}
                </div>
              </div>
            </div>
          );
        })}

        {/* Floater for active event */}
        {activeEvent && (
          <FloatBubble e={activeEvent.e} localF={activeEvent.localF} />
        )}
      </div>
    </AbsoluteFill>
  );
};

const FloatBubble: React.FC<{
  e: (typeof moneyTimeline)[number];
  localF: number;
}> = ({ e, localF }) => {
  const op = Math.min(clamp(localF, [0, 4], [0, 1]), clamp(localF, [16, 22], [1, 0]));
  const y = interpolate(localF, [0, 22], [0, -80]);
  // Pin to player row roughly
  const top = 80 + e.player * 90;
  return (
    <div
      style={{
        position: 'absolute',
        top,
        right: 36,
        fontFamily: sans,
        fontWeight: 900,
        fontSize: 36,
        color: GREEN,
        opacity: op,
        transform: `translateY(${y}px)`,
        textShadow: '0 4px 18px rgba(52,199,89,0.4)',
      }}
    >
      +${e.delta}
      <div
        style={{
          fontFamily: sans,
          fontWeight: 700,
          fontSize: 12,
          color: MUTED,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          textAlign: 'right',
          marginTop: 2,
        }}
      >
        {e.reason}
      </div>
    </div>
  );
};

// ============================================================================
// SCENE 3 — VOICE SCORING — 120f (4.0s)
// ============================================================================
const voiceScript = [
  { at: 14, text: 'Mike five.', target: { row: 1, col: 0 }, score: 5 },
  { at: 36, text: 'John birdie.', target: { row: 2, col: 0 }, score: 3 },
  { at: 60, text: 'Dan par.', target: { row: 3, col: 0 }, score: 4 },
  { at: 84, text: 'I made eagle.', target: { row: 0, col: 0 }, score: 2 },
];
const voicePar = 4;

const Voice: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const cardOp = clamp(frame, [0, 8], [0, 1]);
  const fade = clamp(frame, [duration - 8, duration], [1, 0]);

  // Active transcript
  let transcript = '';
  let activeAt = -100;
  for (const v of voiceScript) {
    const localF = frame - v.at;
    if (localF >= 0 && localF < 16) {
      transcript = v.text;
      activeAt = v.at;
    }
  }
  const transOp = transcript ? clamp(frame - activeAt, [0, 4], [0, 1]) : 0;

  // Bars for waveform — animate based on frame
  const bars = Array.from({ length: 16 }, (_, i) => {
    const phase = (frame * 0.45 + i * 0.7) % (Math.PI * 2);
    const h = 18 + Math.abs(Math.sin(phase)) * 70;
    return h;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: fade, padding: '180px 36px 0' }}>
      <div
        style={{
          fontFamily: sans,
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          color: GOLD,
          textAlign: 'center',
          marginBottom: 10,
          opacity: cardOp,
        }}
      >
        Voice
      </div>
      <div
        style={{
          fontFamily: sans,
          fontWeight: 900,
          fontSize: 64,
          letterSpacing: '-0.04em',
          color: WHITE,
          textAlign: 'center',
          marginBottom: 28,
          opacity: cardOp,
        }}
      >
        Just say it.
      </div>

      {/* Waveform card */}
      <div
        style={{
          backgroundColor: SUBTLE,
          border: `1px solid ${LINE}`,
          borderRadius: 28,
          padding: '34px 24px',
          opacity: cardOp,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            height: 100,
          }}
        >
          {bars.map((h, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: h,
                backgroundColor: GOLD,
                borderRadius: 4,
              }}
            />
          ))}
        </div>
        <div
          style={{
            marginTop: 22,
            fontFamily: sans,
            fontWeight: 800,
            fontSize: 36,
            color: WHITE,
            textAlign: 'center',
            opacity: transOp,
            minHeight: 50,
            letterSpacing: '-0.02em',
          }}
        >
          {transcript || ' '}
        </div>
      </div>

      {/* Mini scorecard */}
      <div
        style={{
          backgroundColor: BG,
          borderRadius: 28,
          padding: '20px 24px',
          opacity: cardOp,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: MUTED,
            marginBottom: 12,
          }}
        >
          Hole 7 · Par 4
        </div>
        {players.map((pl, pi) => {
          const v = voiceScript.find((vs) => vs.target.row === pi);
          const filled = v ? frame >= v.at + 8 : false;
          const localF = v ? frame - (v.at + 8) : -1;
          const sp = filled ? interpolate(localF, [0, 6], [0, 1], { extrapolateRight: 'clamp' }) : 0;
          const cellScale = interpolate(sp, [0, 0.5, 1], [0.4, 1.2, 1]);
          const par = voicePar;
          const score = v?.score ?? 0;
          const isBirdie = score < par && score > 0;
          const isEagle = score <= par - 2 && score > 0;
          return (
            <div
              key={pl.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 90px',
                alignItems: 'center',
                padding: '14px 0',
                borderBottom: pi === players.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <div
                style={{
                  fontFamily: sans,
                  fontWeight: 800,
                  fontSize: 28,
                  color: INK,
                }}
              >
                {pl.name}
              </div>
              <div style={{ textAlign: 'right', position: 'relative', height: 50 }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    margin: 'auto',
                    width: 50,
                    height: 50,
                    right: 0,
                    left: 'auto',
                    borderRadius: 999,
                    border: filled && (isBirdie || isEagle) ? `2.5px solid ${GOLD}` : 'none',
                    backgroundColor: filled && (isBirdie || isEagle) ? `${GOLD}33` : 'transparent',
                    boxShadow: isEagle && filled ? `0 0 0 4px ${BG}, 0 0 0 6px ${GOLD}` : 'none',
                  }}
                />
                <div
                  style={{
                    fontFamily: sans,
                    fontWeight: 900,
                    fontSize: 32,
                    color: INK,
                    lineHeight: '50px',
                    transform: `scale(${cellScale})`,
                    opacity: filled ? 1 : 0.15,
                    position: 'relative',
                  }}
                >
                  {filled ? score : '—'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// SCENE 4 — SETTLEMENT — 90f (3.0s)
// ============================================================================
const settlements = [
  { from: 'You', to: 'Mike', amount: 12 },
  { from: 'John', to: 'Mike', amount: 18 },
  { from: 'John', to: 'Dan', amount: 6 },
];

const Settlement: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardOp = clamp(frame, [0, 10], [0, 1]);
  const fade = clamp(frame, [duration - 8, duration], [1, 0]);

  const stampP = spring({
    frame: frame - 60,
    fps,
    config: { damping: 8, stiffness: 240, mass: 0.6 },
  });
  const stampScale = interpolate(stampP, [0, 0.5, 1], [2.5, 1.1, 1]);
  const stampRot = interpolate(stampP, [0, 1], [-18, -8]);
  const stampOp = clamp(frame, [60, 70], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: fade, padding: '200px 36px 0' }}>
      <div
        style={{
          fontFamily: sans,
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          color: GOLD,
          textAlign: 'center',
          marginBottom: 10,
          opacity: cardOp,
        }}
      >
        Settle Up
      </div>
      <div
        style={{
          fontFamily: sans,
          fontWeight: 900,
          fontSize: 88,
          letterSpacing: '-0.045em',
          color: WHITE,
          textAlign: 'center',
          marginBottom: 48,
          opacity: cardOp,
          lineHeight: 0.95,
        }}
      >
        Done.
      </div>

      <div
        style={{
          backgroundColor: BG,
          borderRadius: 28,
          padding: '36px 28px',
          opacity: cardOp,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        {settlements.map((s, i) => {
          const startF = 14 + i * 14;
          const localF = frame - startF;
          const rowOp = clamp(localF, [0, 8], [0, 1]);
          const arrowDraw = clamp(localF, [4, 16], [0, 1]);
          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 1fr 140px',
                alignItems: 'center',
                gap: 12,
                padding: '22px 0',
                borderBottom: i === settlements.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.06)',
                opacity: rowOp,
              }}
            >
              <div
                style={{
                  fontFamily: sans,
                  fontWeight: 800,
                  fontSize: 36,
                  color: INK,
                  letterSpacing: '-0.02em',
                }}
              >
                {s.from}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    width: arrowDraw * 56,
                    height: 4,
                    backgroundColor: INK,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      right: -2,
                      top: -8,
                      width: 0,
                      height: 0,
                      borderTop: '10px solid transparent',
                      borderBottom: '10px solid transparent',
                      borderLeft: `14px solid ${INK}`,
                      opacity: arrowDraw,
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  fontFamily: sans,
                  fontWeight: 800,
                  fontSize: 36,
                  color: INK,
                  letterSpacing: '-0.02em',
                }}
              >
                {s.to}
              </div>
              <div
                style={{
                  fontFamily: sans,
                  fontWeight: 900,
                  fontSize: 44,
                  color: GREEN,
                  textAlign: 'right',
                  letterSpacing: '-0.02em',
                }}
              >
                ${s.amount}
              </div>
            </div>
          );
        })}

        {/* SETTLED stamp */}
        <div
          style={{
            position: 'absolute',
            right: 24,
            bottom: 18,
            transform: `rotate(${stampRot}deg) scale(${stampScale})`,
            opacity: stampOp,
            border: `5px solid ${GREEN}`,
            padding: '10px 22px',
            borderRadius: 10,
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 36,
            color: GREEN,
            letterSpacing: '0.08em',
          }}
        >
          PAID
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// MATCH OUTRO — 36f (1.2s)
// ============================================================================
const Outro: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 220 } });
  const scale = interpolate(p, [0, 0.5, 1], [1.6, 1.05, 1]);
  const op = clamp(frame, [0, 8], [0, 1]);
  const ruleW = clamp(frame, [10, 22], [0, 280]);
  const tagOp = clamp(frame, [16, 28], [0, 1]);
  const fade = clamp(frame, [duration - 6, duration], [1, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fade,
      }}
    >
      <div style={{ textAlign: 'center', opacity: op }}>
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 280,
            letterSpacing: '-0.06em',
            lineHeight: 1,
            color: INK,
            transform: `scale(${scale})`,
            display: 'inline-block',
          }}
        >
          MATCH
        </div>
        <div
          style={{
            width: ruleW,
            height: 6,
            backgroundColor: GOLD,
            margin: '36px auto 0',
          }}
        />
        <div
          style={{
            marginTop: 32,
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            color: MUTED,
            opacity: tagOp,
          }}
        >
          Score · Bet · Settle Up
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// MAIN COMPOSITION — 540 frames = 18s
// ============================================================================
//   0   24f  HOOK         "WATCH IT WORK."
//  24  150f  SCORECARD    autofill 9 holes + totals
// 174  120f  MONEY        running tab updating live
// 294  120f  VOICE        waveform + transcript + score reveal
// 414   90f  SETTLEMENT   arrows + PAID stamp
// 504   36f  OUTRO        MATCH cream

export const LAUNCH_UI_DEMO_DURATION = 540;

export const LaunchUIDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Audio src={staticFile('launch-clips/sfx-uidemo.mp3')} />

      <Sequence from={0} durationInFrames={24}>
        <Hook duration={24} />
      </Sequence>

      <Sequence from={24} durationInFrames={150}>
        <Scorecard duration={150} />
      </Sequence>

      <Sequence from={174} durationInFrames={120}>
        <MoneyTracker duration={120} />
      </Sequence>

      <Sequence from={294} durationInFrames={120}>
        <Voice duration={120} />
      </Sequence>

      <Sequence from={414} durationInFrames={90}>
        <Settlement duration={90} />
      </Sequence>

      <Sequence from={504} durationInFrames={36}>
        <Outro duration={36} />
      </Sequence>
    </AbsoluteFill>
  );
};
