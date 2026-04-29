import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, Users, Gamepad2 } from 'lucide-react';
import { TeeSelector } from '@/components/golf/TeeSelector';
import { CourseStep } from '@/components/golf/CourseStep';
import { PlayersStep } from '@/components/golf/PlayersStep';
import { FormatStep } from '@/components/golf/FormatStep';
import { NewRoundStepHeader } from '@/components/golf/NewRoundStepHeader';
import { NewRoundFormatHeader } from '@/components/golf/NewRoundFormatHeader';
import { NewRoundBottomCta } from '@/components/golf/NewRoundBottomCta';
import { NewRoundModeStep } from '@/components/golf/NewRoundModeStep';
import { useCourses } from '@/hooks/useCourses';
import { useGolfCourseSearch } from '@/hooks/useGolfCourseSearch';
import { useCreateSupabaseRound } from '@/hooks/useCreateSupabaseRound';
import { useProfile } from '@/hooks/useProfile';
import { useFriends } from '@/hooks/useFriends';
import { useGroups } from '@/hooks/useGroups';
import { useHouseGame } from '@/hooks/useHouseGame';
import { usePersonalGameFormats } from '@/hooks/usePersonalGameFormats';
import { useGroupFormats } from '@/hooks/useGroupFormats';
import { useSubscription } from '@/hooks/useSubscription';
import { Course, Team } from '@/types/golf';
import { PersonalGameFormat } from '@/types/houseGame';
import { toast } from 'sonner';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { PaywallModal } from '@/components/subscription/PaywallModal';
import { useFormatActiveSync } from '@/hooks/useFormatActiveSync';
import { createSoloRound } from '@/lib/createSoloRound';
import { useApiCourseSelection } from '@/hooks/useApiCourseSelection';
import { useMixedTees } from '@/hooks/useMixedTees';
import { usePlayerRoster } from '@/hooks/usePlayerRoster';
import { useStartRound } from '@/hooks/useStartRound';

type Step = 'mode' | 'course' | 'players' | 'format';
type RoundMode = 'solo' | 'multi';

interface PlayerData {
  id: string;
  name: string;
  handicap?: number;
  manualStrokes?: number;
  profileId?: string;
  isGhost?: boolean;
  teeSetId?: string;
}

