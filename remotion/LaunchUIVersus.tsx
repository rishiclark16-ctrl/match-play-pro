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

export const LAUNCH_UI_VERSUS_DURATION = 540;

// ============================================================================
// SCENE 1 — BATTLE CARD (head-to-head duel, 180f)
// 2 players face off. Per-hole flips with gold "winner" chip.
// ============================================================================
const duel = {
  left: { name: 'MIKE', hcp: 8, color: GOLD },
  right: { name: 'YOU', hcp: 12, color: WHITE },
};
// scores per hole, 9 holes (front 9)
const duelScores = [
  [4, 5, 2, 4, 4, 3, 5, 3, 4], // Mike
  [4, 5, 3, 5, 4, 3, 5, 4, 4], // You
];
// winner per hole: 'L' | 'R' | 'T'
const winners = duelScores[0].map((s, i) => {
  const t = duelScores[1][i];
  if (s < t) return 'L';
  if (t < s) return 'R';
  return 'T';
});

const BattleCard: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const introP = spring({ frame, fps, config: { damping: 14, stiffness: 200 } });
  const introY = interpolate(introP, [0, 1], [60, 0]);
  const introOp = clamp(frame, [0, 10], [0, 1]);
  const fade = clamp(frame, [duration - 8, duration], [1, 0]);

  const holeStart = 20;
  const holePer = 16;

  // running holes won
  let lw = 0;
  let rw = 0;
  const revealed: ('L' | 'R' | 'T' | null)[] = Array(9).fill(null);
  for (let i = 0; i < 9; i++) {
    if (frame >= holeStart + i * holePer) {
      revealed[i] = winners[i];
      if (winners[i] === 'L') lw++;
      else if (winners[i] === 'R') rw++;
    }
  }

  // Final slam at end
  const slamF = holeStart + 9 * holePer + 6;
  const slamP = spring({ frame: frame - slamF, fps, config: { damping: 8, stiffness: 240 } });
  const slamScale = interpolate(slamP, [0, 0.4, 1], [1.6, 1.08, 1]);
  const slamOp = clamp(frame, [slamF, slamF + 10], [0, 1]);

  // Lightning divider — energy bar in middle
  const energyW = clamp(frame, [6, 16], [0, 12]);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: fade, padding: '54px 56px 40px' }}>
      <div style={{ textAlign: 'center', opacity: introOp, marginTop: 20 }}>
        <div
          style={{
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: '0.48em',
            textTransform: 'uppercase',
            color: GOLD,
            marginBottom: 10,
          }}
        >
          Match Play · Front 9
        </div>
        <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 120, letterSpacing: '-0.055em', color: WHITE, lineHeight: 0.9 }}>
          HEAD TO HEAD
        </div>
      </div>

      {/* VS header row */}
      <div
        style={{
          marginTop: 36,
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 16,
          opacity: introOp,
          transform: `translateY(${introY}px)`,
        }}
      >
        <div
          style={{
            backgroundColor: GOLD,
            borderRadius: 26,
            padding: '28px 24px',
            textAlign: 'center',
            boxShadow: '0 16px 40px rgba(240,238,58,0.25)',
          }}
        >
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 20, letterSpacing: '0.36em', color: INK, textTransform: 'uppercase' }}>
            HCP {duel.left.hcp}
          </div>
          <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 92, letterSpacing: '-0.04em', color: INK, lineHeight: 0.95, marginTop: 6 }}>
            {duel.left.name}
          </div>
        </div>

        <div style={{ width: 110, textAlign: 'center' }}>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 900,
              fontSize: 72,
              color: WHITE,
              lineHeight: 1,
              textShadow: '0 0 24px rgba(240,238,58,0.6)',
            }}
          >
            VS
          </div>
          <div style={{ width: energyW, height: 80, backgroundColor: GOLD, margin: '10px auto 0', boxShadow: `0 0 24px ${GOLD}` }} />
        </div>

        <div
          style={{
            backgroundColor: WHITE,
            borderRadius: 26,
            padding: '28px 24px',
            textAlign: 'center',
            boxShadow: '0 16px 40px rgba(255,255,255,0.15)',
          }}
        >
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 20, letterSpacing: '0.36em', color: MUTED, textTransform: 'uppercase' }}>
            HCP {duel.right.hcp}
          </div>
          <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 92, letterSpacing: '-0.04em', color: INK, lineHeight: 0.95, marginTop: 6 }}>
            {duel.right.name}
          </div>
        </div>
      </div>

      {/* Per-hole flip cards */}
      <div
        style={{
          flex: 1,
          marginTop: 28,
          backgroundColor: SUBTLE,
          borderRadius: 32,
          border: `1px solid ${LINE}`,
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          opacity: introOp,
        }}
      >
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '100px repeat(9, 1fr)',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 18, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
              HOLE
            </div>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={`hn-${i}`} style={{ fontFamily: sans, fontWeight: 800, fontSize: 26, color: WHITE, textAlign: 'center' }}>
                {i + 1}
              </div>
            ))}
          </div>

          {/* Mike row */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(9, 1fr)', alignItems: 'center', gap: 8, padding: '14px 0' }}>
            <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 26, color: GOLD, letterSpacing: '-0.02em' }}>M</div>
            {duelScores[0].map((s, i) => {
              const cellF = holeStart + i * holePer;
              const localF = frame - cellF;
              const p = spring({ frame: localF, fps, config: { damping: 12, stiffness: 240, mass: 0.4 } });
              const rot = interpolate(p, [0, 1], [90, 0]);
              const op = clamp(localF, [0, 6], [0, 1]);
              const isWin = revealed[i] === 'L';
              return (
                <div key={`m-${i}`} style={{ textAlign: 'center', perspective: 600, opacity: op }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      margin: '0 auto',
                      borderRadius: 12,
                      backgroundColor: isWin ? GOLD : '#232323',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: sans,
                      fontWeight: 900,
                      fontSize: 30,
                      color: isWin ? INK : WHITE,
                      transform: `rotateX(${rot}deg)`,
                      transformStyle: 'preserve-3d',
                      boxShadow: isWin ? `0 0 22px ${GOLD}` : 'none',
                    }}
                  >
                    {s}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Winner row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '100px repeat(9, 1fr)',
              alignItems: 'center',
              gap: 8,
              padding: '8px 0',
            }}
          >
            <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 16, color: MUTED, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              WIN
            </div>
            {revealed.map((w, i) => {
              const cellF = holeStart + i * holePer + 6;
              const localF = frame - cellF;
              const op = clamp(localF, [0, 4], [0, 1]);
              return (
                <div key={`w-${i}`} style={{ textAlign: 'center', opacity: op }}>
                  <div
                    style={{
                      fontFamily: sans,
                      fontWeight: 900,
                      fontSize: 22,
                      color: w === 'L' ? GOLD : w === 'R' ? WHITE : MUTED,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {w === 'L' ? '◀' : w === 'R' ? '▶' : '='}
                  </div>
                </div>
              );
            })}
          </div>

          {/* You row */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(9, 1fr)', alignItems: 'center', gap: 8, padding: '14px 0' }}>
            <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 26, color: WHITE, letterSpacing: '-0.02em' }}>Y</div>
            {duelScores[1].map((s, i) => {
              const cellF = holeStart + i * holePer;
              const localF = frame - cellF;
              const p = spring({ frame: localF, fps, config: { damping: 12, stiffness: 240, mass: 0.4 } });
              const rot = interpolate(p, [0, 1], [90, 0]);
              const op = clamp(localF, [0, 6], [0, 1]);
              const isWin = revealed[i] === 'R';
              return (
                <div key={`y-${i}`} style={{ textAlign: 'center', perspective: 600, opacity: op }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      margin: '0 auto',
                      borderRadius: 12,
                      backgroundColor: isWin ? WHITE : '#232323',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: sans,
                      fontWeight: 900,
                      fontSize: 30,
                      color: isWin ? INK : WHITE,
                      transform: `rotateX(${rot}deg)`,
                      transformStyle: 'preserve-3d',
                      boxShadow: isWin ? `0 0 22px rgba(255,255,255,0.55)` : 'none',
                    }}
                  >
                    {s}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Final score slam */}
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 18,
            opacity: slamOp,
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 124, color: GOLD, letterSpacing: '-0.06em', lineHeight: 1, transform: `scale(${slamScale})`, transformOrigin: 'right center' }}>
              {lw}
            </div>
            <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 18, color: MUTED, letterSpacing: '0.32em', textTransform: 'uppercase', marginTop: 4 }}>
              Holes
            </div>
          </div>
          <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 72, color: WHITE, opacity: 0.35, transform: `scale(${slamScale})` }}>
            —
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 124, color: WHITE, letterSpacing: '-0.06em', lineHeight: 1, transform: `scale(${slamScale})`, transformOrigin: 'left center' }}>
              {rw}
            </div>
            <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 18, color: MUTED, letterSpacing: '0.32em', textTransform: 'uppercase', marginTop: 4 }}>
              Holes
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// SCENE 2 — HEAT MAP (money flow per hole, 150f)
// Gold/white dominant — red tiles = lost, gold = won, per-hole money
// ============================================================================
const heatMoney = [
  { hole: 1, delta: -5, reason: 'Skin' },
  { hole: 2, delta: 0, reason: '—' },
  { hole: 3, delta: +3, reason: 'CTP' },
  { hole: 4, delta: -5, reason: 'Birdie' },
  { hole: 5, delta: 0, reason: '—' },
  { hole: 6, delta: -8, reason: 'Press' },
  { hole: 7, delta: +2, reason: 'Sandie' },
  { hole: 8, delta: -12, reason: 'Birdie' },
  { hole: 9, delta: +3, reason: 'Long Drive' },
];

