import { Composition } from 'remotion';
import { AppPromo } from './AppPromo';
import { Launch } from './Launch';
import { WinnersPlay } from './WinnersPlay';
import { GameCarousel } from './GameCarousel';
import { GAMES } from './gamesData';
import { GameSlam } from './GameSlam';
import { NapkinVsMatch } from './NapkinVsMatch';
import { AppStoreShot, SHOT_COUNT } from './AppStoreShot';
import { TikTokShot, TIKTOK_SHOT_COUNT } from './TikTokShot';
import { KineticReel } from './KineticReel';
import { LaunchVideo, LAUNCH_VIDEO_DURATION } from './LaunchVideo';
import { LaunchVideoV2, LAUNCH_VIDEO_V2_DURATION } from './LaunchVideoV2';
import { LaunchShortV1, LAUNCH_SHORT_V1_DURATION } from './LaunchShortV1';
import { LaunchShortV2, LAUNCH_SHORT_V2_DURATION } from './LaunchShortV2';
import { LaunchDayToNight, LAUNCH_DAY_TO_NIGHT_DURATION } from './LaunchDayToNight';
import { LaunchUIDemo, LAUNCH_UI_DEMO_DURATION } from './LaunchUIDemo';
import { LaunchUIDemoV2, LAUNCH_UI_DEMO_V2_DURATION } from './LaunchUIDemoV2';
import { LaunchUIRoundA, LAUNCH_UI_ROUND_A_DURATION } from './LaunchUIRoundA';
import { LaunchUIRoundB, LAUNCH_UI_ROUND_B_DURATION } from './LaunchUIRoundB';
import { LaunchUIVersus, LAUNCH_UI_VERSUS_DURATION } from './LaunchUIVersus';
import { LaunchUIOddsBoard, LAUNCH_UI_ODDSBOARD_DURATION } from './LaunchUIOddsBoard';
import { LaunchUIGroupChat, LAUNCH_UI_GROUPCHAT_DURATION } from './LaunchUIGroupChat';
import { LaunchUIRanked, LAUNCH_UI_RANKED_DURATION } from './LaunchUIRanked';
import { BrandIconM } from './BrandIconM';
import { WelcomeMatch, WELCOME_MATCH_DURATION } from './WelcomeMatch';

const APP_STORE_SHOTS = Array.from({ length: SHOT_COUNT }, (_, i) => i);
const TIKTOK_SHOTS = Array.from({ length: TIKTOK_SHOT_COUNT }, (_, i) => i);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WinnersPlay"
        component={WinnersPlay}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="GameSlam"
        component={GameSlam}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="NapkinVsMatch"
        component={NapkinVsMatch}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1920}
      />
      {APP_STORE_SHOTS.map((i) => (
        <Composition
          key={`AppStore-${i}`}
          id={`AppStore-${String(i + 1).padStart(2, '0')}`}
          component={AppStoreShot}
          durationInFrames={1}
          fps={30}
          width={1284}
          height={2778}
          defaultProps={{ shotIndex: i }}
        />
      ))}
      {TIKTOK_SHOTS.map((i) => (
        <Composition
          key={`TikTok-${i}`}
          id={`TikTok-${String(i + 1).padStart(2, '0')}`}
          component={TikTokShot}
          durationInFrames={240}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{ shotIndex: i }}
        />
      ))}
      {GAMES.map((g) => (
        <Composition
          key={g.id}
          id={`Game-${g.id}`}
          component={GameCarousel}
          durationInFrames={180}
          fps={30}
          width={1080}
          height={1350}
          defaultProps={{ gameId: g.id }}
        />
      ))}
      <Composition
        id="AppPromo"
        component={AppPromo}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Launch"
        component={Launch}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="KineticReel-TikTok"
        component={KineticReel}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ orientation: 'vertical' as const }}
      />
      <Composition
        id="KineticReel-Instagram"
        component={KineticReel}
        durationInFrames={600}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ orientation: 'horizontal' as const }}
      />
      <Composition
        id="LaunchVideo"
        component={LaunchVideo}
        durationInFrames={LAUNCH_VIDEO_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="LaunchVideoV2"
        component={LaunchVideoV2}
        durationInFrames={LAUNCH_VIDEO_V2_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="LaunchShortV1"
        component={LaunchShortV1}
        durationInFrames={LAUNCH_SHORT_V1_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LaunchShortV2"
        component={LaunchShortV2}
        durationInFrames={LAUNCH_SHORT_V2_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LaunchDayToNight"
        component={LaunchDayToNight}
        durationInFrames={LAUNCH_DAY_TO_NIGHT_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LaunchUIDemo"
        component={LaunchUIDemo}
        durationInFrames={LAUNCH_UI_DEMO_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LaunchUIDemoV2"
        component={LaunchUIDemoV2}
        durationInFrames={LAUNCH_UI_DEMO_V2_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LaunchUIRoundA"
        component={LaunchUIRoundA}
        durationInFrames={LAUNCH_UI_ROUND_A_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LaunchUIRoundB"
        component={LaunchUIRoundB}
        durationInFrames={LAUNCH_UI_ROUND_B_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LaunchUIVersus"
        component={LaunchUIVersus}
        durationInFrames={LAUNCH_UI_VERSUS_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LaunchUIOddsBoard"
        component={LaunchUIOddsBoard}
        durationInFrames={LAUNCH_UI_ODDSBOARD_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LaunchUIGroupChat"
        component={LaunchUIGroupChat}
        durationInFrames={LAUNCH_UI_GROUPCHAT_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LaunchUIRanked"
        component={LaunchUIRanked}
        durationInFrames={LAUNCH_UI_RANKED_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="BrandIconM"
        component={BrandIconM}
        durationInFrames={1}
        fps={30}
        width={1024}
        height={1024}
      />
      <Composition
        id="WelcomeMatch-Post"
        component={WelcomeMatch}
        durationInFrames={WELCOME_MATCH_DURATION}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="WelcomeMatch-Square"
        component={WelcomeMatch}
        durationInFrames={WELCOME_MATCH_DURATION}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="WelcomeMatch-Reel"
        component={WelcomeMatch}
        durationInFrames={WELCOME_MATCH_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
