'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PublicWebsiteSettings, DEFAULT_WEBSITE_SETTINGS } from '@/types/settings';

interface SettingsContextType {
  settings: PublicWebsiteSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_WEBSITE_SETTINGS,
  loading: false,
  refreshSettings: async () => {},
});

export function SettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: PublicWebsiteSettings;
}) {
  const [settings, setSettings] = useState<PublicWebsiteSettings>(
    initialSettings || DEFAULT_WEBSITE_SETTINGS
  );
  const [loading, setLoading] = useState<boolean>(!initialSettings);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.warn('[SettingsProvider] Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
