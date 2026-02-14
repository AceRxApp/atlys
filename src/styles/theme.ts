export type ThemeMode = 'dark' | 'light' | 'sunset';
export type ThemePreference = 'auto' | ThemeMode;

export interface ThemeTokens {
  mode: ThemeMode;
  mapColorScheme: 'DARK' | 'LIGHT';

  bg: {
    body: string;
    bodyGradient: string;
    surface: string;
    surfaceAlpha: string;
    elevated: string;
    nav: string;
    toast: string;
    input: string;
    modalOverlay: string;
    modalOverlayDeep: string;
    subtle: string;
    subtleMedium: string;
    subtleStrong: string;
    subtleButton: string;
    imageOverlay: string;
    photoButton: string;
    photoCounter: string;
  };

  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    muted: string;
    disabled: string;
    body: string;
    light: string;
    onAccent: string;
  };

  accent: {
    amber: string;
    amberDark: string;
    amberLight: string;
    amberGradient: string;
    amberTextGradient: string;
  };

  status: {
    green: string;
    red: string;
    blue: string;
  };

  events: {
    text: string;
    active: string;
    gradientStart: string;
    gradientEnd: string;
  };

  community: {
    text: string;
  };

  border: {
    subtle: string;
    medium: string;
    strong: string;
    dashed: string;
    nav: string;
  };

  amberTint: {
    bg06: string;
    bg10: string;
    bg15: string;
    border15: string;
    border20: string;
    border30: string;
    border40: string;
    shadow: string;
  };

  greenTint: {
    bg: string;
    bgStrong: string;
    border: string;
    borderStrong: string;
  };

  redTint: {
    bg: string;
    border: string;
    borderStrong: string;
  };

  blueTint: {
    bg: string;
    border: string;
  };

  purpleTint: {
    bg08: string;
    bg12: string;
    bg15: string;
    bg20: string;
    border15: string;
    border20: string;
    border30: string;
  };

  communityTint: {
    bg: string;
    bg12: string;
    border: string;
    border40: string;
  };

  skeleton: {
    bg: string;
    shimmer: string;
  };

  scrollbar: {
    track: string;
    thumb: string;
    thumbHover: string;
  };

  selection: {
    bg: string;
  };
}

const sharedTokens = {
  accent: {
    amber: '#F59E0B',
    amberDark: '#D97706',
    amberLight: '#FBBF24',
    amberGradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
    amberTextGradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
  },
  status: {
    green: '#34D399',
    red: '#F87171',
    blue: '#93C5FD',
  },
  events: {
    text: '#C084FC',
    active: '#A855F7',
    gradientStart: '#8B5CF6',
    gradientEnd: '#7C3AED',
  },
  community: {
    text: '#D4A574',
  },
  selection: {
    bg: 'rgba(245,158,11,0.3)',
  },
};

export const darkTheme: ThemeTokens = {
  mode: 'dark',
  mapColorScheme: 'DARK',
  bg: {
    body: '#0C0A09',
    bodyGradient: 'linear-gradient(180deg, #0C0A09 0%, #1C1917 100%)',
    surface: '#1C1917',
    surfaceAlpha: 'rgba(28, 25, 23, 0.8)',
    elevated: '#292524',
    nav: 'rgba(12,10,9,0.95)',
    toast: 'rgba(28,25,23,0.95)',
    input: '#0C0A09',
    modalOverlay: 'rgba(0,0,0,0.85)',
    modalOverlayDeep: 'rgba(0,0,0,0.9)',
    subtle: 'rgba(255,255,255,0.03)',
    subtleMedium: 'rgba(255,255,255,0.05)',
    subtleStrong: 'rgba(255,255,255,0.06)',
    subtleButton: 'rgba(255,255,255,0.08)',
    imageOverlay: 'rgba(12,10,9,0.9)',
    photoButton: 'rgba(0,0,0,0.5)',
    photoCounter: 'rgba(0,0,0,0.4)',
  },
  text: {
    primary: '#FFFBEB',
    secondary: '#A8A29E',
    tertiary: '#78716C',
    muted: '#57534E',
    disabled: '#3a3632',
    body: '#d4d0cc',
    light: '#D6D3D1',
    onAccent: '#0C0A09',
  },
  ...sharedTokens,
  border: {
    subtle: 'rgba(255,255,255,0.06)',
    medium: 'rgba(255,255,255,0.08)',
    strong: 'rgba(255,255,255,0.1)',
    dashed: 'rgba(255,255,255,0.15)',
    nav: 'rgba(255,255,255,0.06)',
  },
  amberTint: {
    bg06: 'rgba(245,158,11,0.06)',
    bg10: 'rgba(245,158,11,0.1)',
    bg15: 'rgba(245,158,11,0.15)',
    border15: 'rgba(245,158,11,0.15)',
    border20: 'rgba(245,158,11,0.2)',
    border30: 'rgba(245,158,11,0.3)',
    border40: 'rgba(245,158,11,0.4)',
    shadow: 'rgba(245,158,11,0.3)',
  },
  greenTint: {
    bg: 'rgba(34,197,94,0.08)',
    bgStrong: 'rgba(34,197,94,0.15)',
    border: 'rgba(34,197,94,0.15)',
    borderStrong: 'rgba(34,197,94,0.2)',
  },
  redTint: {
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.15)',
    borderStrong: 'rgba(239,68,68,0.2)',
  },
  blueTint: {
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.12)',
  },
  purpleTint: {
    bg08: 'rgba(168,85,247,0.08)',
    bg12: 'rgba(168,85,247,0.12)',
    bg15: 'rgba(168,85,247,0.15)',
    bg20: 'rgba(168,85,247,0.2)',
    border15: 'rgba(168,85,247,0.15)',
    border20: 'rgba(139,92,246,0.2)',
    border30: 'rgba(168,85,247,0.3)',
  },
  communityTint: {
    bg: 'rgba(212,165,116,0.08)',
    bg12: 'rgba(212,165,116,0.12)',
    border: 'rgba(212,165,116,0.15)',
    border40: 'rgba(212,165,116,0.4)',
  },
  skeleton: {
    bg: 'rgba(255,255,255,0.03)',
    shimmer: 'rgba(255,255,255,0.06)',
  },
  scrollbar: {
    track: '#1C1917',
    thumb: '#78716C',
    thumbHover: '#A8A29E',
  },
};

