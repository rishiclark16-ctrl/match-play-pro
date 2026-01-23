import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';
import { PlayerInput } from '@/components/golf/PlayerInput';
import { QuickAddFriends } from '@/components/friends/QuickAddFriends';
import { GroupSelector } from '@/components/groups/GroupSelector';
import { Friend } from '@/hooks/useFriends';
import { GolfGroup } from '@/hooks/useGroups';
import { cn } from '@/lib/utils';

interface PlayerData {
  id: string;
  name: string;
  handicap?: number;
  manualStrokes?: number;
  profileId?: string;
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
}: PlayersStepProps) {
  const validPlayers = players.filter(p => p.name.trim());

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
              onClick={() => onHandicapModeChange('auto')}
              className={cn(
                'py-3 px-4 rounded-xl font-medium text-sm transition-all border-2',
                handicapMode === 'auto'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border hover:border-primary/50'
              )}
            >
              Use Handicap Index
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => onHandicapModeChange('manual')}
              className={cn(
                'py-3 px-4 rounded-xl font-medium text-sm transition-all border-2',
                handicapMode === 'manual'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border hover:border-primary/50'
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
            onNameChange={name => onUpdatePlayer(player.id, { name })}
            onHandicapChange={handicap => onUpdatePlayer(player.id, { handicap })}
            onManualStrokesChange={manualStrokes => onUpdatePlayer(player.id, { manualStrokes })}
            onRemove={() => onRemovePlayer(player.id)}
            canRemove={players.length > 2}
          />
        ))}
      </AnimatePresence>

      {players.length < 4 && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onAddPlayer}
          className="w-full py-4 px-6 rounded-xl border-2 border-dashed border-primary/30 text-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary-light hover:border-primary/50 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Player ({4 - players.length} remaining)
        </motion.button>
      )}

      {validPlayers.length < 2 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Add at least 2 players to continue
        </p>
      )}

      {/* Strokes Summary for Manual Mode */}
      {handicapMode === 'manual' && validPlayers.length >= 2 && (
        <TechCard variant="highlighted">
          <TechCardContent className="p-4">
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
          </TechCardContent>
        </TechCard>
      )}

      <GroupSelector
        groups={groups}
        onSelectGroup={onSelectGroup}
        onManageGroups={onNavigateToGroups}
      />

      <QuickAddFriends
        friends={friends}
        addedFriendIds={addedFriendIds}
        onAddFriend={onAddFriend}
        onOpenFriends={onNavigateToFriends}
        currentPlayerCount={validPlayers.length}
      />
    </motion.div>
  );
}
