import React from 'react';
import {
  AbsoluteFill,
  Img,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { brand } from './brand';

const { fontFamily: sans } = loadInter();

type TikTokShotData = {
  theme: 'ink' | 'gold' | 'cream';
  words: { text: string; highlight?: boolean }[];
  sub: string;
  screen: string;
};

export const TIKTOK_SHOTS: TikTokShotData[] = [
  {
    theme: 'ink',
    words: [
      { text: 'Stop' },
      { text: 'doing' },
      { text: 'math' },
      { text: 'on' },
      { text: 'napkins.', highlight: true },
    ],
    sub: 'Live money tracking. Every bet, every press, every hole.',
    screen: 'app-store/live-money.png',
  },
  {
    theme: 'gold',
    words: [
      { text: '13' },
      { text: 'games.' },
      { text: 'One' },
      { text: 'app.' },
    ],
    sub: 'Nassau · Skins · Wolf · Vegas · Stableford · and more.',
    screen: 'app-store/prop-bets.png',
  },
  {
    theme: 'ink',
    words: [
      { text: 'Score' },
      { text: 'every' },
      { text: 'hole' },
      { text: 'in' },
      { text: 'seconds.', highlight: true },
    ],
    sub: 'Tap to score. Voice scoring. Handicap-aware.',
    screen: 'app-store/skins-scorecard.png',
  },
  {
    theme: 'cream',
    words: [
      { text: 'Know' },
      { text: 'your' },
      { text: 'game.', highlight: true },
    ],
    sub: 'Win rate, scoring trends, all-time records.',
    screen: 'app-store/stats.png',
  },
  {
    theme: 'ink',
    words: [
      { text: 'Built' },
      { text: 'for' },
      { text: 'players.', highlight: true },
    ],
    sub: 'Handicap, history, and a profile your foursome can find.',
    screen: 'app-store/profile.png',
  },
  {
    theme: 'gold',
    words: [
      { text: 'Custom' },
      { text: 'games.' },
      { text: 'Instantly.' },
    ],
    sub: 'Describe your house game. Play it by the first tee.',
    screen: 'app-store/ai-game-builder.png',
  },
  {
    theme: 'ink',
    words: [
      { text: 'Everyone' },
      { text: 'sees' },
      { text: 'everything.', highlight: true },
    ],
    sub: "Your friends' rounds, live. Scores and results in real time.",
    screen: 'app-store/social-feed.png',
  },
  {
    theme: 'ink',
    words: [
      { text: 'See' },
      { text: 'you' },
      { text: 'on' },
      { text: 'the' },
      { text: 'tee.', highlight: true },
    ],
    sub: 'Download MATCH. Play your next round the right way.',
    screen: 'app-store/home.png',
  },
];

const bgForTheme = (t: TikTokShotData['theme']) =>
  t === 'ink' ? brand.ink : t === 'gold' ? brand.gold : brand.bg;

const textForTheme = (t: TikTokShotData['theme']) =>
  t === 'ink' ? brand.bgElevated : brand.ink;

const subColorForTheme = (t: TikTokShotData['theme']) =>
  t === 'ink' ? 'rgba(255,255,255,0.65)' : 'rgba(10,10,10,0.55)';

const highlightBg = (t: TikTokShotData['theme']) =>
  t === 'gold' ? brand.ink : brand.gold;

const highlightText = (t: TikTokShotData['theme']) =>
  t === 'gold' ? brand.bgElevated : brand.ink;

export const TikTokShot: React.FC<{ shotIndex: number }> = ({ shotIndex }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shot = TIKTOK_SHOTS[shotIndex] ?? TIKTOK_SHOTS[0];
  const bg = bgForTheme(shot.theme);
  const textColor = textForTheme(shot.theme);

  const shotHeight = 1400;
  const shotWidth = Math.round(shotHeight * (1284 / 2778));

  const shotBorder =
    shot.theme === 'ink'
      ? '3px solid rgba(255,255,255,0.1)'
      : '3px solid rgba(10,10,10,0.1)';
  const shotShadow =
    shot.theme === 'ink'
      ? '0 40px 80px rgba(0,0,0,0.7), 0 15px 30px rgba(0,0,0,0.5)'
      : '0 30px 60px rgba(10,10,10,0.25), 0 10px 20px rgba(10,10,10,0.15)';

  // --- Timeline (8s = 240 frames @ 30fps) ---
  // 0-10: bg fade in
  // 10-80: words slam in (staggered every ~12 frames)
  // 80-100: sub fades in
  // 95-140: screenshot springs up
  // 140-200: hold
  // 200-230: everything scales down slightly, MATCH wordmark flashes
  // 230-240: fade to black

  const bgOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

  // Word animations
  const wordStartFrame = 12;
  const wordInterval = Math.min(14, Math.floor(50 / shot.words.length));

  // Sub text
  const subOpacity = interpolate(frame, [75, 95], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subY = interpolate(frame, [75, 95], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Screenshot spring
  const screenshotProgress = spring({
    frame: frame - 90,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });
  const screenshotY = interpolate(screenshotProgress, [0, 1], [600, 0]);
  const screenshotOpacity = interpolate(frame, [90, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // End card — scale down + MATCH flash
  const endScale = interpolate(frame, [195, 215], [1, 0.92], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const endContentOpacity = interpolate(frame, [195, 215], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // MATCH wordmark at the end
  const matchOpacity = interpolate(frame, [200, 215, 232, 240], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const matchScale = spring({
    frame: frame - 205,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.6 },
  });

  // Final fade out
  const fadeOut = interpolate(frame, [232, 240], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Gold glow pulse
  const glowPulse = shot.theme === 'ink'
    ? interpolate(frame, [90, 120, 160, 190], [0.08, 0.2, 0.2, 0.1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* Bass hit on first word slam */}
      <Sequence from={wordStartFrame}>
        <Audio src={staticFile('sfx/bass-hit.mp3')} volume={0.8} />
      </Sequence>
      {/* Whoosh on screenshot entrance */}
      <Sequence from={90}>
        <Audio src={staticFile('sfx/whoosh.mp3')} volume={0.6} />
      </Sequence>
      {/* Snap on MATCH reveal */}
      <Sequence from={205}>
        <Audio src={staticFile('sfx/snap.mp3')} volume={0.7} />
      </Sequence>

      <AbsoluteFill style={{ opacity: bgOpacity * fadeOut }}>
        <AbsoluteFill style={{ background: bg }}>
          {/* Dot texture */}
          <AbsoluteFill
            style={{
              backgroundImage: `radial-gradient(${
                shot.theme === 'ink'
                  ? 'rgba(235, 228, 34, 0.05)'
                  : shot.theme === 'gold'
                  ? 'rgba(10, 10, 10, 0.07)'
                  : 'rgba(10, 10, 10, 0.04)'
              } 1.5px, transparent 2px)`,
              backgroundSize: '48px 48px',
            }}
          />

          {/* Gold glow */}
          {shot.theme === 'ink' && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 800,
                width: 1200,
                height: 1200,
                borderRadius: '50%',
                background: `radial-gradient(circle at center, rgba(235,228,34,${glowPulse}) 0%, rgba(235,228,34,0) 60%)`,
                transform: 'translate(-50%, -20%)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Content wrapper for end-card scale */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: endContentOpacity,
              transform: `scale(${endScale})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Headline — word-by-word slam */}
            <div
              style={{
                position: 'absolute',
                top: 100,
                left: 60,
                right: 60,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 128,
                  fontWeight: 900,
                  color: textColor,
                  letterSpacing: -5,
                  lineHeight: 1.05,
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '0 24px',
                }}
              >
                {shot.words.map((word, i) => {
                  const wordFrame = wordStartFrame + i * wordInterval;
                  const wordProgress = spring({
                    frame: frame - wordFrame,
                    fps,
                    config: { damping: 10, stiffness: 280, mass: 0.5 },
                  });
                  const wordOpacity = interpolate(frame, [wordFrame, wordFrame + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                  const wordY = interpolate(wordProgress, [0, 1], [80, 0]);
                  const wordScale = interpolate(wordProgress, [0, 0.5, 1], [0.6, 1.08, 1]);

                  const hlProgress = word.highlight
                    ? interpolate(frame, [wordFrame + 3, wordFrame + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                    : 0;

                  return (
                    <span
                      key={i}
                      style={{
                        display: 'inline-block',
                        opacity: wordOpacity,
                        transform: `translateY(${wordY}px) scale(${wordScale})`,
                        ...(word.highlight
                          ? {
                              background: `linear-gradient(90deg, ${highlightBg(shot.theme)} ${hlProgress * 100}%, transparent ${hlProgress * 100}%)`,
                              color: hlProgress > 0.5 ? highlightText(shot.theme) : textColor,
                              padding: '6px 22px',
                              borderRadius: 18,
                            }
                          : {}),
                      }}
                    >
                      {word.text}
                    </span>
                  );
                })}
              </div>

              {/* Sub text */}
              <div
                style={{
                  marginTop: 36,
                  fontFamily: sans,
                  fontSize: 36,
                  fontWeight: 600,
                  color: subColorForTheme(shot.theme),
                  letterSpacing: -0.3,
                  lineHeight: 1.3,
                  maxWidth: 800,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  opacity: subOpacity,
                  transform: `translateY(${subY}px)`,
                }}
              >
                {shot.sub}
              </div>
            </div>

            {/* Screenshot */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 60,
                transform: `translateX(-50%) translateY(${screenshotY}px)`,
                width: shotWidth,
                height: shotHeight,
                borderRadius: 60,
                overflow: 'hidden',
                border: shotBorder,
                boxShadow: shotShadow,
                background: '#000',
                opacity: screenshotOpacity,
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
          </div>

          {/* MATCH wordmark end card */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: matchOpacity,
              transform: `scale(${matchScale})`,
            }}
          >
            <div
              style={{
                fontFamily: sans,
                fontSize: 180,
                fontWeight: 900,
                letterSpacing: -8,
                color: textColor,
                lineHeight: 1,
              }}
            >
              M<span style={{ color: brand.gold }}>A</span>TCH
            </div>
            <div
              style={{
                width: 80,
                height: 6,
                borderRadius: 3,
                background: brand.gold,
                marginTop: 16,
              }}
            />
            <div
              style={{
                fontFamily: sans,
                fontSize: 32,
                fontWeight: 600,
                color: subColorForTheme(shot.theme),
                marginTop: 24,
                letterSpacing: 6,
                textTransform: 'uppercase',
              }}
            >
              Score. Bet. Win.
            </div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const TIKTOK_SHOT_COUNT = TIKTOK_SHOTS.length;
