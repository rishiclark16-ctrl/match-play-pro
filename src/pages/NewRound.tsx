import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Plus, Check, Loader2, Flag, Users, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
import { CourseSearch } from '@/components/golf/CourseSearch';
import { PlayerInput } from '@/components/golf/PlayerInput';
import { TeeSelector } from '@/components/golf/TeeSelector';
import { QuickAddFriends } from '@/components/friends/QuickAddFriends';
import { GroupSelector } from '@/components/groups/GroupSelector';
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
  const { getCourseDetails, convertToHoleInfo, getTeeInfo, isLoadingDetails } = useGolfCourseSearch();
  const { profile } = useProfile();
  const { friends } = useFriends();
  const { groups } = useGroups();
  const [isCreating, setIsCreating] = useState(false);
  const [addedFriendIds, setAddedFriendIds] = useState<string[]>([]);

  const [step, setStep] = useState<Step>('course');
  const [isLoadingApiCourse, setIsLoadingApiCourse] = useState(false);

  const [showTeeSelector, setShowTeeSelector] = useState(false);
  const [pendingCourseDetails, setPendingCourseDetails] = useState<GolfCourseDetails | null>(null);
  const [pendingApiCourse, setPendingApiCourse] = useState<GolfCourseResult | null>(null);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseLocation, setCourseLocation] = useState('');
  const [holeCount, setHoleCount] = useState<9 | 18>(18);

  const [players, setPlayers] = useState<PlayerData[]>([
    { id: '1', name: '', handicap: undefined, manualStrokes: 0 },
    { id: '2', name: '', handicap: undefined, manualStrokes: 0 },
  ]);
  const [handicapMode, setHandicapMode] = useState<'auto' | 'manual'>('auto');
  const [profileApplied, setProfileApplied] = useState(false);

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

  const [strokePlay, setStrokePlay] = useState(true);
  const [matchPlay, setMatchPlay] = useState(false);
  const [stakes, setStakes] = useState<string>('');

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

  const canProceedCourse = selectedCourse || (showCourseForm && courseName.trim());
  const canProceedPlayers = players.filter(p => p.name.trim()).length >= 2;

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
    } catch (err) {
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
    const location = [details.location?.city, details.location?.state]
      .filter(Boolean)
      .join(', ');

    const courseName = details.course_name || apiCourse.course_name;
    const displayName = teeName ? `${courseName} (${teeName})` : courseName;

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

  const addPlayer = () => {
    if (players.length < 4) {
      setPlayers([...players, { id: Date.now().toString(), name: '', handicap: undefined, manualStrokes: 0 }]);
    }
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const updatePlayer = (id: string, updates: Partial<PlayerData>) => {
    setPlayers(players.map(p => p.id === id ? { ...p, ...updates } : p));
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
      setPlayers([...players, {
        id: Date.now().toString(),
        name: friend.fullName || '',
        handicap: friend.handicap ?? undefined,
        manualStrokes: 0,
        profileId: friend.id,
      }]);
    }

    setAddedFriendIds(prev => [...prev, friend.id]);
  };

  const handleSelectGroup = (group: GolfGroup) => {
    const newPlayers: PlayerData[] = group.members.slice(0, 4).map((member, index) => ({
      id: member.id,
      name: member.name,
      handicap: member.handicap ?? undefined,
      manualStrokes: 0,
      profileId: member.profileId || undefined,
    }));

    while (newPlayers.length < 2) {
      newPlayers.push({ id: Date.now().toString() + newPlayers.length, name: '', handicap: undefined, manualStrokes: 0 });
    }

    setPlayers(newPlayers);
    setAddedFriendIds(group.members.filter(m => m.profileId).map(m => m.profileId!));
    toast.success(`Loaded ${group.name}`);
  };

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
        const teams = bestBallTeams.length > 0 ? bestBallTeams : createDefaultTeams(
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
            teamId: bestBallTeams.find(t => t.playerIds.includes(p.id))?.id
          })),
      });

      if (result.round) {
        toast.success(`Round created! Join code: ${result.round.joinCode}`);
        navigate(`/round/${result.round.id}`);
      } else if (result.error) {
        console.error('Round creation error:', result.error);
        toast.error(result.error.message);

        // Redirect to auth if session expired
        if (result.error.isAuthError) {
          navigate('/auth');
        }
      } else {
        toast.error('Failed to create round. Please try again.');
      }
    } catch (err) {
      console.error('Error creating round:', err);
      toast.error('Failed to create round. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'course':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {!showCourseForm ? (
              <>
                {isLoadingApiCourse && (
                  <TechCard>
                    <TechCardContent className="py-8 flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-muted-foreground font-medium">Loading course details...</span>
                    </TechCardContent>
                  </TechCard>
                )}

                {!isLoadingApiCourse && (
                  <CourseSearch
                    courses={courses}
                    onSelectCourse={handleSelectCourse}
                    onCreateNew={() => setShowCourseForm(true)}
                    onSelectApiCourse={handleSelectApiCourse}
                  />
                )}

                {selectedCourse && (
                  <TechCard variant="highlighted" corners>
                    <TechCardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                            <Check className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold">{selectedCourse.name}</p>
                            {selectedCourse.location && (
                              <p className="text-sm text-muted-foreground">{selectedCourse.location}</p>
                            )}
                          </div>
                        </div>

                        {(selectedCourse.rating || selectedCourse.slope) && (
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              {selectedCourse.rating && (
                                <span className="px-2 py-1 bg-primary/10 text-primary text-sm font-mono font-semibold rounded">
                                  {selectedCourse.rating.toFixed(1)}
                                </span>
                              )}
                              {selectedCourse.slope && (
                                <span className="px-2 py-1 bg-muted text-muted-foreground text-sm font-mono font-semibold rounded">
                                  {selectedCourse.slope}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">Rating / Slope</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-medium">{selectedCourse.holes.length} holes</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span className="font-medium">Par {selectedCourse.holes.reduce((sum, h) => sum + h.par, 0)}</span>
                      </div>
                    </TechCardContent>
                  </TechCard>
                )}

                {/* Hole Count */}
                <div className="space-y-3">
                  <p className="label-sm">Number of Holes</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[9, 18].map((count) => (
                      <motion.button
                        key={count}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setHoleCount(count as 9 | 18)}
                        className={cn(
                          "py-4 rounded-xl font-bold text-lg transition-all border-2",
                          holeCount === count
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {count} Holes
                      </motion.button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <TechCard>
                <TechCardContent className="p-5 space-y-4">
                  <p className="font-semibold text-lg">Add New Course</p>

                  <Input
                    placeholder="Course name"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className="py-6 text-base"
                  />
                  <Input
                    placeholder="Location (optional)"
                    value={courseLocation}
                    onChange={(e) => setCourseLocation(e.target.value)}
                    className="py-6 text-base"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    {[9, 18].map((count) => (
                      <motion.button
                        key={count}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setHoleCount(count as 9 | 18)}
                        className={cn(
                          "py-3 rounded-xl font-semibold transition-all border-2",
                          holeCount === count
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border"
                        )}
                      >
                        {count} Holes
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCourseForm(false)}
                      className="flex-1 py-6"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateCourse}
                      disabled={!courseName.trim()}
                      className="flex-1 py-6"
                    >
                      Save Course
                    </Button>
                  </div>
                </TechCardContent>
              </TechCard>
            )}
          </motion.div>
        );

      case 'players':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Handicap Mode Toggle */}
            <TechCard>
              <TechCardContent className="p-4">
                <p className="text-sm font-semibold text-muted-foreground mb-3">Handicap Mode</p>
                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setHandicapMode('auto')}
                    className={cn(
                      "py-3 px-4 rounded-xl font-medium text-sm transition-all border-2",
                      handicapMode === 'auto'
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:border-primary/50"
                    )}
                  >
                    Use Handicap Index
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setHandicapMode('manual')}
                    className={cn(
                      "py-3 px-4 rounded-xl font-medium text-sm transition-all border-2",
                      handicapMode === 'manual'
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:border-primary/50"
                    )}
                  >
                    Manual Strokes
                  </motion.button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {handicapMode === 'auto'
                    ? 'Strokes calculated automatically from handicap indexes and course slope.'
                    : 'Manually enter the strokes each player receives.'}
                </p>
              </TechCardContent>
            </TechCard>

            <AnimatePresence>
              {players.map((player, index) => (
                <PlayerInput
                  key={player.id}
                  name={player.name}
                  handicap={player.handicap}
                  manualStrokes={player.manualStrokes}
                  index={index}
                  handicapMode={handicapMode}
                  onNameChange={(name) => updatePlayer(player.id, { name })}
                  onHandicapChange={(handicap) => updatePlayer(player.id, { handicap })}
                  onManualStrokesChange={(manualStrokes) => updatePlayer(player.id, { manualStrokes })}
                  onRemove={() => removePlayer(player.id)}
                  canRemove={players.length > 2}
                />
              ))}
            </AnimatePresence>

            {players.length < 4 && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={addPlayer}
                className="w-full py-4 px-6 rounded-xl border-2 border-dashed border-primary/30 text-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary-light hover:border-primary/50 transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Player ({4 - players.length} remaining)
              </motion.button>
            )}

            {players.filter(p => p.name.trim()).length < 2 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Add at least 2 players to continue
              </p>
            )}

            {/* Strokes Summary for Manual Mode */}
            {handicapMode === 'manual' && players.filter(p => p.name.trim()).length >= 2 && (
              <TechCard variant="highlighted">
                <TechCardContent className="p-4">
                  <p className="text-sm font-semibold mb-2">Strokes Summary</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {(() => {
                      const validPlayers = players.filter(p => p.name.trim());
                      const minStrokes = Math.min(...validPlayers.map(p => p.manualStrokes ?? 0));
                      return validPlayers.map((p, i) => {
                        const strokes = (p.manualStrokes ?? 0) - minStrokes;
                        const receiver = validPlayers.find(vp => vp.manualStrokes === minStrokes);
                        if (strokes === 0) {
                          return <p key={p.id}><span className="font-medium text-foreground">{p.name || `Player ${i + 1}`}</span> gives strokes</p>;
                        }
                        return <p key={p.id}><span className="font-medium text-foreground">{p.name || `Player ${i + 1}`}</span> gets {strokes} stroke{strokes !== 1 ? 's' : ''}</p>;
                      });
                    })()}
                  </div>
                </TechCardContent>
              </TechCard>
            )}

            <GroupSelector
              groups={groups}
              onSelectGroup={handleSelectGroup}
              onManageGroups={() => navigate('/groups')}
            />

            <QuickAddFriends
              friends={friends}
              addedFriendIds={addedFriendIds}
              onAddFriend={handleAddFriend}
              onOpenFriends={() => navigate('/friends')}
              currentPlayerCount={players.filter(p => p.name.trim()).length}
            />
          </motion.div>
        );

      case 'format':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Scoring Section */}
            <div className="space-y-3">
              <p className="label-sm">Scoring Format</p>

              {/* Stroke Play */}
              <TechCard variant={strokePlay ? "highlighted" : "default"}>
                <TechCardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold">Stroke Play</p>
                    <p className="text-sm text-muted-foreground">Traditional scoring, lowest total wins</p>
                  </div>
                  <Switch checked={strokePlay} onCheckedChange={setStrokePlay} />
                </TechCardContent>
              </TechCard>

              {/* Match Play */}
              <TechCard variant={matchPlay ? "highlighted" : "default"}>
                <TechCardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">Match Play</p>
                      <p className="text-sm text-muted-foreground">Hole-by-hole competition</p>
                    </div>
                    <Switch checked={matchPlay} onCheckedChange={setMatchPlay} />
                  </div>

                  {matchPlay && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">$</span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={stakes}
                          onChange={(e) => setStakes(e.target.value)}
                          className="w-24 text-center font-mono"
                          min={0}
                        />
                        <span className="text-sm text-muted-foreground">per match</span>
                      </div>
                    </motion.div>
                  )}
                </TechCardContent>
              </TechCard>
            </div>

            {/* Side Games */}
            <div className="space-y-3">
              <p className="label-sm">Side Games</p>

              {/* Skins */}
              <TechCard variant={skinsEnabled ? "highlighted" : "default"}>
                <TechCardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {skinsEnabled && <Check className="w-4 h-4 text-primary" />}
                      <div>
                        <p className="font-semibold">Skins</p>
                        <p className="text-sm text-muted-foreground">Win the hole outright to claim</p>
                      </div>
                    </div>
                    <Switch checked={skinsEnabled} onCheckedChange={setSkinsEnabled} />
                  </div>

                  {skinsEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 pt-3 border-t border-border space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">$</span>
                        <Input
                          type="number"
                          placeholder="2"
                          value={skinsStakes}
                          onChange={(e) => setSkinsStakes(e.target.value)}
                          className="w-24 text-center font-mono"
                          min={1}
                        />
                        <span className="text-sm text-muted-foreground">per hole</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="carryover"
                          checked={skinsCarryover}
                          onCheckedChange={(checked) => setSkinsCarryover(checked === true)}
                        />
                        <label htmlFor="carryover" className="text-sm font-medium">
                          Carryovers (ties roll over)
                        </label>
                      </div>
                    </motion.div>
                  )}
                </TechCardContent>
              </TechCard>

              {/* Nassau */}
              <TechCard variant={nassauEnabled ? "highlighted" : "default"}>
                <TechCardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {nassauEnabled && <Check className="w-4 h-4 text-primary" />}
                      <div>
                        <p className="font-semibold">Nassau</p>
                        <p className="text-sm text-muted-foreground">Front 9 + Back 9 + Overall</p>
                      </div>
                    </div>
                    <Switch checked={nassauEnabled} onCheckedChange={setNassauEnabled} />
                  </div>

                  {nassauEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 pt-3 border-t border-border space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">$</span>
                        <Input
                          type="number"
                          placeholder="5"
                          value={nassauStakes}
                          onChange={(e) => setNassauStakes(e.target.value)}
                          className="w-24 text-center font-mono"
                          min={1}
                        />
                        <span className="text-sm text-muted-foreground">per bet</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="autopress"
                          checked={nassauAutoPress}
                          onCheckedChange={(checked) => setNassauAutoPress(checked === true)}
                        />
                        <label htmlFor="autopress" className="text-sm font-medium">
                          Auto-press when 2 down
                        </label>
                      </div>
                    </motion.div>
                  )}
                </TechCardContent>
              </TechCard>

              {/* Stableford */}
              <TechCard variant={stablefordEnabled ? "highlighted" : "default"}>
                <TechCardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {stablefordEnabled && <Check className="w-4 h-4 text-primary" />}
                      <div>
                        <p className="font-semibold">Stableford</p>
                        <p className="text-sm text-muted-foreground">Points-based scoring</p>
                      </div>
                    </div>
                    <Switch checked={stablefordEnabled} onCheckedChange={setStablefordEnabled} />
                  </div>

                  {stablefordEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 pt-3 border-t border-border space-y-3"
                    >
                      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg font-mono">
                        🦅 Eagle: 4 • 🐦 Birdie: 3 • Par: 2 • Bogey: 1 • 2+: 0
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="modifiedStableford"
                          checked={stablefordModified}
                          onCheckedChange={(checked) => setStablefordModified(checked === true)}
                        />
                        <label htmlFor="modifiedStableford" className="text-sm font-medium">
                          Modified (aggressive with negatives)
                        </label>
                      </div>
                    </motion.div>
                  )}
                </TechCardContent>
              </TechCard>

              {/* Best Ball */}
              {players.filter(p => p.name.trim()).length >= 2 && (
                <TechCard variant={bestBallEnabled ? "highlighted" : "default"}>
                  <TechCardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {bestBallEnabled && <Check className="w-4 h-4 text-primary" />}
                        <div>
                          <p className="font-semibold">Best Ball</p>
                          <p className="text-sm text-muted-foreground">
                            {players.filter(p => p.name.trim()).length === 4
                              ? "2v2 team format"
                              : "Team format - best score counts"}
                          </p>
                        </div>
                      </div>
                      <Switch checked={bestBallEnabled} onCheckedChange={setBestBallEnabled} />
                    </div>

                    {bestBallEnabled && players.filter(p => p.name.trim()).length === 4 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 pt-3 border-t border-border"
                      >
                        <p className="text-xs text-muted-foreground mb-2">Teams auto-assigned:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                            <p className="text-[10px] font-semibold text-success uppercase tracking-wide">Team 1</p>
                            <p className="text-sm font-medium truncate">
                              {players.filter(p => p.name.trim())[0]?.name.split(' ')[0]} & {players.filter(p => p.name.trim())[1]?.name.split(' ')[0]}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                            <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">Team 2</p>
                            <p className="text-sm font-medium truncate">
                              {players.filter(p => p.name.trim())[2]?.name.split(' ')[0]} & {players.filter(p => p.name.trim())[3]?.name.split(' ')[0]}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </TechCardContent>
                </TechCard>
              )}

              {/* Wolf */}
              {players.filter(p => p.name.trim()).length === 4 && (
                <TechCard variant={wolfEnabled ? "highlighted" : "default"}>
                  <TechCardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {wolfEnabled && <Check className="w-4 h-4 text-warning" />}
                        <div>
                          <p className="font-semibold">Wolf</p>
                          <p className="text-sm text-muted-foreground">Rotating captain picks partner</p>
                        </div>
                      </div>
                      <Switch checked={wolfEnabled} onCheckedChange={setWolfEnabled} />
                    </div>

                    {wolfEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 pt-3 border-t border-border space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground">$</span>
                          <Input
                            type="number"
                            placeholder="2"
                            value={wolfStakes}
                            onChange={(e) => setWolfStakes(e.target.value)}
                            className="w-24 text-center font-mono"
                            min={1}
                          />
                          <span className="text-sm text-muted-foreground">per point</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="wolfcarryover"
                            checked={wolfCarryover}
                            onCheckedChange={(checked) => setWolfCarryover(checked === true)}
                          />
                          <label htmlFor="wolfcarryover" className="text-sm font-medium">
                            Carryovers (pushes roll over)
                          </label>
                        </div>

                        <div className="text-xs text-muted-foreground bg-warning/10 p-3 rounded-lg border border-warning/20 font-mono">
                          🐺 Lone Wolf: 3x • ⚡ Blind Wolf: 6x
                        </div>
                      </motion.div>
                    )}
                  </TechCardContent>
                </TechCard>
              )}
            </div>
          </motion.div>
        );
    }
  };

  const steps: Step[] = ['course', 'players', 'format'];
  const currentStepIndex = steps.indexOf(step);
  const stepConfig = {
    course: { title: 'Course Setup', icon: Flag },
    players: { title: 'Add Players', icon: Users },
    format: { title: 'Game Format', icon: Gamepad2 }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background relative">
      {/* Technical Grid Background */}
      <div className="absolute inset-0 tech-grid-subtle opacity-40 pointer-events-none" />

      {/* Fixed Header */}
      <header
        className="flex-shrink-0 relative z-10 px-4 pt-3 pb-4"
      >
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => currentStepIndex > 0 ? setStep(steps[currentStepIndex - 1]) : navigate('/')}
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
                "h-1.5 flex-1 rounded-full transition-all",
                i <= currentStepIndex
                  ? "bg-primary"
                  : "bg-border"
              )}
            />
          ))}
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain relative z-10 px-4 pb-32" style={{ WebkitOverflowScrolling: 'touch' }}>
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </main>

      {/* Bottom Button */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-background via-background to-transparent"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
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