const HeatMap: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const introOp = clamp(frame, [0, 10], [0, 1]);
  const fade = clamp(frame, [duration - 8, duration], [1, 0]);

  const tileStart = 16;
  const tilePer = 10;

  let running = 0;
  let revealed = 0;
  for (let i = 0; i < heatMoney.length; i++) {
    if (frame >= tileStart + i * tilePer) {
      running += heatMoney[i].delta;
      revealed = i + 1;
    }
  }

  const totalF = tileStart + 9 * tilePer + 8;
  const totalP = spring({ frame: frame - totalF, fps, config: { damping: 10, stiffness: 220 } });
  const totalScale = interpolate(totalP, [0, 0.4, 1], [1.8, 1.1, 1]);
  const totalOp = clamp(frame, [totalF, totalF + 10], [0, 1]);

  const maxAbs = Math.max(...heatMoney.map((m) => Math.abs(m.delta)), 1);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: fade, padding: '54px 56px 40px' }}>
      <div style={{ textAlign: 'center', opacity: introOp, marginTop: 20 }}>
        <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 30, letterSpacing: '0.48em', color: GOLD, textTransform: 'uppercase', marginBottom: 10 }}>
          Money · Per Hole
        </div>
        <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 120, letterSpacing: '-0.055em', color: WHITE, lineHeight: 0.9 }}>
          HEAT MAP
        </div>
      </div>

      <div
        style={{
          flex: 1,
          marginTop: 40,
          backgroundColor: BG,
          borderRadius: 36,
          padding: '36px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          opacity: introOp,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(9, 1fr)',
              gap: 10,
              marginBottom: 14,
            }}
          >
            {heatMoney.map((m, i) => (
              <div key={`lbl-${i}`} style={{ textAlign: 'center', fontFamily: sans, fontWeight: 700, fontSize: 20, color: MUTED, letterSpacing: '0.12em' }}>
                {m.hole}
              </div>
            ))}
          </div>

          {/* Heat tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 10 }}>
            {heatMoney.map((m, i) => {
              const cellF = tileStart + i * tilePer;
              const localF = frame - cellF;
              const p = spring({ frame: localF, fps, config: { damping: 14, stiffness: 220, mass: 0.45 } });
              const scale = interpolate(p, [0, 0.5, 1], [0.3, 1.12, 1]);
              const op = clamp(localF, [0, 6], [0, 1]);
              const intensity = Math.abs(m.delta) / maxAbs;
              const bg =
                m.delta > 0
                  ? `rgba(52, 199, 89, ${0.3 + intensity * 0.6})`
                  : m.delta < 0
                  ? `rgba(255, 59, 48, ${0.3 + intensity * 0.6})`
                  : '#E5E5E0';
              const color = m.delta === 0 ? MUTED : WHITE;
              return (
                <div
                  key={`t-${i}`}
                  style={{
                    aspectRatio: '1 / 1.5',
                    borderRadius: 14,
                    backgroundColor: bg,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: op,
                    transform: `scale(${scale})`,
                  }}
                >
                  <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 32, color, letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {m.delta === 0 ? '—' : `${m.delta > 0 ? '+' : ''}${m.delta}`}
                  </div>
                  <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 11, color, opacity: 0.8, marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {m.reason}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Running total */}
        <div
          style={{
            marginTop: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 28px',
            borderRadius: 22,
            backgroundColor: INK,
            opacity: totalOp,
          }}
        >
          <div>
            <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 18, color: MUTED, letterSpacing: '0.32em', textTransform: 'uppercase' }}>
              Running Total
            </div>
            <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 16, color: GOLD, letterSpacing: '0.28em', textTransform: 'uppercase', marginTop: 4 }}>
              After Hole {revealed}
            </div>
          </div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 900,
              fontSize: 96,
              color: running >= 0 ? GREEN : RED,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              transform: `scale(${totalScale})`,
              transformOrigin: 'right center',
            }}
          >
            {running >= 0 ? '+' : ''}${Math.abs(running)}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// COMPOSITION
