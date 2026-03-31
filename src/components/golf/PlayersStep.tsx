import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Crown, ChevronRight } from 'lucide-react';
import { PlayerInput } from '@/components/golf/PlayerInput';
import { QuickAddFriends } from '@/components/friends/QuickAddFriends';
import { GroupSelector } from '@/components/groups/GroupSelector';
import { Friend } from '@/hooks/useFriends';
import { GolfGroup } from '@/hooks/useGroups';
import { useSubscription, TIER_LIMITS } from '@/hooks/useSubscription';
import { PaywallModal, ProBadge } from '@/components/subscription';
import { TeeSet } from '@/types/golf';
import { MixedTeesSheet, getTeeVisual } from '@/components/golf/MixedTeesSheet';
import { GolfCourseDetails } from '@/hooks/useGolfCourseSearch';
import { hapticLight } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface PlayerData {
  id: string;
  name: string;
  handicap?: number;
  manualStrokes?: number;
  profileId?: string;
  teeSetId?: string;
}

interface PlayersStepProps {
  players: PlayerData[];
  handicapMode: 'auto' | 'manual';
  friends: Friend[];
  groups: GolfGroup[];
  addedFriendIds: string[];
  onAddPlayer: () => void;
  onRemovePlayer: (id: string) => void;
  onUpdatePlayer: (id: string, updates: Partial<PlayerData>) => void;
  onHandicapModeChange: (mode: 'auto' | 'manual') => void;
  onAddFriend: (friend: Friend) => void;
  onSelectGroup: (group: GolfGroup) => void;
  onNavigateToFriends: () => void;
  onNavigateToGroups: () => void;
  mixedTees: boolean;
  roundTeeSets: TeeSet[];
  playerTeeIds: Map<string, string>;
  courseApiDetails?: GolfCourseDetails | null;
  onMixedTeesChange: (v: boolean) => void;
  onUpdateTeeSets: (teeSets: TeeSet[]) => void;
  onUpdatePlayerTee: (playerId: string, teeSetId: string | undefined) => void;
}

