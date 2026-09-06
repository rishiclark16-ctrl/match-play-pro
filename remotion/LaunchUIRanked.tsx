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

export const LAUNCH_UI_RANKED_DURATION = 540;

// ============================================================================
// HOOK — "RANKED: GOLF BETS"
// ============================================================================
const RankedHook: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = clamp(frame, [0, 6], [0, 1]);
  const fade = clamp(frame, [duration - 5, duration], [1, 0]);
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 240 } });
  const ruleW = clamp(frame, [6, 18], [0, 300]);
  const badgeP = spring({ frame: frame - 4, fps, config: { damping: 10, stiffness: 220 } });
  const badgeScale = interpolate(badgeP, [0, 0.4, 1], [1.6, 1.06, 1]);
  return (
    <AbsoluteFill style={{ backgroundColor: INK, alignItems: 'center', justifyContent: 'center', opacity: fade, padding: '0 56px' }}>
      <div style={{ textAlign: 'center', opacity: op }}>
        <div
          style={{
            display: 'inline-block',
            backgroundColor: GOLD,
            color: INK,
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 32,
            letterSpacing: '0.48em',
            textTransform: 'uppercase',
            padding: '14px 28px',
            borderRadius: 999,
            transform: `scale(${badgeScale})`,
          }}
        >
          RANKED
        </div>
        <div style={{ width: ruleW, height: 8, backgroundColor: GOLD, margin: '30px auto' }} />
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 150,
            letterSpacing: '-0.055em',
            color: WHITE,
            lineHeight: 0.9,
            transform: `scale(${interpolate(p, [0, 1], [1.1, 1])})`,
          }}
        >
          GOLF
        </div>
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 150,
            letterSpacing: '-0.055em',
            color: GOLD,
            lineHeight: 0.9,
            marginTop: 6,
          }}
        >
          BETS.
        </div>
        <div
          style={{
            marginTop: 30,
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '0.38em',
            color: MUTED,
            textTransform: 'uppercase',
          }}
        >
          #5 → #1
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// RANK CARD — big rank number, title, tag, hype meter
// ============================================================================
type Rank = {
  rank: number;
  title: string;
  kicker: string;
  blurb: string;
  hype: number; // 0..5
  stat: string;
  color: string;
};

