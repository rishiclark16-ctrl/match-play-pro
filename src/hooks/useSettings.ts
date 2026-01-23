import { useState, useEffect, useCallback } from 'react';

export interface AppSettings {
  useNetScoring: boolean; // Default true - use net scores for winner determination
  continuousVoice: boolean; // Default true - keep listening after successful entry
  alwaysConfirmVoice: boolean; // Default false - show confirmation even for high confidence
}

const SETTINGS_KEY = 'match-golf-settings';

const DEFAULT_SETTINGS: AppSettings = {
  useNetScoring: true,
  continuousVoice: true,
  alwaysConfirmVoice: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (err) {
      // Settings load error
    }
    setLoaded(true);
  }, []);

  // Save settings to localStorage
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      } catch (err) {
        // Settings save error
      }
      return newSettings;
    });
  }, []);

  return {
    settings,
    loaded,
    updateSettings,
  };
}
