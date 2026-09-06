import React from 'react';
import { Img, staticFile } from 'remotion';

// iPhone 17 Pro Max (Deep Blue) transparent frame from
// github.com/jamesjingyi/mockup-device-frames (CC-BY).
// The PNG is 1520×3068 with an opaque titanium frame around a
// transparent screen slot. We position the screenshot behind the
// frame, aligned to the slot, and optionally tilt the whole group
// with a CSS 3D perspective transform.
//
// Screen-slot coordinates (measured from the PNG alpha channel):
//   left  = 0.0658
//   top   = 0.0828
//   right = 0.9336
//   bot   = 0.9671

const FRAME_SRC = 'iphone-frame.png';
const FRAME_W = 1520;
const FRAME_H = 3068;
const SLOT_L = 0.065789;
const SLOT_T = 0.082790;
const SLOT_R = 0.933553;
const SLOT_B = 0.967080;

type Props = {
  src: string;
  // Height of the phone (including bezel) in px. Width derives from aspect.
  height: number;
  rotateY?: number;
  rotateX?: number;
  rotateZ?: number;
  shadow?: boolean;
};

export const PhoneMockup: React.FC<Props> = ({
  src,
  height,
  rotateY = 0,
  rotateX = 0,
  rotateZ = 0,
  shadow = true,
}) => {
  const width = (FRAME_W / FRAME_H) * height;

  // Screen slot in px inside the phone container
  const slotLeft = SLOT_L * width;
  const slotTop = SLOT_T * height;
  const slotWidth = (SLOT_R - SLOT_L) * width;
  const slotHeight = (SLOT_B - SLOT_T) * height;

  const filter = shadow
    ? 'drop-shadow(0 40px 60px rgba(0,0,0,0.55)) drop-shadow(0 10px 20px rgba(0,0,0,0.35))'
    : undefined;

  return (
    <div
      style={{
        width,
        height,
        perspective: 3200,
        perspectiveOrigin: 'center center',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
          transformOrigin: 'center center',
          transformStyle: 'preserve-3d',
          filter,
        }}
      >
        {/* Screenshot sits inside the slot */}
        <div
          style={{
            position: 'absolute',
            left: slotLeft,
            top: slotTop,
            width: slotWidth,
            height: slotHeight,
            overflow: 'hidden',
            background: '#000',
          }}
        >
          <Img
            src={staticFile(src)}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'cover',
            }}
          />
        </div>
        {/* Real phone frame overlay */}
        <Img
          src={staticFile(FRAME_SRC)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
};