export const lightTheme: ThemeTokens = {
  mode: 'light',
  mapColorScheme: 'LIGHT',
  bg: {
    body: '#F0EBE5',
    bodyGradient: 'linear-gradient(180deg, #F0EBE5 0%, #EBE6E0 100%)',
    surface: '#F7F3EE',
    surfaceAlpha: 'rgba(247, 243, 238, 0.88)',
    elevated: '#EBE6E0',
    nav: 'rgba(240,235,229,0.95)',
    toast: 'rgba(240,235,229,0.95)',
    input: '#F7F3EE',
    modalOverlay: 'rgba(0,0,0,0.4)',
    modalOverlayDeep: 'rgba(0,0,0,0.5)',
    subtle: 'rgba(0,0,0,0.03)',
    subtleMedium: 'rgba(0,0,0,0.05)',
    subtleStrong: 'rgba(0,0,0,0.07)',
    subtleButton: 'rgba(0,0,0,0.08)',
    imageOverlay: 'rgba(240,235,229,0.88)',
    photoButton: 'rgba(0,0,0,0.3)',
    photoCounter: 'rgba(0,0,0,0.3)',
  },
  text: {
    primary: '#1C1917',
    secondary: '#57534E',
    tertiary: '#78716C',
    muted: '#A8A29E',
    disabled: '#D6D3D1',
    body: '#44403C',
    light: '#78716C',
    onAccent: '#0C0A09',
  },
  ...sharedTokens,
  border: {
    subtle: 'rgba(0,0,0,0.07)',
    medium: 'rgba(0,0,0,0.10)',
    strong: 'rgba(0,0,0,0.14)',
    dashed: 'rgba(0,0,0,0.14)',
    nav: 'rgba(0,0,0,0.09)',
  },
  amberTint: {
    bg06: 'rgba(245,158,11,0.06)',
    bg10: 'rgba(245,158,11,0.08)',
    bg15: 'rgba(245,158,11,0.12)',
    border15: 'rgba(245,158,11,0.2)',
    border20: 'rgba(245,158,11,0.25)',
    border30: 'rgba(245,158,11,0.35)',
    border40: 'rgba(245,158,11,0.45)',
    shadow: 'rgba(245,158,11,0.15)',
  },
  greenTint: {
    bg: 'rgba(34,197,94,0.08)',
    bgStrong: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.2)',
    borderStrong: 'rgba(34,197,94,0.3)',
  },
  redTint: {
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.2)',
    borderStrong: 'rgba(239,68,68,0.25)',
  },
  blueTint: {
    bg: 'rgba(59,130,246,0.06)',
    border: 'rgba(59,130,246,0.15)',
  },
  purpleTint: {
    bg08: 'rgba(168,85,247,0.06)',
    bg12: 'rgba(168,85,247,0.1)',
    bg15: 'rgba(168,85,247,0.12)',
    bg20: 'rgba(168,85,247,0.15)',
    border15: 'rgba(168,85,247,0.15)',
    border20: 'rgba(139,92,246,0.2)',
    border30: 'rgba(168,85,247,0.25)',
  },
  communityTint: {
    bg: 'rgba(212,165,116,0.06)',
    bg12: 'rgba(212,165,116,0.1)',
    border: 'rgba(212,165,116,0.2)',
    border40: 'rgba(212,165,116,0.4)',
  },
  skeleton: {
    bg: 'rgba(0,0,0,0.05)',
    shimmer: 'rgba(0,0,0,0.09)',
  },
  scrollbar: {
    track: '#EBE6E0',
    thumb: '#C7C2BB',
    thumbHover: '#A8A29E',
  },
};

