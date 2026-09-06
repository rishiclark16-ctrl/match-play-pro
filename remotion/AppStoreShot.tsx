import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { brand } from './brand';

const { fontFamily: sans } = loadInter();
const { fontFamily: mono } = loadMono();

// App Store 6.5"/6.7" iPhone spec: 1284 × 2778.
// 8-shot marketing sequence — each shot = headline + matching screenshot
// displayed frameless with rounded corners and a soft drop shadow.
// Screens are paired to the message being marketed (no duplicates).

type ShotData = {
  theme: 'ink' | 'gold' | 'cream';
  kicker: string;
  headline: React.ReactNode;
  sub?: string;
  screen: string;
};

const SHOTS: ShotData[] = [
  {
    theme: 'ink',
    kicker: '01 · LIVE MONEY TRACKING',
    headline: (
      <>
        Stop doing
        <br />
        math on
        <br />
        <span
          style={{
            background: brand.gold,
            color: brand.ink,
            padding: '8px 28px',
            borderRadius: 22,
            display: 'inline-block',
          }}
        >
          napkins.
        </span>
      </>
    ),
    sub: 'Live money tracking. Every bet, every press, every hole.',
    screen: 'app-store/live-money.png',
  },
  {
    theme: 'gold',
    kicker: '02 · EVERY GAME YOU PLAY',
    headline: (
      <>
        13 games.
        <br />
        One app.
      </>
    ),
    sub: 'Nassau · Skins · Wolf · Vegas · Stableford · Quota · and 7 more.',
    screen: 'app-store/prop-bets.png',
  },
  {
    theme: 'ink',
    kicker: '03 · TAP TO SCORE',
    headline: (
      <>
        Score every
        <br />
        hole in{' '}
        <span
          style={{
            background: brand.gold,
            color: brand.ink,
            padding: '8px 28px',
            borderRadius: 22,
            display: 'inline-block',
          }}
        >
          seconds.
        </span>
      </>
    ),
    sub: 'Big targets, hands-free voice, and handicap-aware net scoring.',
    screen: 'app-store/skins-scorecard.png',
  },
  {
    theme: 'cream',
    kicker: '04 · YOUR STATS',
    headline: (
      <>
        Know
        <br />
        your{' '}
        <span
          style={{
            background: brand.ink,
            color: brand.bgElevated,
            padding: '8px 28px',
            borderRadius: 22,
            display: 'inline-block',
          }}
        >
          game.
        </span>
      </>
    ),
    sub: 'Win rate, scoring trends, and all-time records — every round tracked.',
    screen: 'app-store/stats.png',
  },
  {
    theme: 'ink',
    kicker: '05 · YOUR GOLF IDENTITY',
    headline: (
      <>
        Built for
        <br />
        <span
          style={{
            background: brand.gold,
            color: brand.ink,
            padding: '8px 28px',
            borderRadius: 22,
            display: 'inline-block',
          }}
        >
          players.
        </span>
      </>
    ),
    sub: 'Handicap, history, and a profile your foursome can find.',
    screen: 'app-store/profile.png',
  },
  {
    theme: 'gold',
    kicker: '06 · AI GAME BUILDER',
    headline: (
      <>
        Custom games.
        <br />
        Instantly.
      </>
    ),
    sub: 'Describe your house game in plain English. Play it by the first tee.',
    screen: 'app-store/ai-game-builder.png',
  },
  {
    theme: 'ink',
    kicker: '07 · SOCIAL FEED',
    headline: (
      <>
        Everyone sees
        <br />
        <span
          style={{
            background: brand.gold,
            color: brand.ink,
            padding: '8px 28px',
            borderRadius: 22,
            display: 'inline-block',
          }}
        >
          everything.
        </span>
      </>
    ),
    sub: 'Your friends\' rounds, live. Scores, games, and results in real time.',
    screen: 'app-store/social-feed.png',
  },
  {
    theme: 'ink',
    kicker: '08 · READY TO PLAY',
    headline: (
      <>
        See you
        <br />
        on the{' '}
        <span
          style={{
            background: brand.gold,
            color: brand.ink,
            padding: '8px 28px',
            borderRadius: 22,
            display: 'inline-block',
          }}
        >
          tee.
        </span>
      </>
    ),
    sub: 'Download MATCH. Play your next round the right way.',
    screen: 'app-store/home.png',
  },
];

