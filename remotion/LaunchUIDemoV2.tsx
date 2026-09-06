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

const clamp = (f: number, r: [number, number], o: [number, number]) =>
  interpolate(f, r, o, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// ============================================================================
// HOOK — 24f
// ============================================================================
const Hook: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 220 } });
  const y = interpolate(p, [0, 1], [40, 0]);
  const op = clamp(frame, [0, 8], [0, 1]);
  const fade = clamp(frame, [duration - 6, duration], [1, 0]);
  const ruleW = clamp(frame, [4, 16], [0, 280]);

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
            height: 8,
            backgroundColor: GOLD,
            margin: '0 auto 40px',
          }}
        />
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 200,
            letterSpacing: '-0.05em',
            lineHeight: 0.9,
            color: WHITE,
          }}
        >
          WATCH IT
        </div>
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 200,
            letterSpacing: '-0.05em',
            lineHeight: 0.9,
            color: GOLD,
            marginTop: 6,
          }}
        >
          WORK.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// SCENE 1 — FULL-BLEED SCORECARD — 150f
// ============================================================================
const players = [
  { name: 'You', hcp: 12 },
  { name: 'Mike', hcp: 8 },
  { name: 'John', hcp: 18 },
  { name: 'Dan', hcp: 14 },
];

const pars = [4, 5, 3, 4, 4, 3, 5, 4, 4];
const scores = [
  [4, 5, 2, 5, 4, 3, 6, 4, 4],
  [5, 4, 3, 4, 5, 4, 5, 3, 4],
  [6, 6, 4, 5, 5, 4, 6, 5, 5],
  [4, 5, 3, 4, 4, 3, 5, 4, 5],
];

const SectionEyebrow: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      fontFamily: sans,
      fontWeight: 700,
      fontSize: 28,
      letterSpacing: '0.42em',
      textTransform: 'uppercase',
      color: GOLD,
      textAlign: 'center',
      marginBottom: 14,
    }}
  >
    {text}
  </div>
);

const SectionTitle: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      fontFamily: sans,
      fontWeight: 900,
      fontSize: 96,
      letterSpacing: '-0.045em',
      color: WHITE,
      textAlign: 'center',
      lineHeight: 0.95,
    }}
  >
    {text}
  </div>
);