const RankCard: React.FC<{ r: Rank; duration: number; featured?: boolean }> = ({ r, duration, featured }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = clamp(frame, [0, 6], [0, 1]);
  const fade = clamp(frame, [duration - 6, duration], [1, 0]);

  const badgeP = spring({ frame, fps, config: { damping: 10, stiffness: 220, mass: 0.5 } });
  const badgeScale = interpolate(badgeP, [0, 0.4, 1], [2, 1.08, 1]);
  const badgeRot = interpolate(badgeP, [0, 1], [-18, 0]);

  const titleP = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 220 } });
  const titleX = interpolate(titleP, [0, 1], [120, 0]);
  const titleOp = clamp(frame, [8, 20], [0, 1]);

  const hypeStart = 20;
  const hypeFill = clamp(frame, [hypeStart, hypeStart + 20], [0, 1]);
  const hypeWidth = (r.hype / 5) * 100 * hypeFill;

  const statOp = clamp(frame, [28, 36], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: fade, padding: '60px 56px 56px' }}>
      <div
        style={{
          flex: 1,
          backgroundColor: SUBTLE,
          borderRadius: 42,
          border: `1px solid ${LINE}`,
          padding: '56px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          opacity: op,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Accent corner */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 320,
            height: 320,
            borderRadius: 999,
            backgroundColor: r.color,
            opacity: 0.1,
          }}
        />

        <div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 24,
              letterSpacing: '0.42em',
              color: MUTED,
              textTransform: 'uppercase',
            }}
          >
            {r.kicker}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 26, marginTop: 10 }}>
            <div
              style={{
                fontFamily: sans,
                fontWeight: 900,
                fontSize: featured ? 340 : 280,
                color: r.color,
                letterSpacing: '-0.08em',
                lineHeight: 0.85,
                transform: `scale(${badgeScale}) rotate(${badgeRot}deg)`,
                transformOrigin: 'left bottom',
                textShadow: `0 0 60px ${r.color}55`,
              }}
            >
              #{r.rank}
            </div>
            <div
              style={{
                flex: 1,
                transform: `translateX(${titleX}px)`,
                opacity: titleOp,
                paddingBottom: 30,
              }}
            >
              <div
                style={{
                  fontFamily: sans,
                  fontWeight: 900,
                  fontSize: featured ? 108 : 88,
                  color: WHITE,
                  letterSpacing: '-0.05em',
                  lineHeight: 0.9,
                }}
              >
                {r.title}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 30,
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 30,
              color: WHITE,
              lineHeight: 1.2,
              opacity: titleOp,
            }}
          >
            {r.blurb}
          </div>
        </div>

        {/* Hype meter */}
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 20,
              color: MUTED,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            <div>HYPE METER</div>
            <div style={{ opacity: statOp }}>{r.stat}</div>
          </div>
          <div style={{ height: 22, backgroundColor: '#1A1A1A', borderRadius: 11, overflow: 'hidden', border: `1px solid ${LINE}` }}>
            <div
              style={{
                width: `${hypeWidth}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${r.color} 0%, ${GOLD} 100%)`,
                boxShadow: `0 0 20px ${r.color}`,
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 8,
              fontFamily: sans,
              fontWeight: 800,
              fontSize: 16,
              color: MUTED,
              letterSpacing: '0.2em',
            }}
          >
            {['CHILL', '', 'MID', '', 'DEGEN'].map((s, i) => (
              <span key={i}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// FINAL — "MATCH TRACKS ALL 13"
// ============================================================================
const betList = [
  'Nassau', 'Skins', 'Match Play', 'Wolf', 'Stableford',
  'Best Ball', 'Vegas', '5-3-1', 'Defender', 'Sixes',
  'Quota', 'Rabbit', 'Prop Bets',
];

const TracksAll: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = clamp(frame, [0, 6], [0, 1]);
  const fade = clamp(frame, [duration - 6, duration], [1, 0]);

  const hp = spring({ frame, fps, config: { damping: 14, stiffness: 240 } });
  const headScale = interpolate(hp, [0, 0.5, 1], [1.2, 1.02, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: fade, padding: '60px 56px 40px' }}>
      <div style={{ textAlign: 'center', opacity: op, marginTop: 10 }}>
        <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 28, letterSpacing: '0.48em', color: GOLD, textTransform: 'uppercase' }}>
          Plot twist
        </div>
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 118,
            letterSpacing: '-0.055em',
            color: WHITE,
            lineHeight: 0.92,
            marginTop: 16,
            transform: `scale(${headScale})`,
          }}
        >
          MATCH TRACKS
        </div>
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 118,
            letterSpacing: '-0.055em',
            color: GOLD,
            lineHeight: 0.92,
            marginTop: 2,
            transform: `scale(${headScale})`,
          }}
        >
          ALL 13. LIVE.
        </div>
      </div>

      <div
        style={{
          flex: 1,
          marginTop: 40,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignContent: 'center',
          justifyContent: 'center',
        }}
      >
        {betList.map((name, i) => {
          const cellF = 12 + i * 4;
          const localF = frame - cellF;
          const p = spring({ frame: localF, fps, config: { damping: 14, stiffness: 240, mass: 0.4 } });
          const scale = interpolate(p, [0, 0.5, 1], [0.3, 1.08, 1]);
          const cellOp = clamp(localF, [0, 8], [0, 1]);
          return (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '18px 26px',
                borderRadius: 999,
                backgroundColor: SUBTLE,
                border: `1px solid ${LINE}`,
                opacity: cellOp,
                transform: `scale(${scale})`,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  backgroundColor: GREEN,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: WHITE,
                  fontFamily: sans,
                  fontWeight: 900,
                  fontSize: 22,
                }}
              >
                ✓
              </div>
              <div style={{ fontFamily: sans, fontWeight: 800, fontSize: 32, color: WHITE, letterSpacing: '-0.02em' }}>
                {name}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          textAlign: 'center',
          fontFamily: sans,
          fontWeight: 700,
          fontSize: 24,
          color: MUTED,
          letterSpacing: '0.36em',
          textTransform: 'uppercase',
          marginTop: 24,
          opacity: op,
        }}
      >
        No spreadsheets · No napkins
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// DATA
// ============================================================================
const ranks: Rank[] = [
  { rank: 5, title: 'WOLF', kicker: 'The chaos one', blurb: 'Rotating wolf picks a partner — or plays solo for double.', hype: 5, stat: '3–4 players', color: '#FF7A45' },
  { rank: 4, title: 'STABLEFORD', kicker: 'Points over pars', blurb: 'Every hole scores points. Higher is better. No blow-ups.', hype: 3, stat: 'Any group', color: '#4FD19A' },
  { rank: 3, title: 'SKINS', kicker: 'Winner takes hole', blurb: 'Low score each hole wins. Ties carry. Greed rewarded.', hype: 4, stat: 'Auto carryover', color: '#7DBDFF' },
  { rank: 2, title: 'MATCH PLAY', kicker: '1 vs 1 showdown', blurb: 'Head-to-head, hole by hole. Who wins the most?', hype: 4, stat: '2-player classic', color: '#C084FC' },
  { rank: 1, title: 'NASSAU', kicker: 'The GOAT', blurb: 'Front 9, Back 9, Total. Auto-press when you fall behind.', hype: 5, stat: 'Universal', color: GOLD },
];

// ============================================================================
// COMPOSITION
// 0-30    Hook                    (1s)
// 30-85   #5 Wolf                 (55f)
// 85-140  #4 Stableford           (55f)
// 140-195 #3 Skins                (55f)
// 195-255 ClipBeat "WAIT..."      (60f)
// 255-315 #2 Match Play           (60f)
// 315-420 #1 Nassau (featured)    (105f)
// 420-510 TracksAll               (90f)
// 510-540 Outro                   (30f)
// ============================================================================
export const LaunchUIRanked: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Sequence from={0} durationInFrames={30}>
        <RankedHook duration={30} />
      </Sequence>

      <Sequence from={30} durationInFrames={55}>
        <RankCard r={ranks[0]} duration={55} />
      </Sequence>

      <Sequence from={85} durationInFrames={55}>
        <RankCard r={ranks[1]} duration={55} />
      </Sequence>

      <Sequence from={140} durationInFrames={55}>
        <RankCard r={ranks[2]} duration={55} />
      </Sequence>

      <Sequence from={195} durationInFrames={60}>
        <ClipBeat
          src="launch-clips/clip-03-dolly.mp4"
          duration={60}
          startFrom={18}
          headline="WAIT FOR IT…"
          sub="Top 2"
          accent
          position="center"
          volume={0.9}
        />
      </Sequence>

      <Sequence from={255} durationInFrames={60}>
        <RankCard r={ranks[3]} duration={60} />
      </Sequence>

      <Sequence from={315} durationInFrames={105}>
        <RankCard r={ranks[4]} duration={105} featured />
      </Sequence>

      <Sequence from={420} durationInFrames={90}>
        <TracksAll duration={90} />
      </Sequence>

      <Sequence from={510} durationInFrames={30}>
        <Outro duration={30} />
      </Sequence>
    </AbsoluteFill>
  );
};