// Timeline (540f, 18s):
// 0-45    ClipBeat v2-06 walker "SETTLE IT"         (1.5s)
// 45-225  BattleCard                                 (6s)
// 225-285 ClipBeat v1-03 dolly "DOWN TO THE WIRE"   (2s)
// 285-435 HeatMap                                    (5s)
// 435-495 ClipBeat v1-04 cinematic "WINNER TAKES"   (2s)
// 495-540 Outro                                      (1.5s)
// ============================================================================
export const LaunchUIVersus: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Sequence from={0} durationInFrames={45}>
        <ClipBeat
          src="launch-clips-v2/clip-06.mp4"
          duration={45}
          startFrom={15}
          headline="SETTLE IT."
          sub="Match Play Mode"
          accent
          position="bottom"
          objectPosition="25% center"
          volume={0.9}
        />
      </Sequence>

      <Sequence from={45} durationInFrames={180}>
        <BattleCard duration={180} />
      </Sequence>

      <Sequence from={225} durationInFrames={60}>
        <ClipBeat
          src="launch-clips/clip-03-dolly.mp4"
          duration={60}
          startFrom={20}
          headline="DOWN TO THE WIRE"
          sub="Every Hole Matters"
          position="center"
          volume={0.9}
        />
      </Sequence>

      <Sequence from={285} durationInFrames={150}>
        <HeatMap duration={150} />
      </Sequence>

      <Sequence from={435} durationInFrames={60}>
        <ClipBeat
          src="launch-clips/clip-04-cinematic.mp4"
          duration={60}
          startFrom={18}
          headline="WINNER TAKES IT."
          accent
          position="center"
          volume={0.9}
        />
      </Sequence>

      <Sequence from={495} durationInFrames={45}>
        <Outro duration={45} />
      </Sequence>
    </AbsoluteFill>
  );
};
