import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Plus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CourseSearch } from '@/components/golf/CourseSearch';
import { PlayerInput } from '@/components/golf/PlayerInput';
import { useRounds } from '@/hooks/useRounds';
import { useCourses } from '@/hooks/useCourses';
import { useGolfCourseSearch, GolfCourseResult } from '@/hooks/useGolfCourseSearch';
import { Course, HoleInfo } from '@/types/golf';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Step = 'course' | 'players' | 'format';

interface PlayerData {
  id: string;
  name: string;
  handicap?: number;
}

export default function NewRound() {
  const navigate = useNavigate();
  const { createRound, addPlayerToRound } = useRounds();
  const { courses, createCourse, getDefaultHoles } = useCourses();
  const { getCourseDetails, convertToHoleInfo, isLoadingDetails } = useGolfCourseSearch();

  const [step, setStep] = useState<Step>('course');
  const [isLoadingApiCourse, setIsLoadingApiCourse] = useState(false);
  
  // Course step
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseLocation, setCourseLocation] = useState('');
  const [holeCount, setHoleCount] = useState<9 | 18>(18);
  
  // Players step
  const [players, setPlayers] = useState<PlayerData[]>([
    { id: '1', name: '', handicap: undefined },
    { id: '2', name: '', handicap: undefined },
  ]);
  
  // Format step
  const [strokePlay, setStrokePlay] = useState(true);
  const [matchPlay, setMatchPlay] = useState(false);
  const [stakes, setStakes] = useState<string>('');

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
        const holes = convertToHoleInfo(details);
        const location = [details.location?.city, details.location?.state]
          .filter(Boolean)
          .join(', ');
        
        // Create and save course locally
        const course = createCourse(
          details.course_name,
          location || undefined,
          holes,
          details.tees?.male?.[0]?.slope_rating,
          details.tees?.male?.[0]?.course_rating
        );
        
        setSelectedCourse(course);
        setHoleCount(holes.length === 9 ? 9 : 18);
        toast.success(`Loaded ${details.course_name} with real par data!`);
      }
    } catch (err) {
      toast.error('Failed to load course details');
    } finally {
      setIsLoadingApiCourse(false);
    }
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

  const handleStartRound = () => {
    if (!selectedCourse) return;

    const holeInfo: HoleInfo[] = selectedCourse.holes.slice(0, holeCount);
    
    const round = createRound(
      selectedCourse.id,
      selectedCourse.name,
      holeCount,
      holeInfo,
      strokePlay,
      matchPlay,
      stakes ? Number(stakes) : undefined
    );

    players
      .filter(p => p.name.trim())
      .forEach(p => addPlayerToRound(round.id, p.name.trim(), p.handicap));

    navigate(`/round/${round.id}`);
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
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-primary" />
                      <span className="font-medium">{selectedCourse.name}</span>
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
          </motion.div>
        );

      case 'format':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
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
              "card-premium p-4 flex items-center justify-between",
              matchPlay && "ring-2 ring-primary/20"
            )}>
              <div className="flex-1">
                <h4 className="font-medium">Match Play</h4>
                <p className="text-sm text-muted-foreground">Hole-by-hole competition</p>
              </div>
              <Switch
                checked={matchPlay}
                onCheckedChange={setMatchPlay}
              />
            </div>

            {/* Stakes */}
            <div className="card-premium p-4 space-y-3">
              <Label htmlFor="stakes" className="font-medium">Stakes (optional)</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="stakes"
                  type="number"
                  placeholder="0"
                  value={stakes}
                  onChange={(e) => setStakes(e.target.value)}
                  className="pl-8 py-6"
                  min={0}
                />
              </div>
              <p className="text-xs text-muted-foreground">Amount per player</p>
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
      <header className="pt-12 pb-4 px-6 safe-top flex items-center gap-4">
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
      <div className="px-6 pb-6">
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
      <main className="flex-1 px-6 pb-32 overflow-auto">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </main>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent safe-bottom">
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
              disabled={!strokePlay && !matchPlay}
              className="w-full py-6 text-lg font-semibold rounded-xl"
            >
              Start Round
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
