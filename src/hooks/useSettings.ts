import { useState, useEffect, useCallback } from 'react';

export interface AppSettings {
  useNetScoring: boolean; // Default true - use net scores for winner determination
}

const SETTINGS_KEY = 'match-golf-settings';

const DEFAULT_SETTINGS: AppSettings = {
  useNetScoring: true,
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
      console.error('Error loading settings:', err);
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
        console.error('Error saving settings:', err);
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