export const sunsetTheme: ThemeTokens = {
  mode: 'sunset',
  mapColorScheme: 'DARK',
  // Deep twilight purple sky → warm plum horizon
  bg: {
    body: '#1C1028',
    bodyGradient: 'linear-gradient(180deg, #1C1028 0%, #281530 100%)',
    surface: '#271535',
    surfaceAlpha: 'rgba(39, 21, 53, 0.85)',
    elevated: '#321D40',
    nav: 'rgba(28, 16, 40, 0.95)',
    toast: 'rgba(39, 21, 53, 0.95)',
    input: '#1C1028',
    modalOverlay: 'rgba(10, 5, 18, 0.85)',
    modalOverlayDeep: 'rgba(10, 5, 18, 0.9)',
    subtle: 'rgba(255, 160, 130, 0.04)',
    subtleMedium: 'rgba(255, 160, 130, 0.06)',
    subtleStrong: 'rgba(255, 160, 130, 0.08)',
    subtleButton: 'rgba(255, 160, 130, 0.1)',
    imageOverlay: 'rgba(28, 16, 40, 0.9)',
    photoButton: 'rgba(10, 5, 18, 0.5)',
    photoCounter: 'rgba(10, 5, 18, 0.4)',
  },
  // Warm peach-cream text like sun-kissed clouds
  text: {
    primary: '#FFF0E6',
    secondary: '#CCA0AA',
    tertiary: '#8E6E82',
    muted: '#6B5068',
    disabled: '#4A3848',
    body: '#E4C0C0',
    light: '#CCA0AA',
    onAccent: '#1C1028',
  },
  // Sunset orange-to-coral accent (the sun itself)
  accent: {
    amber: '#F27035',
    amberDark: '#E04820',
    amberLight: '#FF9058',
    amberGradient: 'linear-gradient(135deg, #FF8C42, #E85D5D)',
    amberTextGradient: 'linear-gradient(135deg, #FF9058, #F27035)',
  },
  status: {
    green: '#34D399',
    red: '#F87171',
    blue: '#93C5FD',
  },
  // Lavender sky tones
  events: {
    text: '#D0A0F0',
    active: '#BB85E0',
    gradientStart: '#A875D0',
    gradientEnd: '#9060C0',
  },
  community: {
    text: '#E8B098',
  },
  selection: {
    bg: 'rgba(242, 112, 53, 0.35)',
  },
  // Warm coral-peach glow borders
  border: {
    subtle: 'rgba(255, 160, 130, 0.08)',
    medium: 'rgba(255, 160, 130, 0.1)',
    strong: 'rgba(255, 160, 130, 0.14)',
    dashed: 'rgba(255, 160, 130, 0.18)',
    nav: 'rgba(255, 160, 130, 0.08)',
  },
  // Sunset orange tints
  amberTint: {
    bg06: 'rgba(242, 112, 53, 0.08)',
    bg10: 'rgba(242, 112, 53, 0.12)',
    bg15: 'rgba(242, 112, 53, 0.18)',
    border15: 'rgba(242, 112, 53, 0.18)',
    border20: 'rgba(242, 112, 53, 0.24)',
    border30: 'rgba(242, 112, 53, 0.34)',
    border40: 'rgba(242, 112, 53, 0.44)',
    shadow: 'rgba(242, 112, 53, 0.35)',
  },
  greenTint: {
    bg: 'rgba(34, 197, 94, 0.1)',
    bgStrong: 'rgba(34, 197, 94, 0.16)',
    border: 'rgba(34, 197, 94, 0.16)',
    borderStrong: 'rgba(34, 197, 94, 0.22)',
  },
  redTint: {
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.16)',
    borderStrong: 'rgba(239, 68, 68, 0.22)',
  },
  blueTint: {
    bg: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.14)',
  },
  // Lavender purple tints (the sky)
  purpleTint: {
    bg08: 'rgba(176, 120, 215, 0.1)',
    bg12: 'rgba(176, 120, 215, 0.14)',
    bg15: 'rgba(176, 120, 215, 0.17)',
    bg20: 'rgba(176, 120, 215, 0.22)',
    border15: 'rgba(176, 120, 215, 0.17)',
    border20: 'rgba(176, 120, 215, 0.22)',
    border30: 'rgba(176, 120, 215, 0.32)',
  },
  communityTint: {
    bg: 'rgba(232, 176, 152, 0.1)',
    bg12: 'rgba(232, 176, 152, 0.14)',
    border: 'rgba(232, 176, 152, 0.18)',
    border40: 'rgba(232, 176, 152, 0.44)',
  },
  skeleton: {
    bg: 'rgba(255, 160, 130, 0.04)',
    shimmer: 'rgba(255, 160, 130, 0.08)',
  },
  scrollbar: {
    track: '#271535',
    thumb: '#8E6E82',
    thumbHover: '#CCA0AA',
  },
};

export function getThemeForTime(): ThemeMode {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 18) return 'light';
  if (hour >= 18 && hour < 20) return 'sunset';
  return 'dark';
}

export function getThemeTokens(mode: ThemeMode): ThemeTokens {
  switch (mode) {
    case 'light': return lightTheme;
    case 'sunset': return sunsetTheme;
    case 'dark': return darkTheme;
  }
}
