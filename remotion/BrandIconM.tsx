import React from 'react';
import { AbsoluteFill } from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';

const { fontFamily: sans } = loadInter();

const INK = '#0A0A0A';
const WHITE = '#FFFFFF';
const GOLD = '#F0EE3A';

// Square profile icon — bold "M" on INK background with gold underline accent.
// Rendered as a 1024x1024 still for TikTok / Instagram profile use.
export const BrandIconM: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 760,
            letterSpacing: '-0.05em',
            lineHeight: 0.85,
            color: WHITE,
          }}
        >
          M
        </div>
        <div
          style={{
            width: 360,
            height: 36,
            backgroundColor: GOLD,
            marginTop: 36,
            borderRadius: 4,
            boxShadow: `0 0 48px ${GOLD}66`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
