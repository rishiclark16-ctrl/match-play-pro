import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Plus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  profileId?: string; // Link to user profile for friends
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
  
  // Tee selection state
  const [showTeeSelector, setShowTeeSelector] = useState(false);
  const [pendingCourseDetails, setPendingCourseDetails] = useState<GolfCourseDetails | null>(null);
  const [pendingApiCourse, setPendingApiCourse] = useState<GolfCourseResult | null>(null);
  
  // Course step
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseLocation, setCourseLocation] = useState('');
  const [holeCount, setHoleCount] = useState<9 | 18>(18);
  
  // Players step - initialize with empty slots, will be filled from profile
  const [players, setPlayers] = useState<PlayerData[]>([
    { id: '1', name: '', handicap: undefined },
    { id: '2', name: '', handicap: undefined },
  ]);
  const [profileApplied, setProfileApplied] = useState(false);

  // Auto-fill first player from profile
  useEffect(() => {
    if (profile && !profileApplied && profile.full_name) {
      setPlayers(prev => {
        const updated = [...prev];
        // Only fill if first player is empty
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
  
  // Format step
  const [strokePlay, setStrokePlay] = useState(true);
  const [matchPlay, setMatchPlay] = useState(false);
  const [stakes, setStakes] = useState<string>('');
  
  // Betting games
  const [skinsEnabled, setSkinsEnabled] = useState(false);
  const [skinsStakes, setSkinsStakes] = useState('2');
  const [skinsCarryover, setSkinsCarryover] = useState(true);
  const [nassauEnabled, setNassauEnabled] = useState(false);
  const [nassauStakes, setNassauStakes] = useState('5');
  const [nassauAutoPress, setNassauAutoPress] = useState(false);
  
  // Stableford
  const [stablefordEnabled, setStablefordEnabled] = useState(false);
  const [stablefordModified, setStablefordModified] = useState(false);
  
  // Best Ball
  const [bestBallEnabled, setBestBallEnabled] = useState(false);
  const [bestBallTeams, setBestBallTeams] = useState<Team[]>([]);
  
  // Wolf
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
        // Check if course has tee options
        const hasTees = (details.tees?.male?.length || 0) + (details.tees?.female?.length || 0) > 0;
        
        if (hasTees) {
          // Show tee selector
          setPendingCourseDetails(details);
          setPendingApiCourse(apiCourse);
          setShowTeeSelector(true);
        } else {
          // No tees available, use defaults
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
      setPlayers([...players, { id: Date.now().toString(), name: '', handicap: undefined }]);
    }
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const updatePlayer = (id: string, updates: Partial<PlayerData>) => {
    setPlayers(players.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleAddFriend = (friend: Friend) => {
    // Find first empty player slot
    const emptySlotIndex = players.findIndex(p => !p.name.trim());
    
    if (emptySlotIndex !== -1) {
      // Fill existing empty slot
      const updated = [...players];
      updated[emptySlotIndex] = {
        ...updated[emptySlotIndex],
        name: friend.fullName || '',
        handicap: friend.handicap ?? undefined,
        profileId: friend.id,
      };
      setPlayers(updated);
    } else if (players.length < 4) {
      // Add new player
      setPlayers([...players, {
        id: Date.now().toString(),
        name: friend.fullName || '',
        handicap: friend.handicap ?? undefined,
        profileId: friend.id,
      }]);
    }
    
    setAddedFriendIds(prev => [...prev, friend.id]);
  };

  const handleSelectGroup = (group: GolfGroup) => {
    // Replace players with group members
    const newPlayers: PlayerData[] = group.members.slice(0, 4).map((member, index) => ({
      id: member.id,
      name: member.name,
      handicap: member.handicap ?? undefined,
      profileId: member.profileId || undefined,
    }));
    
    // Ensure at least 2 player slots
    while (newPlayers.length < 2) {
      newPlayers.push({ id: Date.now().toString() + newPlayers.length, name: '', handicap: undefined });
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
      
      // Build games array
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
        // Generate teams based on players
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
      
      // Create round in Supabase
      const round = await createRound({
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        holes: holeCount,
        holeInfo,
        strokePlay,
        matchPlay,
        stakes: stakes ? Number(stakes) : undefined,
        slope: selectedCourse.slope,
        rating: selectedCourse.rating,
        games,
        players: players
          .filter(p => p.name.trim())
          .map(p => ({ 
            name: p.name.trim(), 
            handicap: p.handicap,
            teamId: bestBallTeams.find(t => t.playerIds.includes(p.id))?.id
          })),
      });

      if (round) {
        toast.success(`Round created! Join code: ${round.joinCode}`);
        navigate(`/round/${round.id}`);
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
                  <div className="flex items-center justify-center py-8 gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-muted-foreground">Loading course details...</span>
                  </div>
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
                  <div className="card-premium p-4 border-2 border-primary">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-primary" />
                        <div>
                          <span className="font-medium">{selectedCourse.name}</span>
                          {selectedCourse.location && (
                            <p className="text-sm text-muted-foreground">{selectedCourse.location}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Rating & Slope */}
                      {(selectedCourse.rating || selectedCourse.slope) && (
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-sm">
                            {selectedCourse.rating && (
                              <div className="px-2 py-1 rounded bg-primary/10 text-primary font-medium">
                                {selectedCourse.rating.toFixed(1)}
                              </div>
                            )}
                            {selectedCourse.slope && (
                              <div className="px-2 py-1 rounded bg-muted text-muted-foreground font-medium">
                                {selectedCourse.slope}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Rating / Slope
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Par info */}
                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{selectedCourse.holes.length} holes</span>
                      <span>Par {selectedCourse.holes.reduce((sum, h) => sum + h.par, 0)}</span>
                    </div>
                  </div>
                )}

                {/* Hole Count */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Number of Holes
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[9, 18].map((count) => (
                      <motion.button
                        key={count}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setHoleCount(count as 9 | 18)}
                        className={cn(
                          "py-4 rounded-xl font-semibold text-lg transition-all",
                          holeCount === count
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border text-foreground"
                        )}
                      >
                        {count} Holes
                      </motion.button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <Input
                  placeholder="Course name"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="py-6"
                />
                <Input
                  placeholder="Location (optional)"
                  value={courseLocation}
                  onChange={(e) => setCourseLocation(e.target.value)}
                  className="py-6"
                />
                
                <div className="grid grid-cols-2 gap-3">
                  {[9, 18].map((count) => (
                    <motion.button
                      key={count}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setHoleCount(count as 9 | 18)}
                      className={cn(
                        "py-4 rounded-xl font-semibold transition-all",
                        holeCount === count
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border text-foreground"
                      )}
                    >
                      {count} Holes
                    </motion.button>
                  ))}
                </div>

                <div className="flex gap-3">
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
              </div>
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
            <AnimatePresence>
              {players.map((player, index) => (
                <PlayerInput
                  key={player.id}
                  name={player.name}
                  handicap={player.handicap}
                  index={index}
                  onNameChange={(name) => updatePlayer(player.id, { name })}
                  onHandicapChange={(handicap) => updatePlayer(player.id, { handicap })}
                  onRemove={() => removePlayer(player.id)}
                  canRemove={players.length > 2}
                />
              ))}
            </AnimatePresence>

            {players.length < 4 && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={addPlayer}
                className={cn(
                  "w-full py-4 px-6 rounded-xl border-2 border-dashed border-primary/30",
                  "text-primary font-medium flex items-center justify-center gap-2",
                  "hover:bg-primary-light transition-colors"
                )}
              >
                <Plus className="w-5 h-5" />
                Add Player ({4 - players.length} remaining)
              </motion.button>
            )}

            {players.filter(p => p.name.trim()).length < 2 && (
              <p className="text-sm text-muted-foreground text-center">
                Add at least 2 players to continue
              </p>
            )}

            {/* Use a Group */}
            <GroupSelector
              groups={groups}
              onSelectGroup={handleSelectGroup}
              onManageGroups={() => navigate('/groups')}
            />

            {/* Quick Add Friends */}
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
              <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Scoring
              </Label>
              
              {/* Stroke Play */}
              <div className={cn(
                "card-premium p-4 flex items-center justify-between",
                strokePlay && "ring-2 ring-primary/20"
              )}>
                <div className="flex-1">
                  <h4 className="font-medium">Stroke Play</h4>
                  <p className="text-sm text-muted-foreground">Traditional scoring, lowest total wins</p>
                </div>
                <Switch
                  checked={strokePlay}
                  onCheckedChange={setStrokePlay}
                />
              </div>

              {/* Match Play */}
              <div className={cn(
                "card-premium p-4",
                matchPlay && "ring-2 ring-primary/20"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">Match Play</h4>
                    <p className="text-sm text-muted-foreground">Hole-by-hole competition</p>
                  </div>
                  <Switch
                    checked={matchPlay}
                    onCheckedChange={setMatchPlay}
                  />
                </div>
                
                {/* Match Play Stakes */}
                {matchPlay && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-border/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        placeholder="0"
                        value={stakes}
                        onChange={(e) => setStakes(e.target.value)}
                        className="w-20 text-center"
                        min={0}
                      />
                      <span className="text-sm text-muted-foreground">per match</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Side Games Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Side Games
              </Label>
              
              {/* Skins */}
              <div className={cn(
                "card-premium p-4 transition-all",
                skinsEnabled && "ring-2 ring-primary/20"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {skinsEnabled && <Check className="w-4 h-4 text-primary" />}
                      <h4 className="font-medium">Skins</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Win the hole outright to claim</p>
                  </div>
                  <Switch
                    checked={skinsEnabled}
                    onCheckedChange={setSkinsEnabled}
                  />
                </div>
                
                {skinsEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-border/50 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        placeholder="2"
                        value={skinsStakes}
                        onChange={(e) => setSkinsStakes(e.target.value)}
                        className="w-20 text-center"
                        min={1}
                      />
                      <span className="text-sm text-muted-foreground">per hole</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="carryover"
                        checked={skinsCarryover}
                        onCheckedChange={(checked) => setSkinsCarryover(checked === true)}
                      />
                      <label htmlFor="carryover" className="text-sm">
                        Carryovers (ties roll over)
                      </label>
                    </div>
                  </motion.div>
                )}
              </div>
              
              {/* Nassau */}
              <div className={cn(
                "card-premium p-4 transition-all",
                nassauEnabled && "ring-2 ring-primary/20"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {nassauEnabled && <Check className="w-4 h-4 text-primary" />}
                      <h4 className="font-medium">Nassau</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Front 9 + Back 9 + Overall</p>
                  </div>
                  <Switch
                    checked={nassauEnabled}
                    onCheckedChange={setNassauEnabled}
                  />
                </div>
                
                {nassauEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-border/50 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        placeholder="5"
                        value={nassauStakes}
                        onChange={(e) => setNassauStakes(e.target.value)}
                        className="w-20 text-center"
                        min={1}
                      />
                      <span className="text-sm text-muted-foreground">per bet</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="autopress"
                        checked={nassauAutoPress}
                        onCheckedChange={(checked) => setNassauAutoPress(checked === true)}
                      />
                      <label htmlFor="autopress" className="text-sm">
                        Auto-press when 2 down
                      </label>
                    </div>
                  </motion.div>
                )}
              </div>
              
              {/* Stableford */}
              <div className={cn(
                "card-premium p-4 transition-all",
                stablefordEnabled && "ring-2 ring-primary/20"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {stablefordEnabled && <Check className="w-4 h-4 text-primary" />}
                      <h4 className="font-medium">Stableford</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Points-based scoring (higher is better)</p>
                  </div>
                  <Switch
                    checked={stablefordEnabled}
                    onCheckedChange={setStablefordEnabled}
                  />
                </div>
                
                {stablefordEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-border/50 space-y-3"
                  >
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>🦅 Eagle: 4 pts • 🐦 Birdie: 3 pts • Par: 2 pts</p>
                      <p>Bogey: 1 pt • Double+: 0 pts</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="modifiedStableford"
                        checked={stablefordModified}
                        onCheckedChange={(checked) => setStablefordModified(checked === true)}
                      />
                      <label htmlFor="modifiedStableford" className="text-sm">
                        Modified (aggressive scoring with negatives)
                      </label>
                    </div>
                  </motion.div>
                )}
              </div>
              
              {/* Best Ball */}
              {players.filter(p => p.name.trim()).length >= 2 && (
                <div className={cn(
                  "card-premium p-4 transition-all",
                  bestBallEnabled && "ring-2 ring-primary/20"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {bestBallEnabled && <Check className="w-4 h-4 text-primary" />}
                        <h4 className="font-medium">Best Ball</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {players.filter(p => p.name.trim()).length === 4 
                          ? "2v2 team format - best score counts"
                          : "Team format - best score counts"}
                      </p>
                    </div>
                    <Switch
                      checked={bestBallEnabled}
                      onCheckedChange={setBestBallEnabled}
                    />
                  </div>
                  
                  {bestBallEnabled && players.filter(p => p.name.trim()).length === 4 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-border/50 space-y-2"
                    >
                      <p className="text-xs text-muted-foreground mb-2">Teams will be auto-assigned:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-lg bg-success/10 border border-success/20">
                          <p className="text-xs font-medium text-success">Team 1</p>
                          <p className="text-sm truncate">
                            {players.filter(p => p.name.trim())[0]?.name.split(' ')[0]} & {players.filter(p => p.name.trim())[1]?.name.split(' ')[0]}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                          <p className="text-xs font-medium text-primary">Team 2</p>
                          <p className="text-sm truncate">
                            {players.filter(p => p.name.trim())[2]?.name.split(' ')[0]} & {players.filter(p => p.name.trim())[3]?.name.split(' ')[0]}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
              
              {/* Wolf - only for 4 players */}
              {players.filter(p => p.name.trim()).length === 4 && (
                <div className={cn(
                  "card-premium p-4 transition-all",
                  wolfEnabled && "ring-2 ring-warning/30"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {wolfEnabled && <Check className="w-4 h-4 text-warning" />}
                        <h4 className="font-medium">Wolf</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">Rotating captain picks partner or goes alone</p>
                    </div>
                    <Switch
                      checked={wolfEnabled}
                      onCheckedChange={setWolfEnabled}
                    />
                  </div>
                  
                  {wolfEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-border/50 space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">$</span>
                        <Input
                          type="number"
                          placeholder="2"
                          value={wolfStakes}
                          onChange={(e) => setWolfStakes(e.target.value)}
                          className="w-20 text-center"
                          min={1}
                        />
                        <span className="text-sm text-muted-foreground">per point</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="wolfcarryover"
                          checked={wolfCarryover}
                          onCheckedChange={(checked) => setWolfCarryover(checked === true)}
                        />
                        <label htmlFor="wolfcarryover" className="text-sm">
                          Carryovers (pushes roll over)
                        </label>
                      </div>
                      
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                        🐺 Lone Wolf: 3x • ⚡ Blind Wolf: 6x
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        );
    }
  };

  const steps: Step[] = ['course', 'players', 'format'];
  const currentStepIndex = steps.indexOf(step);
  const stepTitles = { course: 'Course Setup', players: 'Add Players', format: 'Game Format' };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="pt-safe px-4 pt-12 pb-4 flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => currentStepIndex > 0 ? setStep(steps[currentStepIndex - 1]) : navigate('/')}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <h1 className="text-xl font-semibold">{stepTitles[step]}</h1>
      </header>

      {/* Progress */}
      <div className="px-4 pb-6">
        <div className="flex gap-2">
          {steps.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= currentStepIndex ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 pb-32 overflow-auto">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </main>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-gradient-to-t from-background via-background to-transparent">
        {step !== 'format' ? (
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => setStep(steps[currentStepIndex + 1])}
              disabled={step === 'course' ? !canProceedCourse : !canProceedPlayers}
              className="w-full py-6 text-lg font-semibold rounded-xl"
            >
              Next
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        ) : (
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleStartRound}
              disabled={(!strokePlay && !matchPlay) || isCreating}
              className="w-full py-6 text-lg font-semibold rounded-xl"
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