const Scorecard: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardP = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
  const cardY = interpolate(cardP, [0, 1], [80, 0]);
  const cardOp = clamp(frame, [0, 8], [0, 1]);
  const fade = clamp(frame, [duration - 8, duration], [1, 0]);

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
  const chipsOp = clamp(frame, [scoreStartFrame + 110, scoreStartFrame + 122], [0, 1]);

  const leader = totals.indexOf(Math.min(...totals.filter((t) => t > 0)));

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: fade, padding: '60px 16px 24px' }}>
      <div style={{ marginTop: 40, opacity: cardOp }}>
        <SectionEyebrow text="Live Scorecard" />
        <SectionTitle text="Front 9" />
      </div>

      <div
        style={{
          backgroundColor: BG,
          borderRadius: 36,
          padding: '40px 28px',
          marginTop: 40,
          opacity: cardOp,
          transform: `translateY(${cardY}px)`,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Hole row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '140px repeat(9, 1fr) 110px',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 22,
              color: MUTED,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
            }}
          >
            Hole
          </div>
          {pars.map((_, i) => (
            <div
              key={`h-${i}`}
              style={{
                fontFamily: sans,
                fontWeight: 800,
                fontSize: 30,
                color: INK,
                textAlign: 'center',
              }}
            >
              {i + 1}
            </div>
          ))}
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 22,
              color: MUTED,
              textAlign: 'right',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
            }}
          >
            Tot
          </div>
        </div>

        {/* Par row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '140px repeat(9, 1fr) 110px',
            gap: 8,
            paddingBottom: 18,
            borderBottom: `3px solid ${INK}`,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 22,
              color: MUTED,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
            }}
          >
            Par
          </div>
          {pars.map((p, i) => (
            <div
              key={`p-${i}`}
              style={{
                fontFamily: sans,
                fontWeight: 600,
                fontSize: 28,
                color: MUTED,
                textAlign: 'center',
              }}
            >
              {p}
            </div>
          ))}
          <div
            style={{
              fontFamily: sans,
              fontWeight: 800,
              fontSize: 28,
              color: INK,
              textAlign: 'right',
            }}
          >
            {pars.reduce((a, b) => a + b, 0)}
          </div>
        </div>

        {/* Player rows — flex to fill */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {players.map((pl, pi) => (
            <div
              key={pl.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px repeat(9, 1fr) 110px',
                gap: 8,
                alignItems: 'center',
                padding: '20px 0',
                borderBottom: pi === players.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.08)',
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
                const ringColor = isEagle || isBirdie ? GOLD : isBogey ? '#D8D8D0' : 'transparent';
                return (
                  <div
                    key={`s-${pi}-${i}`}
                    style={{
                      textAlign: 'center',
                      position: 'relative',
                      height: 50,
                      opacity: cellOp,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        margin: 'auto',
                        width: 50,
                        height: 50,
                        borderRadius: isBogey ? 6 : 999,
                        border: ringColor === 'transparent' ? 'none' : `3px solid ${ringColor}`,
                        boxShadow: isEagle ? `0 0 0 5px ${BG}, 0 0 0 8px ${GOLD}` : 'none',
                        backgroundColor: isBirdie || isEagle ? `${GOLD}33` : 'transparent',
                      }}
                    />
                    <div
                      style={{
                        fontFamily: sans,
                        fontWeight: 800,
                        fontSize: 30,
                        color: INK,
                        transform: `scale(${cScale})`,
                        lineHeight: '50px',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {s}
                    </div>
                  </div>
                );
              })}
              <div
                style={{
                  textAlign: 'right',
                  fontFamily: sans,
                  fontWeight: 900,
                  fontSize: 38,
                  color: pi === leader ? GOLD : INK,
                  transform: `scale(${interpolate(totalsRevealed, [0, 1], [0.85, 1])})`,
                  opacity: totalsRevealed,
                  backgroundColor: pi === leader ? INK : 'transparent',
                  padding: pi === leader ? '4px 12px' : '4px 12px',
                  borderRadius: 8,
                }}
              >
                {totals[pi]}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom strip — bet chips */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'space-between',
            marginTop: 18,
            paddingTop: 22,
            borderTop: `2px solid ${INK}`,
            opacity: chipsOp,
          }}
        >
          <Chip label="Nassau" value="Mike +$8" />
          <Chip label="Skins" value="3 Carry" />
          <Chip label="Stableford" value="Mike +14" gold />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ label: string; value: string; gold?: boolean }> = ({ label, value, gold }) => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '14px 12px',
      borderRadius: 18,
      backgroundColor: gold ? GOLD : '#EDEDE6',
    }}
  >
    <div
      style={{
        fontFamily: sans,
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: '0.2em',
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
        fontSize: 26,
        color: INK,
      }}
    >
      {value}
    </div>
  </div>
);

// ============================================================================
// SCENE 2 — MONEY TRACKER — 120f
// ============================================================================
const moneyTimeline = [
  { at: 4, player: 1, delta: 5, reason: 'Skin · H1' },
  { at: 18, player: 0, delta: 3, reason: 'CTP · H3' },
  { at: 30, player: 1, delta: 5, reason: 'Birdie · H4' },
  { at: 42, player: 3, delta: 5, reason: 'Skin · H5' },
  { at: 54, player: 1, delta: 8, reason: 'Press · H6' },
  { at: 66, player: 0, delta: 4, reason: 'Front 9' },
  { at: 78, player: 1, delta: 12, reason: 'Birdie · H8' },
  { at: 90, player: 3, delta: 6, reason: 'Sandie' },
];

