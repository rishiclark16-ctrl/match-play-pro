import { toast } from 'sonner';
import type { Friend } from './useFriends';
import type { GolfGroup } from './useGroups';

interface PlayerData {
  id: string;
  name: string;
  handicap?: number;
  manualStrokes?: number;
  profileId?: string;
  isGhost?: boolean;
  teeSetId?: string;
}

type Dispatch<T> = (value: T | ((prev: T) => T)) => void;

interface UsePlayerRosterArgs {
  players: PlayerData[];
  setPlayers: (players: PlayerData[]) => void;
  setAddedFriendIds: Dispatch<string[]>;
  /** Setters touched by `handleSelectGroup` only — colocated here since the
   *  group-load flow conceptually belongs to the player roster. */
  groupHooks: {
    setSelectedGroupId: (id: string) => void;
    setHouseGameEnabled: (b: boolean) => void;
  };
}

export interface UsePlayerRosterReturn {
  /** Adds an empty slot when there are fewer than 4 players. */
  addPlayer: () => void;
  /** Removes the player with the given id. */
  removePlayer: (id: string) => void;
  /** Patches a single player by id. */
  updatePlayer: (id: string, updates: Partial<PlayerData>) => void;
  /** Adds a friend into the first empty slot, or appends a new slot if room. */
  handleAddFriend: (friend: Friend) => void;
  /** Loads a saved golf group's members into the roster. Resets house-game toggle. */
  handleSelectGroup: (group: GolfGroup) => void;
}

/**
 * Encapsulates player-roster CRUD for the New Round flow:
 *  - add / remove / update slot
 *  - add a friend into the first empty slot
 *  - load a golf group (replaces roster, resets group-id and house-game toggle)
 *
 * Out of scope: per-player tee assignment (lives in `useMixedTees`).
 */
export function usePlayerRoster({
  players,
  setPlayers,
  setAddedFriendIds,
  groupHooks,
}: UsePlayerRosterArgs): UsePlayerRosterReturn {
  const addPlayer = () => {
    if (players.length < 4) {
      setPlayers([
        ...players,
        { id: Date.now().toString(), name: '', handicap: undefined, manualStrokes: 0 },
      ]);
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
    groupHooks.setSelectedGroupId(group.id);
    groupHooks.setHouseGameEnabled(true); // reset toggle whenever group changes
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

  return { addPlayer, removePlayer, updatePlayer, handleAddFriend, handleSelectGroup };
}
