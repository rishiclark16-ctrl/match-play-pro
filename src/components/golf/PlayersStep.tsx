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
import { Switch } from '@/components/ui/switch';
import { ChipGroup, HeroCard, HeroTile } from './setupUi';
import { fdCard } from './setupStyles';

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
      className="pt-2"
    >
      <HeroCard
        eyebrow="Players"
        title="Who's playing?"
        body={validPlayers.length < 2 ? 'Add at least 2 players. Handicaps decide who gets shots.' : 'Handicaps decide who gets shots on which holes.'}
      >
        <div className="grid grid-cols-3 gap-2 mt-4">
          <HeroTile hot value={validPlayers.length} label={validPlayers.length === 1 ? 'Player' : 'Players'} />
          <HeroTile value={maxPlayers} label="Max" />
          <HeroTile value={handicapMode === 'auto' ? 'Index' : 'Manual'} label="Strokes" />
        </div>
      </HeroCard>

      {/* Handicap mode */}
      <div className={cn(fdCard, 'mt-3.5 p-3')}>
        <p className="text-[13px] font-semibold text-muted-foreground mb-2 px-1">Strokes from</p>
        <ChipGroup
          ariaLabel="Handicap mode"
          options={[
            { value: 'auto' as const, label: 'Handicap index' },
            { value: 'manual' as const, label: 'Manual strokes' },
          ]}
          value={handicapMode}
          onChange={onHandicapModeChange}
        />
      </div>

      {/* Mixed Tees Toggle */}
      <div className={cn(fdCard, 'mt-2 mb-3.5 px-4 py-3 min-h-[64px] flex items-center justify-between gap-3')}>
        <div>
          <p className="text-[16px] font-semibold text-foreground">Mixed tees</p>
          <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">Different tees per player, handicaps adjusted</p>
        </div>
        <Switch
          checked={mixedTees}
          onCheckedChange={(v) => { hapticLight(); onMixedTeesChange(v); }}
          aria-label="Mixed tees"
        />
      </div>

      {/* Configure Tees — only for manual courses (no API tee data) */}
      {mixedTees && !hasApiTees && (
        <motion.button
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { hapticLight(); setShowTeesSheet(true); }}
          className={cn(fdCard, 'w-full min-h-[56px] px-4 py-3 flex items-center justify-between mb-3.5')}
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
            <span className="text-[15px] font-semibold text-foreground">
              {roundTeeSets.length === 0 ? 'Configure tees' : `${roundTeeSets.length} tee${roundTeeSets.length !== 1 ? 's' : ''} configured`}
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
          className={cn(fdCard, 'px-4 py-3 mb-3.5')}
        >
          <p className="text-[13px] font-semibold text-muted-foreground mb-2.5">Course tees</p>
          <div className="flex flex-wrap gap-2">
            {roundTeeSets.map(t => {
              const v = getTeeVisual(t.name);
              return (
                <div key={t.id} className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5">
                  <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', v.dot)} />
                  <span className="text-[13px] font-semibold text-foreground">{t.name}</span>
                  <span className="text-[12px] text-muted-foreground tabular-nums">{t.slope}/{t.courseRating}</span>
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
              <div className="flex flex-wrap gap-2 -mt-1 mb-3 px-1">
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
                        'flex items-center gap-1.5 px-3.5 h-10 rounded-full text-[13px] font-semibold transition-colors',
                        selected
                          ? 'bg-primary text-white'
                          : 'bg-muted text-foreground'
                      )}
                    >
                      <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', visual.dot)} />
                      <span>{tee.name}</span>
                      {hasApiTees && (
                        <span className={cn('text-[12px] font-normal tabular-nums', selected ? 'text-[#CFE3D6]' : 'text-muted-foreground')}>
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
          className="w-full min-h-[56px] rounded-[20px] border-2 border-dashed border-border flex items-center justify-center gap-2 mb-2 text-[15px] font-semibold text-foreground"
        >
          {canAdd ? (
            <>
              <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </span>
              Add Player
              <span className="text-muted-foreground font-medium">· {maxPlayers - players.length} left</span>
            </>
          ) : (
            <>
              <Crown className="w-4 h-4 text-primary" />
              Upgrade for more players
              <ProBadge size="sm" variant="default" />
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
          className="w-full min-h-[56px] rounded-[20px] bg-gold-muted flex items-center justify-center gap-2 mb-2 text-[15px] font-semibold text-primary"
        >
          <Crown className="w-4 h-4" />
          <span>Upgrade to Pro for up to 8 players</span>
          <ProBadge size="sm" variant="default" />
        </motion.button>
      )}

      {validPlayers.length < 2 && (
        <p className="text-[13px] text-muted-foreground text-center py-2">
          Add at least 2 players to continue
        </p>
      )}

      {/* Strokes Summary for Manual Mode */}
      {handicapMode === 'manual' && validPlayers.length >= 2 && (
        <div className={cn(fdCard, 'p-4 mb-2')}>
          <p className="text-[13px] font-semibold text-muted-foreground mb-2">Strokes summary</p>
          <div className="space-y-1.5 text-[14px] text-muted-foreground">
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
      <div className="mt-6">
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