export function PlayersStep({
  players,
  handicapMode,
  friends,
  groups,
  addedFriendIds,
  onAddPlayer,
  onRemovePlayer,
  onUpdatePlayer,
  onHandicapModeChange,
  onAddFriend,
  onSelectGroup,
  onNavigateToFriends,
  onNavigateToGroups,
  mixedTees,
  roundTeeSets,
  playerTeeIds,
  courseApiDetails,
  onMixedTeesChange,
  onUpdateTeeSets,
  onUpdatePlayerTee,
}: PlayersStepProps) {
  // When API course details are available, use actual course tees
  const hasApiTees = !!(courseApiDetails && ((courseApiDetails.tees?.male?.length ?? 0) + (courseApiDetails.tees?.female?.length ?? 0) > 0));

  const validPlayers = players.filter(p => p.name.trim());

  // Subscription gating for player limits
  const { isPro, canAddPlayer, limits } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showTeesSheet, setShowTeesSheet] = useState(false);

  const maxPlayers = limits.maxPlayers;
  const canAdd = canAddPlayer(players.length);
  const atFreeLimit = !isPro && players.length >= TIER_LIMITS.free.maxPlayers;

  const handleAddPlayer = () => {
    if (canAdd) {
      onAddPlayer();
    } else {
      setShowPaywall(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="pt-4"
    >
      {/* Handicap Mode Toggle */}
      <div className="bg-muted rounded-xl p-1 flex gap-1 mb-5">
        {(['auto', 'manual'] as const).map((mode) => (
          <motion.button
            key={mode}
            whileTap={{ scale: 0.98 }}
            onClick={() => onHandicapModeChange(mode)}
            className={cn(
              'flex-1 text-center text-sm py-2.5 rounded-lg font-medium transition-all',
              handicapMode === mode
                ? 'bg-foreground text-background font-bold'
                : 'text-muted-foreground'
            )}
          >
            {mode === 'auto' ? 'Use Handicap Index' : 'Manual Strokes'}
          </motion.button>
        ))}
      </div>

      {/* Mixed Tees Toggle */}
      <div className="bg-white rounded-2xl border border-border/40 px-4 py-3 mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-bold text-foreground">Mixed Tees</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Different tees per player with adjusted handicaps</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { hapticLight(); onMixedTeesChange(!mixedTees); }}
          className={cn(
            'w-12 h-7 rounded-full transition-colors flex-shrink-0',
            mixedTees ? 'bg-foreground' : 'bg-muted'
          )}
        >
          <motion.div
            animate={{ x: mixedTees ? 20 : 2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="w-5 h-5 rounded-full bg-white shadow-sm mt-1"
          />
        </motion.button>
      </div>

      {/* Configure Tees — only for manual courses (no API tee data) */}
      {mixedTees && !hasApiTees && (
        <motion.button
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { hapticLight(); setShowTeesSheet(true); }}
          className="w-full bg-white border border-border/40 rounded-2xl px-4 py-3 flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {roundTeeSets.length > 0
                ? roundTeeSets.slice(0, 3).map(t => {
                    const v = getTeeVisual(t.name);
                    return <div key={t.id} className={cn('w-3 h-3 rounded-full', v.dot)} />;
                  })
                : <div className="w-3 h-3 rounded-full bg-muted" />
              }
            </div>
            <span className="text-[13px] font-bold text-foreground">
              {roundTeeSets.length === 0 ? 'Configure Tees' : `${roundTeeSets.length} tee${roundTeeSets.length !== 1 ? 's' : ''} configured`}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </motion.button>
      )}

      {/* API course: show tee legend with all available tees */}
      {mixedTees && hasApiTees && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-border/40 rounded-2xl px-4 py-3 mb-4"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2.5">Course Tees</p>
          <div className="flex flex-wrap gap-2">
            {roundTeeSets.map(t => {
              const v = getTeeVisual(t.name);
              return (
                <div key={t.id} className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-2.5 py-1.5">
                  <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', v.dot)} />
                  <span className="text-[11px] font-bold text-foreground">{t.name}</span>
                  <span className="text-[10px] text-muted-foreground">{t.slope}/{t.courseRating}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {players.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
          >
            <PlayerInput
              name={player.name}
              handicap={player.handicap}
              manualStrokes={player.manualStrokes}
              index={index}
              handicapMode={handicapMode}
              onNameChange={name => onUpdatePlayer(player.id, { name })}
              onHandicapChange={handicap => onUpdatePlayer(player.id, { handicap })}
              onManualStrokesChange={manualStrokes => onUpdatePlayer(player.id, { manualStrokes })}
              onRemove={() => onRemovePlayer(player.id)}
              canRemove={players.length > 2}
            />
            {/* Per-player tee selector */}
            {mixedTees && roundTeeSets.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1.5 mb-3 pl-1">
                {roundTeeSets.map(tee => {
                  const selected = playerTeeIds.get(player.id) === tee.id;
                  const visual = getTeeVisual(tee.name);
                  return (
                    <motion.button
                      key={tee.id}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => {
                        hapticLight();
                        onUpdatePlayerTee(player.id, selected ? undefined : tee.id);
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold border transition-all',
                        selected
                          ? 'bg-[#0A0A0A] border-[#0A0A0A] text-white'
                          : 'bg-white border-border/60 text-foreground'
                      )}
                    >
                      <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', visual.dot)} />
                      <span>{tee.name}</span>
                      {hasApiTees && (
                        <span className={cn('text-[10px] font-normal', selected ? 'text-white/60' : 'text-muted-foreground')}>
                          {tee.slope}/{tee.courseRating}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add Player Button */}
      {players.length < maxPlayers && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleAddPlayer}
          className={cn(
            'border-2 border-dashed rounded-2xl py-4 w-full flex items-center justify-center gap-2 mb-2 text-sm font-semibold',
            canAdd
              ? 'border-border text-muted-foreground'
              : 'border-[#F0EE3A]/40 text-[#A08800]'
          )}
        >
          {canAdd ? (
            <>
              <Plus className="w-4 h-4" />
              Add Player ({maxPlayers - players.length} remaining)
            </>
          ) : (
            <>
              <Crown className="w-4 h-4" />
              Upgrade for more players
            </>
          )}
        </motion.button>
      )}

      {/* At free limit - show upgrade prompt */}
      {atFreeLimit && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowPaywall(true)}
          className="border-2 border-dashed border-[#F0EE3A]/40 rounded-2xl py-4 w-full flex items-center justify-center gap-2 mb-2 text-sm font-semibold text-[#A08800]"
        >
          <Crown className="w-4 h-4" />
          <span>Upgrade to Pro for up to 8 players</span>
          <ProBadge size="sm" variant="default" />
        </motion.button>
      )}

      {validPlayers.length < 2 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Add at least 2 players to continue
        </p>
      )}

      {/* Strokes Summary for Manual Mode */}
      {handicapMode === 'manual' && validPlayers.length >= 2 && (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-4 mb-2">
          <p className="text-sm font-semibold mb-2">Strokes Summary</p>
          <div className="space-y-1 text-sm text-muted-foreground">
            {(() => {
              const minStrokes = Math.min(...validPlayers.map(p => p.manualStrokes ?? 0));
              return validPlayers.map((p, i) => {
                const strokes = (p.manualStrokes ?? 0) - minStrokes;
                if (strokes === 0) {
                  return (
                    <p key={p.id}>
                      <span className="font-medium text-foreground">
                        {p.name || `Player ${i + 1}`}
                      </span>{' '}
                      gives strokes
                    </p>
                  );
                }
                return (
                  <p key={p.id}>
                    <span className="font-medium text-foreground">
                      {p.name || `Player ${i + 1}`}
                    </span>{' '}
                    gets {strokes} stroke{strokes !== 1 ? 's' : ''}
                  </p>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Group Selector */}
      <div className="mt-5">
        <GroupSelector
          groups={groups}
          onSelectGroup={onSelectGroup}
          onManageGroups={onNavigateToGroups}
        />
      </div>

      <QuickAddFriends
        friends={friends}
        addedFriendIds={addedFriendIds}
        onAddFriend={(friend) => {
          if (canAddPlayer(validPlayers.length)) {
            onAddFriend(friend);
          } else {
            setShowPaywall(true);
          }
        }}
        onOpenFriends={onNavigateToFriends}
        currentPlayerCount={validPlayers.length}
        maxPlayers={maxPlayers}
      />

      {/* Paywall Modal */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="More Players"
      />

      {/* Mixed Tees Sheet */}
      <MixedTeesSheet
        isOpen={showTeesSheet}
        onClose={() => setShowTeesSheet(false)}
        teeSets={roundTeeSets}
        onUpdateTeeSets={onUpdateTeeSets}
      />
    </motion.div>
  );
}
