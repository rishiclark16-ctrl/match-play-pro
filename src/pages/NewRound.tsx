import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Flag, Users, Gamepad2 } from 'lucide-react';
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
import { Course, HoleInfo, GameConfig, Team, generateId } from '@/types/golf';
import { createDefaultTeams } from '@/lib/games/bestball';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Step = 'course' | 'players' | 'format';

interface PlayerData {
  id: string;
  name: string;
  handicap?: number;
  manualStrokes?: number;
  profileId?: string;
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

      if (matchPlay && stakes) {
        games.push({
          id: generateId(),
          type: 'match',
          stakes: Number(stakes) || 0,
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
        players: players
          .filter(p => p.name.trim())
          .map(p => ({
            name: p.name.trim(),
            handicap: p.handicap,
            manualStrokes: p.manualStrokes ?? 0,
            teamId: bestBallTeams.find(t => t.playerIds.includes(p.id))?.id,
          })),
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
      {/* Technical Grid Background */}
      <div className="absolute inset-0 tech-grid-subtle opacity-40 pointer-events-none" />

      {/* Fixed Header */}
      <header className="flex-shrink-0 relative z-10 px-4 pt-safe-content pb-4">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() =>
              currentStepIndex > 0 ? setStep(steps[currentStepIndex - 1]) : navigate('/')
            }
            className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>

          <div className="flex-1">
            <h1 className="headline-sm">{stepConfig[step].title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step {currentStepIndex + 1} of {steps.length}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mt-4">
          {steps.map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all',
                i <= currentStepIndex ? 'bg-primary' : 'bg-border'
              )}
            />
          ))}
        </div>
      </header>

      {/* Scrollable Content */}
      <main
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain relative z-10 px-4 pb-32"
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
            />
          )}
          {step === 'format' && (
            <FormatStep
              key="format"
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
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Button */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-background via-background to-transparent"
        style={{ paddingBottom: '1rem' }}
      >
        {step !== 'format' ? (
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => setStep(steps[currentStepIndex + 1])}
              disabled={step === 'course' ? !canProceedCourse : !canProceedPlayers}
              className="w-full py-6 text-lg font-bold rounded-xl"
            >
              Next Step
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        ) : (
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleStartRound}
              disabled={(!strokePlay && !matchPlay) || isCreating}
              className="w-full py-6 text-lg font-bold rounded-xl"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Round...
                </>
              ) : (
                'Start Round'
              )}
            </Button>
          </motion.div>
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
