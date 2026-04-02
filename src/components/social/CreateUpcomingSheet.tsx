import { useState, useEffect, useCallback } from 'react';
import { X, Calendar, MapPin, Users, Plus, Search, Loader2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useFriends } from '@/hooks/useFriends';
import { useGolfCourseSearch, GolfCourseResult, GolfCourseDetails } from '@/hooks/useGolfCourseSearch';
import { generateJoinCode } from '@/types/golf';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface CreateUpcomingSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateUpcomingSheet({ open, onClose, onCreated }: CreateUpcomingSheetProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { friends } = useFriends();
  const { searchCourses, getCourseDetails, convertToHoleInfo, searchResults, isSearching, isLoadingDetails, clearResults } = useGolfCourseSearch();

  const [courseQuery, setCourseQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<{ name: string; id?: number; details?: GolfCourseDetails } | null>(null);
  const [teeTime, setTeeTime] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Debounced course search
  useEffect(() => {
    if (selectedCourse) return; // Don't search when a course is already selected
    const timer = setTimeout(() => {
      if (courseQuery.trim().length >= 2) {
        searchCourses(courseQuery);
      } else {
        clearResults();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [courseQuery, selectedCourse, searchCourses, clearResults]);

  const handleSelectApiCourse = useCallback(async (course: GolfCourseResult) => {
    hapticLight();
    const displayName = course.course_name || course.club_name;
    setSelectedCourse({ name: displayName, id: course.id });
    setCourseQuery(displayName);
    clearResults();

    // Fetch full course details (tees, hole info) in background
    const details = await getCourseDetails(course.id);
    if (details) {
      setSelectedCourse(prev => prev ? { ...prev, details } : null);
    }
  }, [getCourseDetails, clearResults]);

  const handleClearCourse = () => {
    setSelectedCourse(null);
    setCourseQuery('');
    clearResults();
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreate = async () => {
    if (!user || !selectedCourse || !teeTime) return;
    setSubmitting(true);

    try {
      const joinCode = generateJoinCode();

      // Build hole_info from course details or default to 18 par-4 holes
      let holeInfo;
      if (selectedCourse.details) {
        holeInfo = convertToHoleInfo(selectedCourse.details);
      } else {
        holeInfo = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4 }));
      }

      // Get rating/slope from course details if available
      const firstTee = selectedCourse.details?.tees?.male?.[0] || selectedCourse.details?.tees?.female?.[0];

      // Create the round with only columns that exist in the schema
      const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .insert({
          course_name: selectedCourse.name,
          course_id: selectedCourse.id?.toString() ?? null,
          created_by: user.id,
          status: 'pending',
          holes: 18,
          join_code: joinCode,
          hole_info: holeInfo,
          games: [],
          rating: firstTee?.course_rating ?? null,
          slope: firstTee?.slope_rating ?? null,
        })
        .select('id')
        .single();

      if (roundError) throw roundError;

      // Add creator as a player (order_index is required NOT NULL)
      const playerInserts: Array<{
        round_id: string;
        profile_id: string;
        name: string;
        handicap: number | null;
        order_index: number;
      }> = [
        {
          round_id: roundData.id,
          profile_id: user.id,
          name: profile?.full_name ?? 'You',
          handicap: profile?.handicap ?? null,
          order_index: 0,
        },
      ];

      // Add invited friends as players too so they show up in the round
      if (selectedFriends.length > 0) {
        const { data: friendProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, handicap')
          .in('id', selectedFriends);

        if (friendProfiles) {
          friendProfiles.forEach((fp, i) => {
            playerInserts.push({
              round_id: roundData.id,
              profile_id: fp.id,
              name: fp.full_name ?? 'Invited',
              handicap: fp.handicap ?? null,
              order_index: i + 1,
            });
          });
        }
      }

      const { error: playerError } = await supabase.from('players').insert(playerInserts);
      if (playerError) throw playerError;

      hapticSuccess();

      // Reset form
      setSelectedCourse(null);
      setCourseQuery('');
      setTeeTime('');
      setSelectedFriends([]);
      onCreated();
      onClose();
    } catch (err: any) {
      console.error('CreateUpcomingSheet error:', err?.message ?? err, err?.details, err?.hint);
      hapticError();
    } finally {
      setSubmitting(false);
    }
  };

  // Generate min datetime (now) for the picker
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const minDateTime = now.toISOString().slice(0, 16);

  const showResults = !selectedCourse && courseQuery.trim().length >= 2;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        className="[&>button]:hidden rounded-t-3xl p-0 max-h-[90vh] overflow-y-auto bg-[#F8F8F6]"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-foreground/15 rounded-full" />
        </div>

        {/* Dark hero header */}
        <div className="bg-[#0A0A0A] mx-4 mt-2 rounded-2xl p-5 relative overflow-hidden">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-white/70" />
          </motion.button>

          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40 mb-1">New</p>
          <h2 className="text-[20px] font-black tracking-[-0.03em] text-white leading-tight pr-10">
            Schedule a Round
          </h2>
          <p className="text-[11px] text-white/40 font-medium mt-1">
            Set up a round and invite friends
          </p>
        </div>

        {/* Form */}
        <div className="px-4 pt-5 pb-6 space-y-5">
          {/* Course search */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2 block">
              Course
            </label>
            <div className="relative">
              {selectedCourse ? (
                <div className="flex items-center bg-white rounded-xl px-4 py-3 border border-emerald-200">
                  <MapPin className="h-4 w-4 text-emerald-600 flex-shrink-0 mr-2" />
                  <span className="text-[14px] font-semibold text-foreground flex-1 truncate">
                    {selectedCourse.name}
                  </span>
                  {isLoadingDetails && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground mr-2" />
                  )}
                  <button onClick={handleClearCourse} className="p-1">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={courseQuery}
                    onChange={e => setCourseQuery(e.target.value)}
                    placeholder="Search golf courses..."
                    className="w-full bg-white rounded-xl px-4 pl-9 py-3 text-[14px] outline-none border border-border/40 placeholder:text-muted-foreground/50 font-medium"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </>
              )}
            </div>

            {/* Search results dropdown */}
            <AnimatePresence>
              {showResults && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-2 bg-white rounded-xl border border-border/40 overflow-hidden max-h-[200px] overflow-y-auto"
                >
                  {searchResults.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => handleSelectApiCourse(course)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
                    >
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-foreground truncate">
                          {course.course_name || course.club_name}
                        </p>
                        {course.location && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {[course.location.city, course.location.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {showResults && searchResults.length === 0 && !isSearching && (
              <p className="text-[12px] text-muted-foreground mt-2 text-center py-2">
                No courses found
              </p>
            )}
          </div>

          {/* Tee time */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2 block">
              Tee Time
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="datetime-local"
                value={teeTime}
                onChange={e => setTeeTime(e.target.value)}
                min={minDateTime}
                className="w-full bg-white rounded-xl px-4 pl-9 py-3 text-[14px] outline-none border border-border/40 text-foreground font-medium"
              />
            </div>
          </div>

          {/* Invite friends */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Invite Friends
              </label>
              {selectedFriends.length > 0 && (
                <span className="text-[11px] font-bold text-emerald-600">
                  {selectedFriends.length} selected
                </span>
              )}
            </div>

            {friends.length === 0 ? (
              <div className="bg-white rounded-xl border border-border/40 p-4 text-center">
                <Users className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-[12px] text-muted-foreground">
                  Add friends first to invite them
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-border/40 divide-y divide-border/30 max-h-[200px] overflow-y-auto">
                {friends.map(friend => {
                  const selected = selectedFriends.includes(friend.id);
                  return (
                    <button
                      key={friend.id}
                      onClick={() => toggleFriend(friend.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 transition-colors',
                        selected ? 'bg-emerald-500/5' : 'hover:bg-muted/30'
                      )}
                    >
                      <Avatar className="w-8 h-8 rounded-lg flex-shrink-0">
                        <AvatarImage src={friend.avatarUrl || undefined} />
                        <AvatarFallback className="rounded-lg text-[10px] font-bold bg-muted">
                          {(friend.fullName ?? '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[13px] font-semibold text-foreground flex-1 text-left truncate">
                        {friend.fullName || 'Unknown'}
                      </span>
                      <div className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0',
                        selected
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-border/60'
                      )}>
                        {selected && <Plus className="w-3 h-3 text-white rotate-45" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create button */}
          <div className="pt-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleCreate}
              disabled={!selectedCourse || !teeTime || submitting}
              className="w-full bg-emerald-600 text-white rounded-2xl py-4 font-bold text-[15px] disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Calendar className="w-4.5 h-4.5" />
              {submitting ? 'Scheduling...' : 'Schedule Round'}
            </motion.button>
          </div>
        </div>

        {/* Bottom safe area spacer — Capacitor safe-area-inset is 0, use hardcoded 34px */}
        <div className="h-[34px]" />
      </SheetContent>
    </Sheet>
  );
}
