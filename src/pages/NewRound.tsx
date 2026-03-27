import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Flag, Users, Gamepad2, Sparkles, ToggleLeft, ToggleRight, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeeSelector } from '@/components/golf/TeeSelector';
import { CourseStep } from '@/components/golf/CourseStep';
import { PlayersStep } from '@/components/golf/PlayersStep';
import { FormatStep } from '@/components/golf/FormatStep';
import { useCourses } from '@/hooks/useCourses';
import { useGolfCourseSearch, GolfCourseResult, GolfCourseDetails } from '@/hooks/useGolfCourseSearch';
import { useCreateSupabaseRound } from '@/hooks/useCreateSupabaseRound';
import { useProfile } from '@/hooks/useProfile';
import { useFriends, Friend } from '@/hooks/useFriends';
import { useGroups, GolfGroup } from '@/hooks/useGroups';
import { useHouseGame } from '@/hooks/useHouseGame';
import { Course, HoleInfo, GameConfig, Team, TeeSet, generateId } from '@/types/golf';
import { createDefaultTeams } from '@/lib/games/bestball';
import { buildConfig, summarizeScoringConfig } from '@/engine/HouseGameEngine';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Step = 'course' | 'players' | 'format';

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
  const { createRound } = useCreateSupabaseRound();
  const { courses, createCourse, getDefaultHoles } = useCourses();
  const { getCourseDetails, convertToHoleInfo, getTeeInfo } = useGolfCourseSearch();
  const { profile } = useProfile();
  const { friends } = useFriends();
  const { groups } = useGroups();

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<Step>('course');
  const [isLoadingApiCourse, setIsLoadingApiCourse] = useState(false);
  const [showTeeSelector, setShowTeeSelector] = useState(false);
  const [pendingCourseDetails, setPendingCourseDetails] = useState<GolfCourseDetails | null>(null);
  const [pendingApiCourse, setPendingApiCourse] = useState<GolfCourseResult | null>(null);

  // Course state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseLocation, setCourseLocation] = useState('');
  const [holeCount, setHoleCount] = useState<9 | 18>(18);

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

  // Group + house game
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [houseGameEnabled, setHouseGameEnabled] = useState(true);
  const { houseGame } = useHouseGame(selectedGroupId);

  // Ghost player — active when house game has handicap_ghost_player primitive
  const ghostPrimitiveActive = houseGame?.activePrimitives?.some(p => p.id === 'handicap_ghost_player') ?? false;
  const [ghostName, setGhostName] = useState('Ghost');
  const [ghostHandicap, setGhostHandicap] = useState<number | undefined>(undefined);

  // Mixed tees
  const [mixedTees, setMixedTees] = useState(false);
  const [roundTeeSets, setRoundTeeSets] = useState<TeeSet[]>([
    { id: 'blue', name: 'Blue', gender: 'mens', slope: 130, courseRating: 71.5, par: 72 },
    { id: 'red', name: 'Red', gender: 'womens', slope: 113, courseRating: 68.2, par: 72 },
  ]);
  const [playerTeeIds, setPlayerTeeIds] = useState<Map<string, string>>(new Map());

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

  const handleSelectApiCourse = async (apiCourse: GolfCourseResult) => {
    setIsLoadingApiCourse(true);
    try {
      const details = await getCourseDetails(apiCourse.id);
      if (details) {
        const hasTees = (details.tees?.male?.length || 0) + (details.tees?.female?.length || 0) > 0;
        if (hasTees) {
          setPendingCourseDetails(details);
          setPendingApiCourse(apiCourse);
          setShowTeeSelector(true);
        } else {
          finalizeCourseSelection(details, apiCourse);
        }
      }
    } catch {
      toast.error('Failed to load course details');
    } finally {
      setIsLoadingApiCourse(false);
    }
  };

  const handleTeeSelect = (teeName: string, gender: 'male' | 'female') => {
    if (!pendingCourseDetails || !pendingApiCourse) return;
    const teeInfo = getTeeInfo(pendingCourseDetails, teeName, gender);
    finalizeCourseSelection(pendingCourseDetails, pendingApiCourse, teeName, gender, teeInfo);
    setShowTeeSelector(false);
    setPendingCourseDetails(null);
    setPendingApiCourse(null);
  };

  const finalizeCourseSelection = (
    details: GolfCourseDetails,
    apiCourse: GolfCourseResult,
    teeName?: string,
    gender: 'male' | 'female' = 'male',
    teeInfo?: { slope_rating: number; course_rating: number }
  ) => {
    const holes = convertToHoleInfo(details, teeName, gender);
    const location = [details.location?.city, details.location?.state].filter(Boolean).join(', ');
    const name = details.course_name || apiCourse.course_name;
    const displayName = teeName ? `${name} (${teeName})` : name;

    const course = createCourse(
      displayName,
      location || undefined,
      holes,
      teeInfo?.slope_rating || details.tees?.male?.[0]?.slope_rating,
      teeInfo?.course_rating || details.tees?.male?.[0]?.course_rating
    );

    setSelectedCourse(course);
    setHoleCount(holes.length === 9 ? 9 : 18);
    toast.success(`Loaded ${displayName} with real par data!`);
  };

  // Player handlers
  const addPlayer = () => {
    if (players.length < 4) {
      setPlayers([...players, { id: Date.now().toString(), name: '', handicap: undefined, manualStrokes: 0 }]);
    }
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const updatePlayer = (id: string, updates: Partial<PlayerData>) => {
    setPlayers(players.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleAddFriend = (friend: Friend) => {
    const emptySlotIndex = players.findIndex(p => !p.name.trim());
    if (emptySlotIndex !== -1) {
      const updated = [...players];
      updated[emptySlotIndex] = {
        ...updated[emptySlotIndex],
        name: friend.fullName || '',
        handicap: friend.handicap ?? undefined,
        manualStrokes: 0,
        profileId: friend.id,
      };
      setPlayers(updated);
    } else if (players.length < 4) {
      setPlayers([
        ...players,
        {
          id: Date.now().toString(),
          name: friend.fullName || '',
          handicap: friend.handicap ?? undefined,
          manualStrokes: 0,
          profileId: friend.id,
        },
      ]);
    }
    setAddedFriendIds(prev => [...prev, friend.id]);
  };

  const handleSelectGroup = (group: GolfGroup) => {
    setSelectedGroupId(group.id);
    setHouseGameEnabled(true); // reset toggle whenever group changes
    const newPlayers: PlayerData[] = group.members.slice(0, 4).map(member => ({
      id: member.id,
      name: member.name,
      handicap: member.handicap ?? undefined,
      manualStrokes: 0,
      profileId: member.profileId || undefined,
    }));

    while (newPlayers.length < 2) {
      newPlayers.push({
        id: Date.now().toString() + newPlayers.length,
        name: '',
        handicap: undefined,
        manualStrokes: 0,
      });
    }

    setPlayers(newPlayers);
    setAddedFriendIds(group.members.filter(m => m.profileId).map(m => m.profileId!));
    toast.success(`Loaded ${group.name}`);
  };

  const handleUpdatePlayerTee = (playerId: string, teeSetId: string | undefined) => {
    setPlayerTeeIds(prev => {
      const next = new Map(prev);
      if (teeSetId) {
        next.set(playerId, teeSetId);
      } else {
        next.delete(playerId);
      }
      return next;
    });
  };

  // Start round handler
  const handleStartRound = async () => {
    if (!selectedCourse || isCreating) return;
    setIsCreating(true);

    try {
      const holeInfo: HoleInfo[] = selectedCourse.holes.slice(0, holeCount);
      const games: GameConfig[] = [];

      if (skinsEnabled) {
        games.push({
          id: generateId(),
          type: 'skins',
          stakes: Number(skinsStakes) || 2,
          carryover: skinsCarryover,
        });
      }

      if (nassauEnabled) {
        games.push({
          id: generateId(),
          type: 'nassau',
          stakes: Number(nassauStakes) || 5,
          autoPress: nassauAutoPress,
        });
      }

      if (stablefordEnabled) {
        games.push({
          id: generateId(),
          type: 'stableford',
          stakes: 0,
          modifiedStableford: stablefordModified,
        });
      }

      if (bestBallEnabled && players.filter(p => p.name.trim()).length >= 2) {
        const validPlayers = players.filter(p => p.name.trim());
        const teams =
          bestBallTeams.length > 0
            ? bestBallTeams
            : createDefaultTeams(
                validPlayers.map((p, i) => ({ id: p.id, roundId: '', name: p.name, orderIndex: i }))
              );

        games.push({
          id: generateId(),
          type: 'bestball',
          stakes: 0,
          teams,
        });
      }

      if (wolfEnabled && players.filter(p => p.name.trim()).length === 4) {
        games.push({
          id: generateId(),
          type: 'wolf',
          stakes: Number(wolfStakes) || 2,
          carryover: wolfCarryover,
        });
      }

      // House game — add as a single 'house' entry containing all primitives
      if (houseGame && houseGameEnabled && houseGame.activePrimitives.length > 0) {
        const hgConfig = buildConfig(houseGame.activePrimitives);
        games.push({
          id: generateId(),
          type: 'house',
          stakes: hgConfig.settlementConfig.unitValue,
          activePrimitives: houseGame.activePrimitives,
          houseGameId: houseGame.id,
        });
      }

      if (matchPlay && stakes) {
        games.push({
          id: generateId(),
          type: 'match',
          stakes: Number(stakes) || 0,
        });
      }

      // Build player list, appending ghost if active
      const roundPlayers = players
        .filter(p => p.name.trim())
        .map(p => ({
          name: p.name.trim(),
          handicap: p.handicap,
          manualStrokes: p.manualStrokes ?? 0,
          teamId: bestBallTeams.find(t => t.playerIds.includes(p.id))?.id,
          profileId: p.profileId,
          isGhost: false,
          teeSetId: mixedTees ? (playerTeeIds.get(p.id)) : undefined,
        }));

      if (ghostPrimitiveActive && houseGameEnabled) {
        roundPlayers.push({
          name: ghostName.trim() || 'Ghost',
          handicap: ghostHandicap,
          manualStrokes: 0,
          teamId: undefined,
          profileId: undefined,
          isGhost: true,
        });
      }

      const result = await createRound({
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        holes: holeCount,
        holeInfo,
        strokePlay,
        matchPlay,
        stakes: stakes ? Number(stakes) : undefined,
        slope: selectedCourse.slope,
        rating: selectedCourse.rating,
        handicapMode,
        games,
        teeSets: mixedTees ? roundTeeSets : undefined,
        mixedTees,
        players: roundPlayers,
      });

      if (result.round) {
        toast.success(`Round created! Join code: ${result.round.joinCode}`);
        navigate(`/round/${result.round.id}`);
      } else if (result.error) {
        toast.error(result.error.message);
        if (result.error.isAuthError) {
          navigate('/auth');
        }
      } else {
        toast.error('Failed to create round. Please try again.');
      }
    } catch {
      toast.error('Failed to create round. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const steps: Step[] = ['course', 'players', 'format'];
  const currentStepIndex = steps.indexOf(step);
  const stepConfig = {
    course: { title: 'Course Setup', icon: Flag },
    players: { title: 'Add Players', icon: Users },
    format: { title: 'Game Format', icon: Gamepad2 },
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background relative">
      {/* Fixed Header */}
      <header className="flex-shrink-0 relative z-10 px-6 pb-3 pt-safe-content border-b-2 border-foreground">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() =>
              currentStepIndex > 0 ? setStep(steps[currentStepIndex - 1]) : navigate('/')
            }
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>

          <div className="flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Step {currentStepIndex + 1} of {steps.length}
            </p>
            <h1 className="text-[22px] font-black tracking-[-0.04em] leading-tight text-foreground">{stepConfig[step].title}</h1>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-[3px] mt-2">
          {steps.map((s, i) => (
            <motion.div
              key={s}
              className={cn(
                'h-[3px] flex-1 rounded-full',
                i < currentStepIndex ? 'bg-foreground' : i === currentStepIndex ? 'bg-foreground/35' : 'bg-border'
              )}
              initial={i < currentStepIndex ? { scaleX: 0 } : false}
              animate={i < currentStepIndex ? { scaleX: 1 } : {}}
              style={{ transformOrigin: 'left' }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            />
          ))}
        </div>
      </header>

      {/* Scrollable Content */}
      <main
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain relative z-10 px-4 pb-32 bg-background"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <AnimatePresence mode="wait">
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
              onNavigateToFriends={() => navigate('/friends')}
              onNavigateToGroups={() => navigate('/groups')}
              mixedTees={mixedTees || mixedTeesPrimitiveActive}
              roundTeeSets={roundTeeSets}
              playerTeeIds={playerTeeIds}
              onMixedTeesChange={setMixedTees}
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
              {/* House Game active card — only shows if this group has a saved House Game */}
              {houseGame && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 mb-2"
                >
                  <div className={cn(
                    'rounded-2xl border-2 px-4 py-3 flex items-center gap-3 transition-colors',
                    houseGameEnabled
                      ? 'bg-[#0A0A0A] border-[#0A0A0A]'
                      : 'bg-white border-border/40'
                  )}>
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                      houseGameEnabled ? 'bg-[#F0EE3A]' : 'bg-muted'
                    )}>
                      <Sparkles className={cn('w-4 h-4', houseGameEnabled ? 'text-[#0A0A0A]' : 'text-muted-foreground')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-[13px] font-bold truncate', houseGameEnabled ? 'text-white' : 'text-foreground')}>
                        {houseGame.name || 'House Game'}
                      </p>
                      {(() => {
                        const cfg = buildConfig(houseGame.activePrimitives);
                        const lines = summarizeScoringConfig(cfg, 2);
                        return lines.length > 0 ? (
                          <p className={cn('text-[11px] truncate', houseGameEnabled ? 'text-white/50' : 'text-muted-foreground')}>
                            {lines.join(' · ')}
                          </p>
                        ) : null;
                      })()}
                    </div>
                    <button
                      onClick={() => setHouseGameEnabled(v => !v)}
                      className="flex-shrink-0"
                    >
                      {houseGameEnabled
                        ? <ToggleRight className="w-7 h-7 text-[#F0EE3A]" />
                        : <ToggleLeft className="w-7 h-7 text-muted-foreground" />
                      }
                    </button>
                  </div>
                  {houseGameEnabled && (
                    <p className="text-[11px] text-muted-foreground text-center mt-1.5">
                      House Game is active for this round
                    </p>
                  )}
                </motion.div>
              )}

              {/* Ghost Player card — shown when house game has the ghost primitive active */}
              {ghostPrimitiveActive && houseGameEnabled && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3"
                >
                  <div className="bg-white rounded-2xl border-2 border-border/40 px-4 py-3">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">👻</span>
                      <p className="text-[13px] font-bold text-foreground">Ghost Player</p>
                      <p className="text-[11px] text-muted-foreground">Scores net par every hole</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1">Name</p>
                        <input
                          type="text"
                          value={ghostName}
                          onChange={e => setGhostName(e.target.value)}
                          placeholder="Ghost"
                          className="w-full bg-muted rounded-xl px-3 py-2 text-[13px] font-bold text-foreground outline-none"
                        />
                      </div>
                      <div className="w-28">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1">Handicap</p>
                        <input
                          type="number"
                          value={ghostHandicap ?? ''}
                          onChange={e => setGhostHandicap(e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="0"
                          min="0"
                          max="54"
                          className="w-full bg-muted rounded-xl px-3 py-2 text-[13px] font-bold text-foreground outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            <FormatStep
              players={players}
              strokePlay={strokePlay}
              matchPlay={matchPlay}
              stakes={stakes}
              onStrokePlayChange={setStrokePlay}
              onMatchPlayChange={setMatchPlay}
              onStakesChange={setStakes}
              skinsEnabled={skinsEnabled}
              skinsStakes={skinsStakes}
              skinsCarryover={skinsCarryover}
              onSkinsEnabledChange={setSkinsEnabled}
              onSkinsStakesChange={setSkinsStakes}
              onSkinsCarryoverChange={setSkinsCarryover}
              nassauEnabled={nassauEnabled}
              nassauStakes={nassauStakes}
              nassauAutoPress={nassauAutoPress}
              onNassauEnabledChange={setNassauEnabled}
              onNassauStakesChange={setNassauStakes}
              onNassauAutoPressChange={setNassauAutoPress}
              stablefordEnabled={stablefordEnabled}
              stablefordModified={stablefordModified}
              onStablefordEnabledChange={setStablefordEnabled}
              onStablefordModifiedChange={setStablefordModified}
              bestBallEnabled={bestBallEnabled}
              onBestBallEnabledChange={setBestBallEnabled}
              wolfEnabled={wolfEnabled}
              wolfStakes={wolfStakes}
              wolfCarryover={wolfCarryover}
              onWolfEnabledChange={setWolfEnabled}
              onWolfStakesChange={setWolfStakes}
              onWolfCarryoverChange={setWolfCarryover}
            />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom CTA Area */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-[rgba(0,0,0,0.06)] bg-background px-6 py-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {step !== 'format' ? (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setStep(steps[currentStepIndex + 1])}
            disabled={step === 'course' ? !canProceedCourse : !canProceedPlayers}
            animate={{ opacity: (step === 'course' ? !canProceedCourse : !canProceedPlayers) ? 0.4 : 1 }}
            transition={{ duration: 0.2 }}
            className="w-full bg-foreground text-background rounded-2xl h-[52px] font-bold text-[15px] flex items-center justify-center gap-2"
          >
            Next
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleStartRound}
            disabled={(!strokePlay && !matchPlay) || isCreating}
            animate={{ opacity: ((!strokePlay && !matchPlay) || isCreating) ? 0.4 : 1 }}
            transition={{ duration: 0.2 }}
            className="w-full bg-foreground text-background rounded-2xl h-[52px] font-bold text-[15px] flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Round...
              </>
            ) : (
              'Start Round'
            )}
          </motion.button>
        )}
      </div>

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
    </div>
  );
}
