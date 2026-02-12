import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getThemeForTime,
  getThemeTokens,
  lightTheme,
  darkTheme,
  sunsetTheme,
} from '../styles/theme';
import type { ThemeTokens } from '../styles/theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Assert that a theme object has every required top-level token group. */
function expectValidTokenStructure(theme: ThemeTokens) {
  // mode
  expect(typeof theme.mode).toBe('string');
  expect(['light', 'dark', 'sunset']).toContain(theme.mode);

  // mapColorScheme
  expect(['LIGHT', 'DARK']).toContain(theme.mapColorScheme);

  // bg
  expect(theme.bg).toBeDefined();
  expect(typeof theme.bg.body).toBe('string');
  expect(typeof theme.bg.surface).toBe('string');
  expect(typeof theme.bg.elevated).toBe('string');
  expect(typeof theme.bg.nav).toBe('string');

  // text
  expect(theme.text).toBeDefined();
  expect(typeof theme.text.primary).toBe('string');
  expect(typeof theme.text.secondary).toBe('string');
  expect(typeof theme.text.tertiary).toBe('string');
  expect(typeof theme.text.onAccent).toBe('string');

  // accent
  expect(theme.accent).toBeDefined();
  expect(typeof theme.accent.amber).toBe('string');
  expect(typeof theme.accent.amberDark).toBe('string');
  expect(typeof theme.accent.amberLight).toBe('string');

  // border
  expect(theme.border).toBeDefined();
  expect(typeof theme.border.subtle).toBe('string');
  expect(typeof theme.border.medium).toBe('string');
  expect(typeof theme.border.strong).toBe('string');

  // status
  expect(theme.status).toBeDefined();
  expect(typeof theme.status.green).toBe('string');
  expect(typeof theme.status.red).toBe('string');
  expect(typeof theme.status.blue).toBe('string');

  // skeleton
  expect(theme.skeleton).toBeDefined();
  expect(typeof theme.skeleton.bg).toBe('string');
  expect(typeof theme.skeleton.shimmer).toBe('string');

  // scrollbar
  expect(theme.scrollbar).toBeDefined();
  expect(typeof theme.scrollbar.track).toBe('string');

  // selection
  expect(theme.selection).toBeDefined();
  expect(typeof theme.selection.bg).toBe('string');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('theme system', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // ========================================================================
  // getThemeForTime
  // ========================================================================
  describe('getThemeForTime', () => {
    it('returns "light" during daytime hours (e.g. noon)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0)); // hour = 12
      expect(getThemeForTime()).toBe('light');
    });

    it('returns "sunset" during sunset hours (e.g. 7 PM)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 5, 15, 19, 0, 0)); // hour = 19
      expect(getThemeForTime()).toBe('sunset');
    });

    it('returns "dark" during late-night hours (e.g. 10 PM)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 5, 15, 22, 0, 0)); // hour = 22
      expect(getThemeForTime()).toBe('dark');
    });

    it('returns "dark" during early-morning hours (e.g. 3 AM)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 5, 15, 3, 0, 0)); // hour = 3
      expect(getThemeForTime()).toBe('dark');
    });

    it('returns "light" at the start of daytime (6 AM)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 5, 15, 6, 0, 0)); // hour = 6
      expect(getThemeForTime()).toBe('light');
    });

    it('returns "sunset" at the start of sunset window (6 PM)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 5, 15, 18, 0, 0)); // hour = 18
      expect(getThemeForTime()).toBe('sunset');
    });
  });

  // ========================================================================
  // getThemeTokens
  // ========================================================================
  describe('getThemeTokens', () => {
    it('returns the light theme for mode "light"', () => {
      const tokens = getThemeTokens('light');
      expect(tokens).toBe(lightTheme);
      expect(tokens.mode).toBe('light');
    });

    it('returns the dark theme for mode "dark"', () => {
      const tokens = getThemeTokens('dark');
      expect(tokens).toBe(darkTheme);
      expect(tokens.mode).toBe('dark');
    });

    it('returns the sunset theme for mode "sunset"', () => {
      const tokens = getThemeTokens('sunset');
      expect(tokens).toBe(sunsetTheme);
      expect(tokens.mode).toBe('sunset');
    });
  });

  // ========================================================================
  // Token structure validation
  // ========================================================================
  describe('theme token structure', () => {
    it('lightTheme has the required token structure', () => {
      expectValidTokenStructure(lightTheme);
    });

    it('darkTheme has the required token structure', () => {
      expectValidTokenStructure(darkTheme);
    });

    it('sunsetTheme has the required token structure', () => {
      expectValidTokenStructure(sunsetTheme);
    });
  });

  // ========================================================================
  // Mode values
  // ========================================================================
  describe('theme mode values', () => {
    it('lightTheme.mode is "light"', () => {
      expect(lightTheme.mode).toBe('light');
    });

    it('darkTheme.mode is "dark"', () => {
      expect(darkTheme.mode).toBe('dark');
    });

    it('sunsetTheme.mode is "sunset"', () => {
      expect(sunsetTheme.mode).toBe('sunset');
    });
  });

  // ========================================================================
  // Map color scheme
  // ========================================================================
  describe('mapColorScheme', () => {
    it('light theme uses LIGHT mapColorScheme', () => {
      expect(lightTheme.mapColorScheme).toBe('LIGHT');
    });

    it('dark theme uses DARK mapColorScheme', () => {
      expect(darkTheme.mapColorScheme).toBe('DARK');
    });

    it('sunset theme uses DARK mapColorScheme', () => {
      expect(sunsetTheme.mapColorScheme).toBe('DARK');
    });
  });
});
