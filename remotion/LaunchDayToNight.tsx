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

const clamp = (f: number, r: [number, number], o: [number, number]) =>
  interpolate(f, r, o, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// Cinematic clip — no overlay text, soft cross-dissolve, gentle Ken Burns
const Cinematic: React.FC<{
  src: string;
  durationFrames: number;
  startFrom?: number;
  objectPosition?: string;
  zoomFrom?: number;
  zoomTo?: number;
  natural?: boolean;
}> = ({
  src,
  durationFrames,
  startFrom = 0,
  objectPosition = 'center center',
  zoomFrom = 1.04,
  zoomTo = 1.12,
  natural = false,
}) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, durationFrames], [zoomFrom, zoomTo], {
    extrapolateRight: 'clamp',
  });
  const fadeIn = clamp(frame, [0, 6], [0, 1]);
  const fadeOut = clamp(frame, [durationFrames - 6, durationFrames], [1, 0]);
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <OffthreadVideo
          src={staticFile(src)}
          startFrom={startFrom}
          volume={natural ? 0.45 : 0}
          muted={!natural}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Lower-third typography card overlay — appears briefly atop a clip
const LowerThird: React.FC<{
  text: string;
  durationFrames: number;
  accent?: boolean;
}> = ({ text, durationFrames, accent }) => {
  const frame = useCurrentFrame();
  const op = Math.min(
    clamp(frame, [0, 8], [0, 1]),
    clamp(frame, [durationFrames - 10, durationFrames], [1, 0]),
  );
  const ruleW = clamp(frame, [4, 16], [0, 80]);

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background:
          'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 22%, rgba(0,0,0,0) 45%)',
        opacity: op,
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 220,
          left: 0,
          right: 0,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: ruleW,
            height: 2,
            backgroundColor: accent ? GOLD : WHITE,
            margin: '0 auto 26px',
          }}
        />
        <div
          style={{
            fontFamily: sans,
            fontWeight: 600,
            fontSize: 22,
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            color: WHITE,
            textShadow: '0 2px 18px rgba(0,0,0,0.6)',
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Outro Malbon — "ONE ROUND. ONE TAB." → MATCH cream card
const Outro: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1 (0..30): "ONE ROUND. ONE TAB." on cream
  const p1Op = Math.min(clamp(frame, [0, 10], [0, 1]), clamp(frame, [26, 34], [1, 0]));
  const p1Y = interpolate(
    spring({ frame, fps, config: { damping: 18, stiffness: 140 } }),
    [0, 1],
    [16, 0],
  );

  // Phase 2 (34..end): MATCH wordmark + tagline
  const localF = frame - 34;
  const p2 = spring({ frame: localF, fps, config: { damping: 20, stiffness: 130, mass: 0.8 } });
  const logoScale = interpolate(p2, [0, 1], [0.94, 1]);
  const logoOp = clamp(localF, [2, 16], [0, 1]);
  const ruleW = clamp(localF, [16, 32], [0, 130]);
  const tagOp = clamp(localF, [22, 36], [0, 1]);

  const fadeOut = clamp(frame, [durationFrames - 8, durationFrames], [1, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeOut,
      }}
    >
      {frame < 34 && (
        <div
          style={{
            position: 'absolute',
            textAlign: 'center',
            opacity: p1Op,
            transform: `translateY(${p1Y}px)`,
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontWeight: 900,
              fontSize: 96,
              letterSpacing: '-0.045em',
              lineHeight: 1.0,
              color: INK,
            }}
          >
            ONE ROUND.
          </div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 900,
              fontSize: 96,
              letterSpacing: '-0.045em',
              lineHeight: 1.0,
              color: INK,
              marginTop: 8,
            }}
          >
            ONE TAB.
          </div>
        </div>
      )}

      {frame >= 30 && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 900,
              fontSize: 220,
              letterSpacing: '-0.055em',
              lineHeight: 1,
              color: INK,
              opacity: logoOp,
              transform: `scale(${logoScale})`,
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
              margin: '40px auto 0',
            }}
          />
          <div
            style={{
              marginTop: 36,
              fontFamily: sans,
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: '0.42em',
              textTransform: 'uppercase',
              color: MUTED,
              opacity: tagOp,
            }}
          >
            Score · Bet · Settle Up
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ============================================================================
// 15s "Day to Night" — sunrise → settle up arc using all 11 clips
// 1080x1920, 30fps, 450 frames
// ============================================================================
//   0   28f  DAWN          v2 grass macro       (no text)
//  28   34f  GOLDEN TEE    v2 silhouette        (no text)
//  62   38f  THE WALK      v2 cliff walker      (no text)
// 100   30f  ROLLING OUT   v1 carts travel      lower-third "MORNING"
// 130   34f  THE GROUP     v1 4 guys at putt    (no text)
// 164   30f  THE PUSH      v1 single golfer     (no text)
// 194   38f  THE MOMENT    v2 ocean tee         lower-third "MIDDAY"
// 232   32f  HEAVEN        v1 two carts cliff   (no text)
// 264   34f  THE SMOKE     v2 cigar+cart        (no text)
// 298   30f  THE CLOSE     v1 closeup           lower-third "DUSK"
// 328   42f  THE TAB       v2 money + glove     lower-third gold "SETTLE UP"
// 370   80f  OUTRO         "ONE ROUND. ONE TAB." → MATCH
// TOTAL: 450 frames = 15.0s