const bgForTheme = (t: ShotData['theme']) =>
  t === 'ink' ? brand.ink : t === 'gold' ? brand.gold : brand.bg;

const textForTheme = (t: ShotData['theme']) =>
  t === 'ink' ? brand.bgElevated : brand.ink;

const kickerColorForTheme = (t: ShotData['theme']) =>
  t === 'ink' ? brand.gold : t === 'gold' ? brand.ink : brand.goldDeep;

const subColorForTheme = (t: ShotData['theme']) =>
  t === 'ink' ? 'rgba(255,255,255,0.72)' : 'rgba(10,10,10,0.65)';

// Decorative dot grid background
const Texture: React.FC<{ theme: ShotData['theme'] }> = ({ theme }) => {
  const color =
    theme === 'ink'
      ? 'rgba(235, 228, 34, 0.05)'
      : theme === 'gold'
      ? 'rgba(10, 10, 10, 0.07)'
      : 'rgba(10, 10, 10, 0.04)';
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(${color} 2px, transparent 2.5px)`,
        backgroundSize: '64px 64px',
      }}
    />
  );
};

export const AppStoreShot: React.FC<{ shotIndex: number }> = ({ shotIndex }) => {
  const shot = SHOTS[shotIndex] ?? SHOTS[0];
  const bg = bgForTheme(shot.theme);
  const textColor = textForTheme(shot.theme);

  const shotHeight = 1900;
  const shotWidth = Math.round(shotHeight * (1284 / 2778));

  const shotBorder =
    shot.theme === 'ink'
      ? '4px solid rgba(255,255,255,0.08)'
      : '4px solid rgba(10,10,10,0.08)';
  const shotShadow =
    shot.theme === 'ink'
      ? '0 50px 90px rgba(0,0,0,0.6), 0 20px 40px rgba(0,0,0,0.4)'
      : '0 40px 80px rgba(10,10,10,0.2), 0 15px 30px rgba(10,10,10,0.12)';

  return (
    <AbsoluteFill style={{ background: bg, fontFamily: sans, overflow: 'hidden' }}>
      <Texture theme={shot.theme} />

      {/* Huge faded brand wordmark */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: -80,
          right: -80,
          textAlign: 'center',
          fontSize: 560,
          fontWeight: 900,
          letterSpacing: -32,
          color:
            shot.theme === 'ink'
              ? 'rgba(255,255,255,0.025)'
              : 'rgba(10,10,10,0.04)',
          lineHeight: 0.85,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        MATCH
      </div>

      {/* Atmospheric gold glow on dark shots */}
      {shot.theme === 'ink' && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 1100,
            width: 1600,
            height: 1600,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at center, rgba(235,228,34,0.14) 0%, rgba(235,228,34,0) 60%)',
            transform: 'translate(-50%, -20%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Headline + sub */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 80,
          right: 80,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: sans,
            fontSize: 164,
            fontWeight: 900,
            color: textColor,
            letterSpacing: -7,
            lineHeight: 0.96,
          }}
        >
          {shot.headline}
        </div>
        {shot.sub && (
          <div
            style={{
              marginTop: 44,
              fontFamily: sans,
              fontSize: 42,
              fontWeight: 600,
              color: subColorForTheme(shot.theme),
              letterSpacing: -0.5,
              lineHeight: 1.25,
              maxWidth: 980,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {shot.sub}
          </div>
        )}
      </div>

      {/* Screenshot — frameless, rounded, shadowed */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 40,
          transform: 'translateX(-50%)',
          width: shotWidth,
          height: shotHeight,
          borderRadius: 78,
          overflow: 'hidden',
          border: shotBorder,
          boxShadow: shotShadow,
          background: '#000',
        }}
      >
        <Img
          src={staticFile(shot.screen)}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'cover',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const SHOT_COUNT = SHOTS.length;
