import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { darkTheme, lightTheme, getThemeForTime } from '../styles/theme';
import type { ThemeTokens, ThemeMode } from '../styles/theme';

interface ThemeContextType {
  theme: ThemeTokens;
  mode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getThemeForTime);

  useEffect(() => {
    const interval = setInterval(() => {
      const newMode = getThemeForTime();
      setMode(prev => prev !== newMode ? newMode : prev);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const theme = useMemo(() => mode === 'dark' ? darkTheme : lightTheme, [mode]);

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

  const value = useMemo(() => ({ theme, mode }), [theme, mode]);

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