export const LAUNCH_DAY_TO_NIGHT_DURATION = 450;

export const LaunchDayToNight: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Audio src={staticFile('launch-clips/sfx-d2n.mp3')} />

      {/* 1. DAWN — grass macro */}
      <Sequence from={0} durationInFrames={28}>
        <Cinematic
          src="launch-clips-v2/clip-04.mp4"
          durationFrames={28}
          startFrom={6}
          natural
        />
      </Sequence>

      {/* 2. GOLDEN TEE — silhouette */}
      <Sequence from={28} durationInFrames={34}>
        <Cinematic
          src="launch-clips-v2/clip-01.mp4"
          durationFrames={34}
          startFrom={10}
          natural
        />
      </Sequence>

      {/* 3. THE WALK — cliff walker */}
      <Sequence from={62} durationInFrames={38}>
        <Cinematic
          src="launch-clips-v2/clip-06.mp4"
          durationFrames={38}
          startFrom={10}
          objectPosition="25% center"
          natural
        />
      </Sequence>

      {/* 4. ROLLING OUT — v1 carts travel */}
      <Sequence from={100} durationInFrames={30}>
        <Cinematic
          src="launch-clips/clip-05-travel.mp4"
          durationFrames={30}
          startFrom={14}
        />
        <LowerThird text="Morning" durationFrames={30} />
      </Sequence>

      {/* 5. THE GROUP — v1 four-guys-at-putt */}
      <Sequence from={130} durationInFrames={34}>
        <Cinematic
          src="launch-clips/clip-03-dolly.mp4"
          durationFrames={34}
          startFrom={14}
        />
      </Sequence>

      {/* 6. THE PUSH — v1 single golfer */}
      <Sequence from={164} durationInFrames={30}>
        <Cinematic
          src="launch-clips/clip-02-singlegolfer.mp4"
          durationFrames={30}
          startFrom={14}
        />
      </Sequence>

      {/* 7. THE MOMENT — v2 ocean tee */}
      <Sequence from={194} durationInFrames={38}>
        <Cinematic
          src="launch-clips-v2/clip-02.mp4"
          durationFrames={38}
          startFrom={10}
          natural
        />
        <LowerThird text="Midday" durationFrames={38} />
      </Sequence>

      {/* 8. HEAVEN — v1 two carts cliff */}
      <Sequence from={232} durationInFrames={32}>
        <Cinematic
          src="launch-clips/clip-04-cinematic.mp4"
          durationFrames={32}
          startFrom={14}
        />
      </Sequence>

      {/* 9. THE SMOKE — v2 cigar in cart */}
      <Sequence from={264} durationInFrames={34}>
        <Cinematic
          src="launch-clips-v2/clip-05.mp4"
          durationFrames={34}
          startFrom={10}
          natural
        />
      </Sequence>

      {/* 10. THE CLOSE — v1 closeup */}
      <Sequence from={298} durationInFrames={30}>
        <Cinematic
          src="launch-clips/clip-01-closeup.mp4"
          durationFrames={30}
          startFrom={14}
        />
        <LowerThird text="Dusk" durationFrames={30} />
      </Sequence>

      {/* 11. THE TAB — v2 money + glove (payoff) */}
      <Sequence from={328} durationInFrames={42}>
        <Cinematic
          src="launch-clips-v2/clip-03.mp4"
          durationFrames={42}
          startFrom={10}
          natural
          zoomFrom={1.02}
          zoomTo={1.10}
        />
        <LowerThird text="Settle Up" durationFrames={42} accent />
      </Sequence>

      {/* OUTRO — Malbon cream MATCH */}
      <Sequence from={370} durationInFrames={80}>
        <Outro durationFrames={80} />
      </Sequence>
    </AbsoluteFill>
  );
};
