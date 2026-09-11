import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const WELCOME_MATCH_DURATION = 240; // 8s @ 30fps

// Napkin-M palette (from 08-napkin-M.svg)
const NAPKIN_CREAM = '#EFEADB';
const NAPKIN_FOLD = '#E0D9C2';
const GRID_LINE = '#D8D2BF';
const INK = '#1A1A1A';
const CHARTREUSE = '#F0EE3A';

const CrispWord: React.FC<{
  text: string;
  start: number;
  color: string;
  x: number;
  y: number;
  fontSize: number;
  weight?: number;
  letterSpacing?: number;
}> = ({ text, start, color, x, y, fontSize, weight = 900, letterSpacing = -2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <g transform={`translate(${x} ${y})`}>
      {text.split('').map((char, i) => {
        const charStart = start + i * 2;
        const progress = spring({
          frame: frame - charStart,
          fps,
          config: { damping: 16, stiffness: 180, mass: 0.6 },
        });
        const opacity = interpolate(
          frame - charStart,
          [0, 6],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        const ty = interpolate(progress, [0, 1], [22, 0]);
        const widthPerChar = fontSize * 0.58;
        return (
          <text
            key={i}
            x={i * (widthPerChar + letterSpacing)}
            y={ty}
            fill={color}
            fontSize={fontSize}
            fontWeight={weight}
            style={{
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              opacity,
              letterSpacing: `${letterSpacing}px`,
            }}
          >
            {char}
          </text>
        );
      })}
    </g>
  );
};

// The actual napkin-M logo, rendered 1024x1024 in its own coordinate space,
// with a left-to-right brush mask that reveals the M like a paint stroke.
const NapkinLogo: React.FC<{
  cx: number;
  cy: number;
  size: number;
  revealStart: number;
  revealEnd: number;
  swooshStart: number;
  swooshEnd: number;
  cardEnter: number;
}> = ({
  cx,
  cy,
  size,
  revealStart,
  revealEnd,
  swooshStart,
  swooshEnd,
  cardEnter,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card entrance (squircle cream tile)
  const cardSpring = spring({
    frame: frame - cardEnter,
    fps,
    config: { damping: 18, stiffness: 160 },
  });
  const cardScale = interpolate(cardSpring, [0, 1], [0.82, 1]);
  const cardOpacity = interpolate(frame - cardEnter, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Brush reveal: a rectangle grows left→right inside the 1024 viewBox
  const reveal = interpolate(frame, [revealStart, revealEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Overshoot so the soft edge clears the right side
  const revealWidth = interpolate(reveal, [0, 1], [0, 1180]);

  // Swoosh draw
  const swoosh = interpolate(frame, [swooshStart, swooshEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const SW_LEN = 800;
  const swDashOffset = SW_LEN * (1 - swoosh);

  // Unique IDs so we can embed multiple logos without collision
  const maskId = `mReveal-${revealStart}`;
  const gradId = `mEdge-${revealStart}`;

  const half = size / 2;

  return (
    <g
      transform={`translate(${cx - half} ${cy - half}) scale(${(size / 1024) * cardScale}) translate(${(1024 * (1 - cardScale)) / 2} ${(1024 * (1 - cardScale)) / 2})`}
      style={{ opacity: cardOpacity }}
    >
      {/* Rounded squircle clip so corners match iOS icon feel */}
      <defs>
        <clipPath id={`clip-${revealStart}`}>
          <rect x={0} y={0} width={1024} height={1024} rx={220} ry={220} />
        </clipPath>
        {/* Soft-edged brush mask */}
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity={1} />
          <stop offset="0.85" stopColor="#fff" stopOpacity={1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect x={0} y={0} width={1024} height={1024} fill="#000" />
          <rect
            x={-80}
            y={0}
            width={revealWidth}
            height={1024}
            fill={`url(#${gradId})`}
            transform="rotate(-6 512 512)"
          />
        </mask>
      </defs>

      <g clipPath={`url(#clip-${revealStart})`}>
        {/* Cream napkin background */}
        <rect width={1024} height={1024} fill={NAPKIN_CREAM} />
        {/* Napkin crosshair */}
        <g stroke={GRID_LINE} strokeWidth={2} opacity={0.6}>
          <line x1={512} y1={0} x2={512} y2={1024} />
          <line x1={0} y1={512} x2={1024} y2={512} />
        </g>
        {/* Folded corner */}
        <path d="M 0 0 L 180 0 L 0 180 Z" fill={NAPKIN_FOLD} />

        {/* Brush-revealed M */}
        <g mask={`url(#${maskId})`}>
          <g transform="translate(512 540) rotate(-6)">
            <text
              x={0}
              y={0}
              fill={INK}
              fontWeight={700}
              fontSize={720}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fontFamily:
                  '"Brush Script MT", "Snell Roundhand", "Lucida Handwriting", cursive',
              }}
            >
              M
            </text>
          </g>
        </g>

        {/* Chartreuse swoosh — drawn with stroke-dashoffset */}
        <path
          d="M 280 740 Q 400 720 520 740 T 760 720"
          stroke={CHARTREUSE}
          strokeWidth={18}
          fill="none"
          strokeLinecap="round"
          opacity={0.9}
          strokeDasharray={SW_LEN}
          strokeDashoffset={swDashOffset}
        />
      </g>
    </g>
  );
};

export const WelcomeMatch: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Timeline
  // 0-50    "WELCOME TO" types in
  // 30-90   "MATCH" types in + accent bar
  // 90-110  logo card scales in
  // 110-190 brush reveal of the M
  // 170-200 chartreuse swoosh draws
  // 200-240 hold + subtle breathe

  const breathe = interpolate(
    frame,
    [200, 220, 240],
    [1, 1.025, 1.015],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const accentBarWidth = interpolate(frame, [60, 84], [0, 640], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Background parchment fade
  const bgFade = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: NAPKIN_CREAM }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Background crosshair echoes the logo */}
        <g stroke={GRID_LINE} strokeWidth={2} opacity={0.25 * bgFade}>
          <line x1={width / 2} y1={0} x2={width / 2} y2={height} />
          <line x1={0} y1={height / 2} x2={width} y2={height / 2} />
        </g>
        <path
          d={`M 0 0 L 220 0 L 0 220 Z`}
          fill={NAPKIN_FOLD}
          opacity={bgFade}
        />

        {/* "WELCOME TO" */}
        <CrispWord
          text="WELCOME TO"
          start={4}
          color={INK}
          x={width / 2 - 330}
          y={Math.max(280, height * 0.2)}
          fontSize={92}
          weight={800}
          letterSpacing={4}
        />

        {/* "MATCH" — big */}
        <CrispWord
          text="MATCH"
          start={34}
          color={INK}
          x={width / 2 - 340}
          y={Math.max(460, height * 0.32)}
          fontSize={200}
          weight={900}
          letterSpacing={-6}
        />

        {/* Accent bar under MATCH */}
        <rect
          x={width / 2 - 320}
          y={Math.max(498, height * 0.35)}
          width={accentBarWidth}
          height={18}
          fill={CHARTREUSE}
          opacity={0.95}
        />

        {/* The napkin-M logo itself, breathing at the end */}
        <g
          transform={`translate(${width / 2} ${height * 0.68}) scale(${breathe}) translate(${-width / 2} ${-height * 0.68})`}
        >
          <NapkinLogo
            cx={width / 2}
            cy={height * 0.68}
            size={Math.min(width * 0.72, 780)}
            cardEnter={90}
            revealStart={110}
            revealEnd={190}
            swooshStart={172}
            swooshEnd={204}
          />
        </g>

        {/* Tagline */}
        <g
          opacity={interpolate(frame, [208, 228], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })}
          transform={`translate(${width / 2} ${height - 120})`}
        >
          <text
            textAnchor="middle"
            fill={INK}
            fontSize={38}
            fontWeight={600}
            style={{
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              letterSpacing: '6px',
            }}
          >
            LIVE SCORING · SKINS · NASSAU · WOLF
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