const MoneyTracker: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const cardOp = clamp(frame, [0, 8], [0, 1]);
  const fade = clamp(frame, [duration - 8, duration], [1, 0]);

  const totals = [0, 0, 0, 0];
  const losers = [0, 0, 0, 0];
  let totalPot = 0;
  for (const e of moneyTimeline) {
    if (frame >= e.at) {
      totals[e.player] += e.delta;
      totalPot += e.delta;
      for (let i = 0; i < 4; i++) {
        if (i !== e.player) losers[i] += e.delta / 3;
      }
    }
  }
  const balances = totals.map((t, i) => t - losers[i]);
  const maxAbs = Math.max(...balances.map((b) => Math.abs(b)), 1);

  let activeEvent = null as null | { e: (typeof moneyTimeline)[number]; localF: number };
  for (const e of moneyTimeline) {
    const localF = frame - e.at;
    if (localF >= 0 && localF < 22) activeEvent = { e, localF };
  }

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: fade, padding: '60px 16px 24px' }}>
      <div style={{ marginTop: 40, opacity: cardOp }}>
        <SectionEyebrow text="Money · Live" />
        <SectionTitle text="Running Tab" />
      </div>

      {/* Pot strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '32px 12px 24px',
          padding: '24px 28px',
          backgroundColor: SUBTLE,
          borderRadius: 22,
          border: `1px solid ${LINE}`,
          opacity: cardOp,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            Pot Moved
          </div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 900,
              fontSize: 56,
              color: WHITE,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            ${totalPot}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            Hole
          </div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 900,
              fontSize: 56,
              color: GOLD,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            8 / 18
          </div>
        </div>
      </div>

      {/* Player card — flex to fill */}
      <div
        style={{
          backgroundColor: BG,
          borderRadius: 36,
          padding: '20px 28px',
          opacity: cardOp,
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        {players.map((p, pi) => {
          const bal = balances[pi];
          const isUp = bal > 0;
          const isFlat = bal === 0;
          const pulseEvent = moneyTimeline.find(
            (e) => e.player === pi && frame >= e.at && frame < e.at + 14,
          );
          const pulseT = pulseEvent ? (frame - pulseEvent.at) / 14 : 1;
          const pulseScale = interpolate(pulseT, [0, 0.4, 1], [1, 1.05, 1]);
          const barW = (Math.abs(bal) / maxAbs) * 100;
          return (
            <div
              key={p.name}
              style={{
                padding: '18px 0',
                borderBottom: pi === players.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.06)',
                transform: `scale(${pulseScale})`,
                transformOrigin: 'left center',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '76px 1fr 240px',
                  alignItems: 'center',
                  gap: 22,
                }}
              >
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 999,
                    backgroundColor: pi === 1 ? GOLD : '#E5E5E0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: sans,
                    fontWeight: 900,
                    fontSize: 36,
                    color: INK,
                  }}
                >
                  {p.name[0]}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: sans,
                      fontWeight: 900,
                      fontSize: 44,
                      color: INK,
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontFamily: sans,
                      fontWeight: 700,
                      fontSize: 18,
                      color: MUTED,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      marginTop: 4,
                    }}
                  >
                    HCP {p.hcp}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontFamily: sans,
                      fontWeight: 900,
                      fontSize: 64,
                      color: isFlat ? MUTED : isUp ? GREEN : RED,
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                    }}
                  >
                    {isUp ? '+' : ''}${bal.toFixed(0)}
                  </div>
                </div>
              </div>
              {/* Bar */}
              <div
                style={{
                  marginTop: 14,
                  height: 8,
                  backgroundColor: '#E5E5E0',
                  borderRadius: 4,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${barW}%`,
                    backgroundColor: isFlat ? MUTED : isUp ? GREEN : RED,
                    borderRadius: 4,
                    transition: 'width 200ms',
                  }}
                />
              </div>
            </div>
          );
        })}

        {activeEvent && <FloatBubble e={activeEvent.e} localF={activeEvent.localF} />}
      </div>
    </AbsoluteFill>
  );
};

const FloatBubble: React.FC<{
  e: (typeof moneyTimeline)[number];
  localF: number;
}> = ({ e, localF }) => {
  const op = Math.min(clamp(localF, [0, 4], [0, 1]), clamp(localF, [16, 22], [1, 0]));
  const y = interpolate(localF, [0, 22], [0, -90]);
  const top = 56 + e.player * 195;
  return (
    <div
      style={{
        position: 'absolute',
        top,
        right: 36,
        fontFamily: sans,
        fontWeight: 900,
        fontSize: 48,
        color: GREEN,
        opacity: op,
        transform: `translateY(${y}px)`,
        textShadow: '0 4px 22px rgba(52,199,89,0.5)',
      }}
    >
      +${e.delta}
      <div
        style={{
          fontFamily: sans,
          fontWeight: 700,
          fontSize: 14,
          color: MUTED,
          letterSpacing: '0.2em',
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
// SCENE 3 — VOICE — 120f
// ============================================================================
const voiceScript = [
  { at: 14, text: 'Mike five.', target: 1, score: 5 },
  { at: 36, text: 'John birdie.', target: 2, score: 3 },
  { at: 60, text: 'Dan par.', target: 3, score: 4 },
  { at: 84, text: 'I made eagle.', target: 0, score: 2 },
];
const voicePar = 4;

const Voice: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const cardOp = clamp(frame, [0, 8], [0, 1]);
  const fade = clamp(frame, [duration - 8, duration], [1, 0]);

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

  const bars = Array.from({ length: 22 }, (_, i) => {
    const phase = (frame * 0.45 + i * 0.7) % (Math.PI * 2);
    const h = 22 + Math.abs(Math.sin(phase)) * 110;
    return h;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: fade, padding: '60px 16px 24px' }}>
      <div style={{ marginTop: 40, opacity: cardOp }}>
        <SectionEyebrow text="Voice" />
        <SectionTitle text="Just say it." />
      </div>

      {/* Waveform card — large */}
      <div
        style={{
          backgroundColor: SUBTLE,
          border: `1px solid ${LINE}`,
          borderRadius: 36,
          padding: '40px 28px',
          opacity: cardOp,
          marginTop: 36,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            height: 160,
          }}
        >
          {bars.map((h, i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: h,
                backgroundColor: GOLD,
                borderRadius: 6,
              }}
            />
          ))}
        </div>
        <div
          style={{
            marginTop: 28,
            fontFamily: sans,
            fontWeight: 800,
            fontSize: 56,
            color: WHITE,
            textAlign: 'center',
            opacity: transOp,
            minHeight: 70,
            letterSpacing: '-0.02em',
          }}
        >
          {transcript || ' '}
        </div>
      </div>

      {/* Mini scorecard — flex fill */}
      <div
        style={{
          backgroundColor: BG,
          borderRadius: 36,
          padding: '24px 28px',
          opacity: cardOp,
          marginTop: 24,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: MUTED,
            marginBottom: 8,
          }}
        >
          Hole 7 · Par 4
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {players.map((pl, pi) => {
            const v = voiceScript.find((vs) => vs.target === pi);
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
                  gridTemplateColumns: '1fr 110px',
                  alignItems: 'center',
                  padding: '18px 0',
                  borderBottom: pi === players.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <div
                  style={{
                    fontFamily: sans,
                    fontWeight: 800,
                    fontSize: 42,
                    color: INK,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {pl.name}
                </div>
                <div style={{ textAlign: 'right', position: 'relative', height: 70 }}>
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 70,
                      height: 70,
                      borderRadius: 999,
                      border: filled && (isBirdie || isEagle) ? `3px solid ${GOLD}` : 'none',
                      backgroundColor: filled && (isBirdie || isEagle) ? `${GOLD}33` : 'transparent',
                      boxShadow: isEagle && filled ? `0 0 0 5px ${BG}, 0 0 0 8px ${GOLD}` : 'none',
                    }}
                  />
                  <div
                    style={{
                      fontFamily: sans,
                      fontWeight: 900,
                      fontSize: 44,
                      color: INK,
                      lineHeight: '70px',
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
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// SCENE 4 — SETTLEMENT — 90f
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

  const totalMoved = settlements.reduce((a, b) => a + b.amount, 0);

  const stampP = spring({
    frame: frame - 60,
    fps,
    config: { damping: 8, stiffness: 240, mass: 0.6 },
  });
  const stampScale = interpolate(stampP, [0, 0.5, 1], [2.5, 1.1, 1]);
  const stampRot = interpolate(stampP, [0, 1], [-18, -8]);
  const stampOp = clamp(frame, [60, 70], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: fade, padding: '60px 16px 24px' }}>
      <div style={{ marginTop: 40, opacity: cardOp }}>
        <SectionEyebrow text="Settle Up" />
        <SectionTitle text="Done." />
      </div>

      {/* Header strip — total moved */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '32px 12px 24px',
          padding: '28px',
          backgroundColor: SUBTLE,
          borderRadius: 22,
          border: `1px solid ${LINE}`,
          opacity: cardOp,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            Final Tab
          </div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 900,
              fontSize: 64,
              color: GREEN,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            ${totalMoved}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: MUTED,
            }}
          >
            Players
          </div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 900,
              fontSize: 64,
              color: WHITE,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            4
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: BG,
          borderRadius: 36,
          padding: '32px 28px',
          opacity: cardOp,
          position: 'relative',
          overflow: 'hidden',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        {settlements.map((s, i) => {
          const startF = 14 + i * 14;
          const localF = frame - startF;
          const rowOp = clamp(localF, [0, 8], [0, 1]);
          const arrowDraw = clamp(localF, [4, 18], [0, 1]);
          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 1fr 180px',
                alignItems: 'center',
                gap: 14,
                padding: '24px 0',
                borderBottom: i === settlements.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.06)',
                opacity: rowOp,
              }}
            >
              <div
                style={{
                  fontFamily: sans,
                  fontWeight: 900,
                  fontSize: 56,
                  color: INK,
                  letterSpacing: '-0.02em',
                }}
              >
                {s.from}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    width: arrowDraw * 76,
                    height: 6,
                    backgroundColor: INK,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      right: -2,
                      top: -10,
                      width: 0,
                      height: 0,
                      borderTop: '13px solid transparent',
                      borderBottom: '13px solid transparent',
                      borderLeft: `18px solid ${INK}`,
                      opacity: arrowDraw,
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  fontFamily: sans,
                  fontWeight: 900,
                  fontSize: 56,
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
                  fontSize: 64,
                  color: GREEN,
                  textAlign: 'right',
                  letterSpacing: '-0.03em',
                }}
              >
                ${s.amount}
              </div>
            </div>
          );
        })}

        <div
          style={{
            position: 'absolute',
            right: 36,
            bottom: 28,
            transform: `rotate(${stampRot}deg) scale(${stampScale})`,
            opacity: stampOp,
            border: `6px solid ${GREEN}`,
            padding: '14px 28px',
            borderRadius: 12,
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 48,
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
// OUTRO — 36f
// ============================================================================
const Outro: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 220 } });
  const scale = interpolate(p, [0, 0.5, 1], [1.6, 1.05, 1]);
  const op = clamp(frame, [0, 8], [0, 1]);
  const ruleW = clamp(frame, [10, 22], [0, 320]);
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
            fontSize: 320,
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
            height: 8,
            backgroundColor: GOLD,
            margin: '40px auto 0',
          }}
        />
        <div
          style={{
            marginTop: 36,
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            color: MUTED,
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
export const LAUNCH_UI_DEMO_V2_DURATION = 540;

export const LaunchUIDemoV2: React.FC = () => {
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
