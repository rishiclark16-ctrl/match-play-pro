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

export const LAUNCH_UI_GROUPCHAT_DURATION = 540;

// ============================================================================
// iMessage-style bubble
// ============================================================================
type Bubble = {
  at: number;
  side: 'L' | 'R';
  name?: string;
  text?: string;
  type?: 'text' | 'typing' | 'venmo' | 'system';
  amount?: number;
  reason?: string;
  from?: string;
  to?: string;
  emoji?: string;
};

const chatScript: Bubble[] = [
  { at: 0,   side: 'L', name: 'Mike',  type: 'text',   text: 'Saturday tee time 🔒' },
  { at: 22,  side: 'L', name: 'Mike',  type: 'text',   text: 'usual bet?' },
  { at: 52,  side: 'R', name: 'You',   type: 'text',   text: 'bet.' },
  { at: 78,  side: 'L', name: 'Dan',   type: 'text',   text: 'nassau + skins $5' },
  { at: 108, side: 'L', name: 'John',  type: 'typing' },
  { at: 140, side: 'L', name: 'John',  type: 'text',   text: 'auto press on back 👀' },
  { at: 178, side: 'L', name: 'Mike',  type: 'venmo',  from: 'Mike', to: 'You',  amount: 12, reason: 'Skin · H5' },
  { at: 222, side: 'R', name: 'You',   type: 'text',   text: '😤' },
  { at: 250, side: 'R', name: 'You',   type: 'text',   text: 'settled via MATCH 💸' },
  { at: 290, side: 'L', name: 'Dan',   type: 'system', text: 'Tab closed · 4 players · $36 moved' },
];

const TypingDots: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * 2.5;
  const op = (i: number) => 0.3 + 0.7 * Math.max(0, Math.sin(t * Math.PI - i * 0.9));
  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 4px' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            backgroundColor: '#B8B8B0',
            opacity: op(i),
          }}
        />
      ))}
    </div>
  );
};

const Avatar: React.FC<{ name: string; color: string }> = ({ name, color }) => (
  <div
    style={{
      width: 46,
      height: 46,
      borderRadius: 999,
      backgroundColor: color,
      color: INK,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: sans,
      fontWeight: 900,
      fontSize: 22,
      flexShrink: 0,
    }}
  >
    {name[0]}
  </div>
);

const avatarColors: Record<string, string> = {
  Mike: '#FFB84D',
  Dan: '#4FD19A',
  John: '#7DBDFF',
  You: GOLD,
};

const MessageRow: React.FC<{ b: Bubble; localF: number }> = ({ b, localF }) => {
  const { fps } = useVideoConfig();
  const p = spring({ frame: localF, fps, config: { damping: 14, stiffness: 230, mass: 0.5 } });
  const op = clamp(localF, [0, 8], [0, 1]);
  const y = interpolate(p, [0, 1], [30, 0]);
  const scale = interpolate(p, [0, 0.5, 1], [0.92, 1.02, 1]);
  const rightAlign = b.side === 'R';

  if (b.type === 'system') {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '12px 0',
          opacity: op,
          transform: `translateY(${y}px)`,
        }}
      >
        <div
          style={{
            backgroundColor: GOLD,
            color: INK,
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '12px 20px',
            borderRadius: 999,
            boxShadow: '0 8px 24px rgba(240,238,58,0.3)',
          }}
        >
          ✓ {b.text}
        </div>
      </div>
    );
  }

  if (b.type === 'venmo') {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '16px 0',
          opacity: op,
          transform: `translateY(${y}px) scale(${scale})`,
        }}
      >
        <div
          style={{
            width: '100%',
            backgroundColor: WHITE,
            borderRadius: 24,
            padding: '22px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: GREEN,
              color: WHITE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: sans,
              fontWeight: 900,
              fontSize: 36,
            }}
          >
            $
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 18, color: MUTED, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Payment Request
            </div>
            <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 28, color: INK, letterSpacing: '-0.02em', marginTop: 2 }}>
              {b.from} → {b.to}
            </div>
            <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 20, color: MUTED, marginTop: 4 }}>
              {b.reason}
            </div>
          </div>
          <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 56, color: GREEN, letterSpacing: '-0.03em' }}>
            ${b.amount}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: rightAlign ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 12,
        margin: '10px 0',
        opacity: op,
        transform: `translateY(${y}px) scale(${scale})`,
      }}
    >
      {!rightAlign && <Avatar name={b.name!} color={avatarColors[b.name!] ?? MUTED} />}
      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: rightAlign ? 'flex-end' : 'flex-start' }}>
        {!rightAlign && (
          <div
            style={{
              fontFamily: sans,
              fontWeight: 700,
              fontSize: 16,
              color: MUTED,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: 6,
              marginLeft: 6,
            }}
          >
            {b.name}
          </div>
        )}
        <div
          style={{
            backgroundColor: rightAlign ? GOLD : '#2A2A2A',
            color: rightAlign ? INK : WHITE,
            padding: b.type === 'typing' ? '14px 20px' : '18px 22px',
            borderRadius: 28,
            borderBottomRightRadius: rightAlign ? 8 : 28,
            borderBottomLeftRadius: rightAlign ? 28 : 8,
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 34,
            letterSpacing: '-0.01em',
            lineHeight: 1.18,
          }}
        >
          {b.type === 'typing' ? <TypingDots /> : b.text}
        </div>
      </div>
    </div>
  );
};

const ChatScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const headerOp = clamp(frame, [0, 10], [0, 1]);
  const fade = clamp(frame, [duration - 8, duration], [1, 0]);

  // Drop old messages after their dwell so we stay visible — keep last 6 active
  const activeMessages = chatScript.filter((b) => frame >= b.at);
  const visibleWindow = activeMessages.slice(-6);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, opacity: fade, padding: '36px 40px 40px' }}>
      {/* Header bar — iMessage-style */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '18px 4px 22px',
          borderBottom: `1px solid ${LINE}`,
          opacity: headerOp,
        }}
      >
        <div style={{ display: 'flex' }}>
          {['Mike', 'Dan', 'John'].map((n, i) => (
            <div key={n} style={{ marginLeft: i === 0 ? 0 : -14 }}>
              <Avatar name={n} color={avatarColors[n]} />
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 38, color: WHITE, letterSpacing: '-0.02em', lineHeight: 1 }}>
            GOLF BOYS
          </div>
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 18, color: GOLD, letterSpacing: '0.24em', textTransform: 'uppercase', marginTop: 4 }}>
            · 4 members · Active
          </div>
        </div>
        <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 18, color: MUTED, letterSpacing: '0.12em' }}>
          FRI · 6:47 AM
        </div>
      </div>

      {/* Chat list — stick to bottom */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          overflow: 'hidden',
          paddingTop: 20,
        }}
      >
        {visibleWindow.map((b) => (
          <MessageRow key={`${b.at}-${b.name}-${b.type}`} b={b} localF={frame - b.at} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// Hook — "POV" lead-in before chat
// ============================================================================
const PovHook: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = clamp(frame, [0, 8], [0, 1]);
  const fade = clamp(frame, [duration - 5, duration], [1, 0]);
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 240 } });
  const ruleW = clamp(frame, [8, 20], [0, 360]);
  return (
    <AbsoluteFill style={{ backgroundColor: INK, alignItems: 'center', justifyContent: 'center', opacity: fade }}>
      <div style={{ textAlign: 'center', opacity: op, padding: '0 56px' }}>
        <div
          style={{
            fontFamily: sans,
            fontWeight: 700,
            fontSize: 34,
            letterSpacing: '0.5em',
            color: GOLD,
            textTransform: 'uppercase',
          }}
        >
          POV
        </div>
        <div style={{ width: ruleW, height: 8, backgroundColor: GOLD, margin: '28px auto 28px' }} />
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 140,
            letterSpacing: '-0.055em',
            color: WHITE,
            lineHeight: 0.95,
            transform: `scale(${interpolate(p, [0, 1], [1.15, 1])})`,
          }}
        >
          the group
        </div>
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 140,
            letterSpacing: '-0.055em',
            color: GOLD,
            lineHeight: 0.95,
            marginTop: 6,
            transform: `scale(${interpolate(p, [0, 1], [1.15, 1])})`,
          }}
        >
          chat.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================================
// COMPOSITION
// 0-45    POV hook               (1.5s)
// 45-105  ClipBeat v2-05 cigar   (2s)  — native audio
// 105-465 ChatScene              (12s)
// 465-510 ClipBeat v1-04         (1.5s) — "the fun part."
// 510-540 Outro                  (1s)
// ============================================================================
export const LaunchUIGroupChat: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Sequence from={0} durationInFrames={45}>
        <PovHook duration={45} />
      </Sequence>

      <Sequence from={45} durationInFrames={60}>
        <ClipBeat
          src="launch-clips-v2/clip-05.mp4"
          duration={60}
          startFrom={10}
          headline="FRIDAY, 6:47 AM"
          sub="The Group Starts Talking"
          accent
          position="bottom"
          volume={0.9}
        />
      </Sequence>

      <Sequence from={105} durationInFrames={360}>
        <ChatScene duration={360} />
      </Sequence>

      <Sequence from={465} durationInFrames={45}>
        <ClipBeat
          src="launch-clips/clip-04-cinematic.mp4"
          duration={45}
          startFrom={20}
          headline="JUST GO PLAY."
          accent
          position="center"
          volume={0.9}
        />
      </Sequence>

      <Sequence from={510} durationInFrames={30}>
        <Outro duration={30} />
      </Sequence>
    </AbsoluteFill>
  );
};
