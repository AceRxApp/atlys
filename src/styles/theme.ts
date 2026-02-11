export type ThemeMode = 'dark' | 'light';

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
    body: '#FAFAF9',
    bodyGradient: 'linear-gradient(180deg, #FAFAF9 0%, #F5F5F4 100%)',
    surface: '#FFFFFF',
    surfaceAlpha: 'rgba(255, 255, 255, 0.85)',
    elevated: '#F5F5F4',
    nav: 'rgba(255,255,255,0.95)',
    toast: 'rgba(255,255,255,0.95)',
    input: '#FFFFFF',
    modalOverlay: 'rgba(0,0,0,0.4)',
    modalOverlayDeep: 'rgba(0,0,0,0.5)',
    subtle: 'rgba(0,0,0,0.02)',
    subtleMedium: 'rgba(0,0,0,0.04)',
    subtleStrong: 'rgba(0,0,0,0.05)',
    subtleButton: 'rgba(0,0,0,0.06)',
    imageOverlay: 'rgba(255,255,255,0.85)',
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
    subtle: 'rgba(0,0,0,0.06)',
    medium: 'rgba(0,0,0,0.08)',
    strong: 'rgba(0,0,0,0.12)',
    dashed: 'rgba(0,0,0,0.12)',
    nav: 'rgba(0,0,0,0.08)',
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
    bg: 'rgba(0,0,0,0.04)',
    shimmer: 'rgba(0,0,0,0.08)',
  },
  scrollbar: {
    track: '#F5F5F4',
    thumb: '#D6D3D1',
    thumbHover: '#A8A29E',
  },
};

export function getThemeForTime(): ThemeMode {
  const hour = new Date().getHours();
  return (hour >= 6 && hour < 19) ? 'light' : 'dark';
}
