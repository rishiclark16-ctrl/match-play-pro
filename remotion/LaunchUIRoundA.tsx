import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import {
  INK,
  ClipBeat,
  Hook,
  Scorecard,
  MoneyTracker,
  Settlement,
  Outro,
} from './launchScenes';

export const LAUNCH_UI_ROUND_A_DURATION = 540;

// 18s at 30fps — "A ROUND" (workweek arc)
// 0-60    ClipBeat v2-02 "MONDAY"       (setup — ocean tee)
// 60-210  SCORECARD                      (150f)
// 210-270 ClipBeat v2-05 "TUESDAY"      (cigar in cart)
// 270-380 MONEY                          (110f)
// 380-440 ClipBeat v1-travel "WEDNESDAY" (carts roll off)
// 440-510 SETTLEMENT                     (70f)
// 510-540 OUTRO                          (30f)
export const LaunchUIRoundA: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Audio src={staticFile('launch-clips/sfx-round-a.mp3')} volume={0.75} />

      <Sequence from={0} durationInFrames={60}>
        <ClipBeat
          src="launch-clips-v2/clip-02.mp4"
          duration={60}
          startFrom={20}
          headline="MONDAY"
          sub="Tee It Up"
          accent
          position="bottom"
          objectPosition="center 35%"
          volume={0.9}
        />
      </Sequence>

      <Sequence from={60} durationInFrames={150}>
        <Scorecard duration={150} perCol={10} />
      </Sequence>

      <Sequence from={210} durationInFrames={60}>
        <ClipBeat
          src="launch-clips-v2/clip-05.mp4"
          duration={60}
          startFrom={15}
          headline="TUESDAY"
          sub="Swing + Smoke"
          accent
          position="bottom"
          volume={0.9}
        />
      </Sequence>

      <Sequence from={270} durationInFrames={110}>
        <MoneyTracker duration={110} />
      </Sequence>

      <Sequence from={380} durationInFrames={60}>
        <ClipBeat
          src="launch-clips/clip-05-travel.mp4"
          duration={60}
          startFrom={20}
          headline="WEDNESDAY"
          sub="Next Hole"
          accent
          position="bottom"
          volume={0.9}
        />
      </Sequence>

      <Sequence from={440} durationInFrames={70}>
        <Settlement duration={70} stampAt={45} />
      </Sequence>

      <Sequence from={510} durationInFrames={30}>
        <Outro duration={30} />
      </Sequence>
    </AbsoluteFill>
  );
};
