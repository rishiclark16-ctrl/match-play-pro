import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface UseVoiceNicknamesReturn {
  nicknames: Map<string, string[]>;
  isLoading: boolean;
  addNickname: (playerName: string, nickname: string) => Promise<void>;
  removeNickname: (playerName: string, nickname: string) => Promise<void>;
  getNicknamesForPlayer: (playerName: string) => string[];
  suggestNickname: (failedInput: string, closestPlayerName: string) => void;
}

const STORAGE_KEY = 'match-golf-voice-nicknames';

/**
 * Manages custom voice nicknames that improve voice recognition accuracy.
 * Users can teach the app their preferred names for players.
 * Stores in localStorage for fast access.
 */
export function useVoiceNicknames(): UseVoiceNicknamesReturn {
  const [nicknames, setNicknames] = useState<Map<string, string[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Record<string, string[]> = JSON.parse(stored);
        setNicknames(new Map(Object.entries(parsed)));
      }
    } catch {
      // Ignore parse errors
    }
    setIsLoading(false);
  }, []);

  const persist = useCallback((updated: Map<string, string[]>) => {
    try {
      const obj: Record<string, string[]> = {};
      updated.forEach((value, key) => {
        obj[key] = value;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Storage full or unavailable
    }
  }, []);

  const addNickname = useCallback(async (playerName: string, nickname: string) => {
    const normalizedName = playerName.toLowerCase().trim();
    const normalizedNick = nickname.toLowerCase().trim();

    if (!normalizedName || !normalizedNick) return;

    setNicknames(prev => {
      const updated = new Map(prev);
      const existing = updated.get(normalizedName) || [];
      if (!existing.includes(normalizedNick)) {
        updated.set(normalizedName, [...existing, normalizedNick]);
      }
      persist(updated);
      return updated;
    });

    toast.success(`Saved "${nickname}" as nickname for ${playerName}`, { duration: 2000 });
  }, [persist]);

  const removeNickname = useCallback(async (playerName: string, nickname: string) => {
    const normalizedName = playerName.toLowerCase().trim();
    const normalizedNick = nickname.toLowerCase().trim();

    setNicknames(prev => {
      const updated = new Map(prev);
      const existing = updated.get(normalizedName) || [];
      updated.set(normalizedName, existing.filter(n => n !== normalizedNick));
      if (updated.get(normalizedName)?.length === 0) {
        updated.delete(normalizedName);
      }
      persist(updated);
      return updated;
    });
  }, [persist]);

  const getNicknamesForPlayer = useCallback((playerName: string): string[] => {
    const normalizedName = playerName.toLowerCase().trim();
    return nicknames.get(normalizedName) || [];
  }, [nicknames]);

  const suggestNickname = useCallback((failedInput: string, closestPlayerName: string) => {
    toast(
      `Did you mean ${closestPlayerName}?`,
      {
        description: `Save "${failedInput}" as a nickname?`,
        action: {
          label: 'Save',
          onClick: () => addNickname(closestPlayerName, failedInput),
        },
        duration: 6000,
      }
    );
  }, [addNickname]);

  return {
    nicknames,
    isLoading,
    addNickname,
    removeNickname,
    getNicknamesForPlayer,
    suggestNickname,
  };
}
