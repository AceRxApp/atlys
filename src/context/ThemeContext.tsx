import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
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
    root.style.setProperty('--bg-body', theme.bg.body);
    root.style.setProperty('--text-primary', theme.text.primary);
    root.style.setProperty('--scrollbar-track', theme.scrollbar.track);
    root.style.setProperty('--scrollbar-thumb', theme.scrollbar.thumb);
    root.style.setProperty('--scrollbar-thumb-hover', theme.scrollbar.thumbHover);
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