export default function NewRound() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPro } = useSubscription();
  const { createRound } = useCreateSupabaseRound();
  const { courses, createCourse, getDefaultHoles } = useCourses();
  const { getCourseDetails, convertToHoleInfo, getTeeInfo } = useGolfCourseSearch();
  const { profile } = useProfile();
  const { friends } = useFriends();
  const { groups } = useGroups();

  // UI state
  const [isCreatingSolo, setIsCreatingSolo] = useState(false);
  const [step, setStep] = useState<Step>('mode');
  const [mode, setMode] = useState<RoundMode>('multi');
  const [showPaywall, setShowPaywall] = useState(false);

  // Course state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseLocation, setCourseLocation] = useState('');
  const [holeCount, setHoleCount] = useState<9 | 18>(18);

  // API course selection (search → tee dialog → finalize)
  const {
    isLoadingApiCourse, showTeeSelector, setShowTeeSelector,
    pendingCourseDetails, courseApiDetails, handleSelectApiCourse, handleTeeSelect,
  } = useApiCourseSelection({
    getCourseDetails, convertToHoleInfo, getTeeInfo,
    createCourse, setSelectedCourse, setHoleCount,
  });

  // Players state
  const [players, setPlayers] = useState<PlayerData[]>([
    { id: '1', name: '', handicap: undefined, manualStrokes: 0 },
    { id: '2', name: '', handicap: undefined, manualStrokes: 0 },
  ]);
  const [handicapMode, setHandicapMode] = useState<'auto' | 'manual'>('auto');
  const [profileApplied, setProfileApplied] = useState(false);
  const [addedFriendIds, setAddedFriendIds] = useState<string[]>([]);

  // Format state
  const [strokePlay, setStrokePlay] = useState(true);
  const [matchPlay, setMatchPlay] = useState(false);
  const [matchPlayFormat, setMatchPlayFormat] = useState<'singles' | 'fourball'>('singles');
  const [matchPlayTeamA, setMatchPlayTeamA] = useState<string[]>([]);
  const [matchPlayTeamB, setMatchPlayTeamB] = useState<string[]>([]);
  const [stakes, setStakes] = useState('');
  const [skinsEnabled, setSkinsEnabled] = useState(false);
  const [skinsStakes, setSkinsStakes] = useState('2');
  const [skinsCarryover, setSkinsCarryover] = useState(true);
  const [nassauEnabled, setNassauEnabled] = useState(false);
  const [nassauStakes, setNassauStakes] = useState('5');
  const [nassauAutoPress, setNassauAutoPress] = useState(false);
  const [stablefordEnabled, setStablefordEnabled] = useState(false);
  const [stablefordModified, setStablefordModified] = useState(false);
  const [bestBallEnabled, setBestBallEnabled] = useState(false);
  const [bestBallTeams, setBestBallTeams] = useState<Team[]>([]);
  const [wolfEnabled, setWolfEnabled] = useState(false);
  const [wolfStakes, setWolfStakes] = useState('2');
  const [wolfCarryover, setWolfCarryover] = useState(true);
  const [vegasEnabled, setVegasEnabled] = useState(false);
  const [vegasStakes, setVegasStakes] = useState('1');
  const [vegasCarryover, setVegasCarryover] = useState(false);
  const [ninesEnabled, setNinesEnabled] = useState(false);
  const [ninesStakes, setNinesStakes] = useState('1');
  const [defenderEnabled, setDefenderEnabled] = useState(false);
  const [defenderStakes, setDefenderStakes] = useState('1');
  const [sixesEnabled, setSixesEnabled] = useState(false);
  const [sixesStakes, setSixesStakes] = useState('1');


  // Group + house game
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [houseGameEnabled, setHouseGameEnabled] = useState(true);
  const { houseGame } = useHouseGame(selectedGroupId);
  const { assignment: groupFormatAssignment } = useGroupFormats(selectedGroupId ?? null);
  const groupAssignedFormat = groupFormatAssignment?.format ?? null;

  // Personal saved formats
  const { formats: personalFormats, cloneFormat } = usePersonalGameFormats();
  const [selectedPersonalFormatId, setSelectedPersonalFormatId] = useState<string | null>(null);
  const selectedPersonalFormat =
    personalFormats.find(f => f.id === selectedPersonalFormatId)
    ?? (groupAssignedFormat?.id === selectedPersonalFormatId ? groupAssignedFormat : null)
    ?? null;

  // When a format is selected, it controls all scoring — disable manual toggles
  const formatActive = !!selectedPersonalFormat;

  // Store previous toggle state so we can restore on deselect
  useFormatActiveSync({
    formatActive,
    current: { strokePlay, matchPlay, skinsEnabled, nassauEnabled, stablefordEnabled, bestBallEnabled, wolfEnabled, vegasEnabled, ninesEnabled, defenderEnabled, sixesEnabled },
    setters: {
      strokePlay: setStrokePlay, matchPlay: setMatchPlay, skinsEnabled: setSkinsEnabled,
      nassauEnabled: setNassauEnabled, stablefordEnabled: setStablefordEnabled, bestBallEnabled: setBestBallEnabled,
      wolfEnabled: setWolfEnabled, vegasEnabled: setVegasEnabled, ninesEnabled: setNinesEnabled,
      defenderEnabled: setDefenderEnabled, sixesEnabled: setSixesEnabled,
    },
  });

  // Ghost player — active when house game or personal format has handicap_ghost_player primitive
  const ghostPrimitiveActive =
    (houseGame?.activePrimitives?.some(p => p.id === 'handicap_ghost_player') && houseGameEnabled) ||
    (selectedPersonalFormat?.activePrimitives?.some(p => p.id === 'handicap_ghost_player') ?? false) ||
    (groupAssignedFormat?.activePrimitives?.some(p => p.id === 'handicap_ghost_player') ?? false);
  const [ghostName, setGhostName] = useState('Ghost');
  const [ghostHandicap, setGhostHandicap] = useState<number | undefined>(undefined);

  // Mixed tees state + handlers
  const { mixedTees, roundTeeSets, setRoundTeeSets, playerTeeIds, handleMixedTeesChange, handleUpdatePlayerTee }
    = useMixedTees({ courseApiDetails });

  // Auto-enable mixed tees when house game has the primitive active
  const mixedTeesPrimitiveActive = houseGame?.activePrimitives?.some(p => p.id === 'handicap_mixed_tees') ?? false;

  // Auto-fill first player from profile
  useEffect(() => {
    if (profile && !profileApplied && profile.full_name) {
      setPlayers(prev => {
        const updated = [...prev];
        if (!updated[0].name) {
          updated[0] = {
            ...updated[0],
            name: profile.full_name || '',
            handicap: profile.handicap ?? undefined,
          };
        }
        return updated;
      });
      setProfileApplied(true);
    }
  }, [profile, profileApplied]);

  // Pre-select format when coming back from AI builder — restore saved form state
  useEffect(() => {
    const preSelectFormatId = (location.state as { preSelectFormatId?: string } | null)?.preSelectFormatId;
    if (preSelectFormatId) {
      setMode('multi');
      setSelectedPersonalFormatId(preSelectFormatId);

      // Restore form state saved before navigating to the AI builder
      try {
        const saved = sessionStorage.getItem('newRoundState');
        if (saved) {
          const s = JSON.parse(saved);
          if (s.selectedCourse) setSelectedCourse(s.selectedCourse);
          if (s.courseName) setCourseName(s.courseName);
          if (s.holeCount) setHoleCount(s.holeCount);
          if (s.players?.length) {
            setPlayers(s.players);
            setProfileApplied(true);
          }
          if (s.handicapMode) setHandicapMode(s.handicapMode);
          if (s.strokePlay !== undefined) setStrokePlay(s.strokePlay);
          if (s.matchPlay !== undefined) setMatchPlay(s.matchPlay);
          if (s.stakes) setStakes(s.stakes);
          sessionStorage.removeItem('newRoundState');
        }
      } catch { /* ignore parse errors */ }

      // Jump straight to format step
      setStep('format');
      // Clear state so back-navigation doesn't re-trigger
      window.history.replaceState({}, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validation
  const canProceedCourse = selectedCourse || (showCourseForm && courseName.trim());
  const canProceedPlayers = players.filter(p => p.name.trim()).length >= 2;

  // Course handlers
  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setHoleCount(course.holes.length === 9 ? 9 : 18);
  };

  const handleCreateCourse = () => {
    if (courseName.trim()) {
      const holes = getDefaultHoles(holeCount);
      const course = createCourse(courseName.trim(), courseLocation.trim() || undefined, holes);
      setSelectedCourse(course);
      setShowCourseForm(false);
    }
  };

  // Player roster: CRUD + add-friend + load-group.
  const { addPlayer, removePlayer, updatePlayer, handleAddFriend, handleSelectGroup } = usePlayerRoster({
    players,
    setPlayers,
    setAddedFriendIds,
    groupHooks: { setSelectedGroupId, setHouseGameEnabled },
  });

  // Solo round creator — single player, no games, minimal fields.
  const handleStartSoloRound = async () => {
    if (!selectedCourse || isCreatingSolo) return;
    setIsCreatingSolo(true);
    const outcome = await createSoloRound({ selectedCourse, holeCount, profile, createRound });
    if (outcome.ok) {
      toast.success('Solo round started — good luck!');
      navigate(`/round/${outcome.roundId}`);
    } else {
      toast.error(outcome.message);
      if (outcome.isAuthError) navigate('/auth');
    }
    setIsCreatingSolo(false);
  };

  // Start (multi) round handler — `useStartRound` owns its own isCreating flag.
  const { isCreating: isCreatingMulti, startRound } = useStartRound({ createRound });
  const handleStartRound = () => startRound({
    selectedCourse, holeCount, players, handicapMode,
    strokePlay, matchPlay, matchPlayFormat, matchPlayTeamA, matchPlayTeamB, stakes,
    skinsEnabled, skinsStakes, skinsCarryover,
    nassauEnabled, nassauStakes, nassauAutoPress,
    stablefordEnabled, stablefordModified, bestBallEnabled, bestBallTeams,
    wolfEnabled, wolfStakes, wolfCarryover,
    vegasEnabled, vegasStakes, vegasCarryover,
    ninesEnabled, ninesStakes, defenderEnabled, defenderStakes,
    sixesEnabled, sixesStakes,
    mixedTees, roundTeeSets, playerTeeIds,
    houseGame, houseGameEnabled, selectedPersonalFormat,
    ghostPrimitiveActive, ghostName, ghostHandicap,
  });
  // Combined isCreating drives the bottom CTAs (solo + multi share the same button area)
  const isCreating = isCreatingSolo || isCreatingMulti;

  const handleUseThisGame = async (format: PersonalGameFormat) => {
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    hapticLight();
    const newId = await cloneFormat(format.id);
    if (newId) {
      toast.success(`"${format.name}" saved to your formats`);
      hapticSuccess();
    } else {
      toast.error('Failed to save format');
      hapticError();
    }
  };

  const steps: Step[] = mode === 'solo'
    ? ['mode', 'course']
    : ['mode', 'course', 'players', 'format'];
  const currentStepIndex = steps.indexOf(step);
  const stepConfig = {
    mode: { title: 'New Round', icon: Flag },
    course: { title: 'Course Setup', icon: Flag },
    players: { title: 'Add Players', icon: Users },
    format: { title: 'Game Format', icon: Gamepad2 },
  };

  const isFinalStep = step === steps[steps.length - 1];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background relative">
      {/* Fixed Header */}
      <NewRoundStepHeader
        steps={steps}
        step={step}
        stepConfig={stepConfig}
        onBack={() =>
          currentStepIndex > 0 ? setStep(steps[currentStepIndex - 1]) : navigate('/')
        }
      />

      {/* Scrollable Content */}
      <main
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain relative z-10 px-4 pb-32 bg-background"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <AnimatePresence mode="wait">
          {step === 'mode' && (
            <NewRoundModeStep
              onSelect={(m) => { setMode(m); setStep('course'); }}
            />
          )}
          {step === 'course' && (
            <CourseStep
              key="course"
              courses={courses}
              selectedCourse={selectedCourse}
              showCourseForm={showCourseForm}
              courseName={courseName}
              courseLocation={courseLocation}
              holeCount={holeCount}
              isLoadingApiCourse={isLoadingApiCourse}
              onSelectCourse={handleSelectCourse}
              onSelectApiCourse={handleSelectApiCourse}
              onShowCourseForm={setShowCourseForm}
              onCourseNameChange={setCourseName}
              onCourseLocationChange={setCourseLocation}
              onHoleCountChange={setHoleCount}
              onCreateCourse={handleCreateCourse}
            />
          )}
          {step === 'players' && (
            <PlayersStep
              key="players"
              players={players}
              handicapMode={handicapMode}
              friends={friends}
              groups={groups}
              addedFriendIds={addedFriendIds}
              onAddPlayer={addPlayer}
              onRemovePlayer={removePlayer}
              onUpdatePlayer={updatePlayer}
              onHandicapModeChange={setHandicapMode}
              onAddFriend={handleAddFriend}
              onSelectGroup={handleSelectGroup}
              onNavigateToFriends={() => navigate('/social?tab=friends')}
              onNavigateToGroups={() => navigate('/groups')}
              mixedTees={mixedTees || mixedTeesPrimitiveActive}
              roundTeeSets={roundTeeSets}
              playerTeeIds={playerTeeIds}
              courseApiDetails={courseApiDetails}
              onMixedTeesChange={handleMixedTeesChange}
              onUpdateTeeSets={setRoundTeeSets}
              onUpdatePlayerTee={handleUpdatePlayerTee}
            />
          )}
          {step === 'format' && (
            <motion.div
              key="format"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <NewRoundFormatHeader
                houseGame={houseGame}
                houseGameEnabled={houseGameEnabled}
                onToggleHouseGame={() => setHouseGameEnabled(v => !v)}
                ghost={{
                  active: ghostPrimitiveActive,
                  name: ghostName,
                  handicap: ghostHandicap,
                  onNameChange: setGhostName,
                  onHandicapChange: setGhostHandicap,
                }}
              />

            <FormatStep
              players={players}
              strokePlay={strokePlay} onStrokePlayChange={setStrokePlay}
              matchPlay={matchPlay} onMatchPlayChange={setMatchPlay}
              matchPlayFormat={matchPlayFormat}
              matchPlayTeamA={matchPlayTeamA} matchPlayTeamB={matchPlayTeamB}
              stakes={stakes} onStakesChange={setStakes}
              onMatchPlayFormatChange={(fmt) => {
                setMatchPlayFormat(fmt);
                if (fmt === 'fourball' && matchPlayTeamA.length === 0 && matchPlayTeamB.length === 0) {
                  const half = Math.ceil(players.length / 2);
                  setMatchPlayTeamA(players.slice(0, half).map(p => p.id));
                  setMatchPlayTeamB(players.slice(half).map(p => p.id));
                }
              }}
              onMatchPlayTeamsChange={(a, b) => { setMatchPlayTeamA(a); setMatchPlayTeamB(b); }}
              skinsEnabled={skinsEnabled} onSkinsEnabledChange={setSkinsEnabled}
              skinsStakes={skinsStakes} onSkinsStakesChange={setSkinsStakes}
              skinsCarryover={skinsCarryover} onSkinsCarryoverChange={setSkinsCarryover}
              nassauEnabled={nassauEnabled} onNassauEnabledChange={setNassauEnabled}
              nassauStakes={nassauStakes} onNassauStakesChange={setNassauStakes}
              nassauAutoPress={nassauAutoPress} onNassauAutoPressChange={setNassauAutoPress}
              stablefordEnabled={stablefordEnabled} onStablefordEnabledChange={setStablefordEnabled}
              stablefordModified={stablefordModified} onStablefordModifiedChange={setStablefordModified}
              bestBallEnabled={bestBallEnabled} onBestBallEnabledChange={setBestBallEnabled}
              wolfEnabled={wolfEnabled} onWolfEnabledChange={setWolfEnabled}
              wolfStakes={wolfStakes} onWolfStakesChange={setWolfStakes}
              wolfCarryover={wolfCarryover} onWolfCarryoverChange={setWolfCarryover}
              vegasEnabled={vegasEnabled} onVegasEnabledChange={setVegasEnabled}
              vegasStakes={vegasStakes} onVegasStakesChange={setVegasStakes}
              vegasCarryover={vegasCarryover} onVegasCarryoverChange={setVegasCarryover}
              ninesEnabled={ninesEnabled} onNinesEnabledChange={setNinesEnabled}
              ninesStakes={ninesStakes} onNinesStakesChange={setNinesStakes}
              defenderEnabled={defenderEnabled} onDefenderEnabledChange={setDefenderEnabled}
              defenderStakes={defenderStakes} onDefenderStakesChange={setDefenderStakes}
              sixesEnabled={sixesEnabled} onSixesEnabledChange={setSixesEnabled}
              sixesStakes={sixesStakes} onSixesStakesChange={setSixesStakes}
              personalFormats={personalFormats}
              selectedPersonalFormatId={selectedPersonalFormatId}
              onPersonalFormatSelect={setSelectedPersonalFormatId}
              onBuildNewFormat={() => {
                // Save form state so we can restore it when coming back from the AI builder
                try {
                  sessionStorage.setItem('newRoundState', JSON.stringify({
                    selectedCourse, courseName, holeCount, players, handicapMode, strokePlay, matchPlay, stakes,
                  }));
                } catch { /* quota exceeded — proceed without saving */ }
                navigate('/my-formats/new', { state: { returnTo: '/new-round' } });
              }}
              formatActive={formatActive}
              selectedFormatName={selectedPersonalFormat?.name}
              groupAssignedFormat={groupAssignedFormat}
              onUseThisGame={handleUseThisGame}
              isPro={isPro}
              onPaywall={() => setShowPaywall(true)}
            />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <NewRoundBottomCta
        step={step}
        mode={mode}
        isCreating={isCreating}
        isFinalStep={isFinalStep}
        handlers={{
          onStartSoloRound: handleStartSoloRound,
          onStartRound: handleStartRound,
          onNext: () => setStep(steps[currentStepIndex + 1]),
        }}
        disabled={{
          next: step === 'course' ? !canProceedCourse : !canProceedPlayers,
          startSolo: !canProceedCourse || isCreating,
          startRound: (!formatActive && !strokePlay && !matchPlay) || isCreating,
        }}
      />

      {/* Tee Selector Modal */}
      <TeeSelector
        isOpen={showTeeSelector}
        courseDetails={pendingCourseDetails}
        onSelectTee={handleTeeSelect}
        onClose={() => {
          setShowTeeSelector(false);
          setPendingCourseDetails(null);
          setPendingApiCourse(null);
        }}
      />

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="Save Game Formats"
      />
    </div>
  );
}
