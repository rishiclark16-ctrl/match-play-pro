import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import {
  INK,
  ClipBeat,
  Scorecard,
  MoneyTracker,
  Settlement,
  Outro,
} from './launchScenes';

export const LAUNCH_UI_ROUND_B_DURATION = 540;

// 18s at 30fps — "Q&A" (clips ask, UI answers)
// 0-60    ClipBeat v2-05 "WHAT'S THE BET?"   (cigar — provocation)
// 60-210  SCORECARD                           (answer: "the score.")
// 210-270 ClipBeat v2-02 "WHO'S UP?"          (ocean tee pause)
// 270-390 MONEY                                (answer: "running tab")
// 390-450 ClipBeat v1-travel "WHO PAYS?"      (carts driving off)
// 450-510 SETTLEMENT                           (answer: "done.")
// 510-540 OUTRO
export const LaunchUIRoundB: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Audio src={staticFile('launch-clips/sfx-round-b.mp3')} volume={0.7} />

      <Sequence from={0} durationInFrames={60}>
        <ClipBeat
          src="launch-clips-v2/clip-05.mp4"
          duration={60}
          startFrom={10}
          headline="WHAT'S THE BET?"
          sub="Nassau · Skins · Stableford"
          accent
          position="center"
          volume={0.9}
        />
      </Sequence>

      <Sequence from={60} durationInFrames={150}>
        <Scorecard duration={150} perCol={10} />
      </Sequence>

      <Sequence from={210} durationInFrames={60}>
        <ClipBeat
          src="launch-clips-v2/clip-02.mp4"
          duration={60}
          startFrom={25}
          headline="WHO'S UP?"
          sub="Tap to See the Tab"
          position="center"
          objectPosition="center 40%"
          volume={0.9}
        />
      </Sequence>

      <Sequence from={270} durationInFrames={120}>
        <MoneyTracker duration={120} />
      </Sequence>

      <Sequence from={390} durationInFrames={60}>
        <ClipBeat
          src="launch-clips/clip-05-travel.mp4"
          duration={60}
          startFrom={12}
          headline="WHO PAYS?"
          sub="Settle In Seconds"
          accent
          position="center"
          volume={0.9}
        />
      </Sequence>

      <Sequence from={450} durationInFrames={60}>
        <Settlement duration={60} stampAt={38} />
      </Sequence>

      <Sequence from={510} durationInFrames={30}>
        <Outro duration={30} />
      </Sequence>
    </AbsoluteFill>
  );
};
