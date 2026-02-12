import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

// ---------------------------------------------------------------------------
// localStorage mock helpers
// ---------------------------------------------------------------------------

let localStorageStore: Record<string, string> = {};

beforeEach(() => {
  localStorageStore = {};

  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
    (key: string) => localStorageStore[key] ?? null,
  );

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
    (key: string, value: string) => {
      localStorageStore[key] = value;
    },
  );

  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(
    (key: string) => {
      delete localStorageStore[key];
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Wrapper helper
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ThemeContext', () => {
  // ========================================================================
  // useTheme outside provider
  // ========================================================================
  describe('useTheme without provider', () => {
    it('throws an error when used outside of ThemeProvider', () => {
      // Suppress expected error output in the test console
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      spy.mockRestore();
    });
  });

  // ========================================================================
  // ThemeProvider renders children
  // ========================================================================
  describe('ThemeProvider rendering', () => {
    it('renders its children', () => {
      const { getByText } = render(
        <ThemeProvider>
          <span>Hello NxStops</span>
        </ThemeProvider>,
      );
      expect(getByText('Hello NxStops')).toBeInTheDocument();
    });
  });

  // ========================================================================
  // ThemeProvider exposes context values
  // ========================================================================
  describe('ThemeProvider context values', () => {
    it('exposes theme, mode, themePreference, and setThemePreference', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBeDefined();
      expect(result.current.mode).toBeDefined();
      expect(result.current.themePreference).toBeDefined();
      expect(typeof result.current.setThemePreference).toBe('function');
    });

    it('theme has the expected token structure (bg, text, accent, border)', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      const { theme } = result.current;

      expect(theme.bg).toBeDefined();
      expect(typeof theme.bg.body).toBe('string');
      expect(theme.text).toBeDefined();
      expect(typeof theme.text.primary).toBe('string');
      expect(theme.accent).toBeDefined();
      expect(typeof theme.accent.amber).toBe('string');
      expect(theme.border).toBeDefined();
      expect(typeof theme.border.subtle).toBe('string');
    });
  });

  // ========================================================================
  // setThemePreference('dark')
  // ========================================================================
  describe('setThemePreference("dark")', () => {
    it('updates the mode to dark and saves to localStorage', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemePreference('dark');
      });

      expect(result.current.themePreference).toBe('dark');
      expect(result.current.mode).toBe('dark');
      expect(localStorageStore['nxstops_theme']).toBe('dark');
    });
  });

  // ========================================================================
  // setThemePreference('auto')
  // ========================================================================
  describe('setThemePreference("auto")', () => {
    it('removes the theme key from localStorage', () => {
      // Start with a saved preference
      localStorageStore['nxstops_theme'] = 'dark';

      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemePreference('auto');
      });

      expect(result.current.themePreference).toBe('auto');
      expect(localStorageStore).not.toHaveProperty('nxstops_theme');
    });
  });

  // ========================================================================
  // Default preference
  // ========================================================================
  describe('default preference', () => {
    it('defaults to "auto" when localStorage has no saved value', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.themePreference).toBe('auto');
    });

    it('picks up a saved preference from localStorage on mount', () => {
      localStorageStore['nxstops_theme'] = 'sunset';

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.themePreference).toBe('sunset');
      expect(result.current.mode).toBe('sunset');
    });
  });

  // ========================================================================
  // Switching between modes
  // ========================================================================
  describe('switching between modes', () => {
    it('can switch from light to dark and back', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemePreference('light');
      });
      expect(result.current.mode).toBe('light');
      expect(result.current.theme.mode).toBe('light');

      act(() => {
        result.current.setThemePreference('dark');
      });
      expect(result.current.mode).toBe('dark');
      expect(result.current.theme.mode).toBe('dark');
    });
  });
});
