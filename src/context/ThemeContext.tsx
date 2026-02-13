import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { track } from '@vercel/analytics';
import { getThemeForTime, getThemeTokens } from '../styles/theme';
import type { ThemeTokens, ThemeMode, ThemePreference } from '../styles/theme';

interface ThemeContextType {
  theme: ThemeTokens;
  mode: ThemeMode;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreferenceRaw] = useState<ThemePreference>(() => {
    try {
      const saved = localStorage.getItem('nxstops_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'sunset') return saved;
    } catch { /* ignore */ }
    return 'auto';
  });

  const resolveMode = useCallback((): ThemeMode => {
    return themePreference === 'auto' ? getThemeForTime() : themePreference;
  }, [themePreference]);

  const [mode, setMode] = useState<ThemeMode>(resolveMode);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setThemePreferenceRaw(pref);
    track('theme_changed', { preference: pref });
    try {
      if (pref === 'auto') localStorage.removeItem('nxstops_theme');
      else localStorage.setItem('nxstops_theme', pref);
    } catch { /* ignore */ }
  }, []);

  // Re-resolve mode when preference changes or time ticks
  useEffect(() => {
    setMode(resolveMode());
    const interval = setInterval(() => {
      setMode(resolveMode());
    }, 60_000);
    return () => clearInterval(interval);
  }, [resolveMode]);

  const theme = useMemo(() => getThemeTokens(mode), [mode]);

  useEffect(() => {
    const root = document.documentElement;

    // Flatten all theme tokens into CSS custom properties
    const groups: [string, Record<string, string>][] = [
      ['bg', theme.bg],
      ['text', theme.text],
      ['accent', theme.accent],
      ['status', theme.status],
      ['events', theme.events],
      ['community', theme.community],
      ['border', theme.border],
      ['amber-tint', theme.amberTint],
      ['green-tint', theme.greenTint],
      ['red-tint', theme.redTint],
      ['blue-tint', theme.blueTint],
      ['purple-tint', theme.purpleTint],
      ['community-tint', theme.communityTint],
      ['skeleton', theme.skeleton],
      ['scrollbar', theme.scrollbar],
    ];

    for (const [prefix, group] of groups) {
      for (const [key, value] of Object.entries(group)) {
        const kebab = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
        root.style.setProperty(`--${prefix}-${kebab}`, value);
      }
    }

    root.style.setProperty('--selection-bg', theme.selection.bg);
    root.setAttribute('data-theme', mode);
  }, [theme, mode]);

  const value = useMemo(() => ({ theme, mode, themePreference, setThemePreference }), [theme, mode, themePreference, setThemePreference]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
