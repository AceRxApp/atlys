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
    text: string;
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
    amber: '#E8940A',
    amberDark: '#C47D08',
    amberLight: '#F5A623',
    amberGradient: 'linear-gradient(135deg, #E8940A, #C47D08)',
    amberTextGradient: 'linear-gradient(135deg, #F5A623, #E8940A)',
  },
  status: {
    green: '#34D399',
    red: '#F87171',
    blue: '#8CB8D4',
  },
  events: {
    text: '#D4A07A',
    active: '#C48A5A',
    gradientStart: '#C48A5A',
    gradientEnd: '#A06830',
  },
  community: {
    text: '#D4A574',
  },
  selection: {
    bg: 'rgba(232,148,10,0.3)',
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
    elevated: '#302924',
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
    bg06: 'rgba(232,148,10,0.06)',
    bg10: 'rgba(232,148,10,0.1)',
    bg15: 'rgba(232,148,10,0.15)',
    border15: 'rgba(232,148,10,0.15)',
    border20: 'rgba(232,148,10,0.2)',
    border30: 'rgba(232,148,10,0.3)',
    border40: 'rgba(232,148,10,0.4)',
    shadow: 'rgba(232,148,10,0.3)',
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
    bg: 'rgba(140,184,212,0.1)',
    border: 'rgba(140,184,212,0.15)',
  },
  purpleTint: {
    text: '#D4A07A',
    bg08: 'rgba(196,138,90,0.08)',
    bg12: 'rgba(196,138,90,0.12)',
    bg15: 'rgba(196,138,90,0.15)',
    bg20: 'rgba(196,138,90,0.2)',
    border15: 'rgba(196,138,90,0.15)',
    border20: 'rgba(196,138,90,0.2)',
    border30: 'rgba(196,138,90,0.3)',
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
    bg06: 'rgba(232,148,10,0.06)',
    bg10: 'rgba(232,148,10,0.08)',
    bg15: 'rgba(232,148,10,0.12)',
    border15: 'rgba(232,148,10,0.2)',
    border20: 'rgba(232,148,10,0.25)',
    border30: 'rgba(232,148,10,0.35)',
    border40: 'rgba(232,148,10,0.45)',
    shadow: 'rgba(232,148,10,0.15)',
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
    bg: 'rgba(140,184,212,0.06)',
    border: 'rgba(140,184,212,0.18)',
  },
  purpleTint: {
    text: '#A06830',
    bg08: 'rgba(196,138,90,0.06)',
    bg12: 'rgba(196,138,90,0.1)',
    bg15: 'rgba(196,138,90,0.12)',
    bg20: 'rgba(196,138,90,0.15)',
    border15: 'rgba(196,138,90,0.15)',
    border20: 'rgba(196,138,90,0.2)',
    border30: 'rgba(196,138,90,0.25)',
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
  // Warm golden-hour twilight — halfway between day and night
  bg: {
    body: '#352420',
    bodyGradient: 'linear-gradient(180deg, #352420 0%, #3E2C26 100%)',
    surface: '#3E2C26',
    surfaceAlpha: 'rgba(62, 44, 38, 0.88)',
    elevated: '#4A3830',
    nav: 'rgba(53, 36, 32, 0.95)',
    toast: 'rgba(62, 44, 38, 0.95)',
    input: '#352420',
    modalOverlay: 'rgba(20, 12, 10, 0.8)',
    modalOverlayDeep: 'rgba(20, 12, 10, 0.85)',
    subtle: 'rgba(255, 160, 120, 0.05)',
    subtleMedium: 'rgba(255, 160, 120, 0.07)',
    subtleStrong: 'rgba(255, 160, 120, 0.09)',
    subtleButton: 'rgba(255, 160, 120, 0.12)',
    imageOverlay: 'rgba(53, 36, 32, 0.88)',
    photoButton: 'rgba(20, 12, 10, 0.5)',
    photoCounter: 'rgba(20, 12, 10, 0.4)',
  },
  // Peachy cream text, warm dusty secondaries
  text: {
    primary: '#FFE8E0',
    secondary: '#D4A89E',
    tertiary: '#9A7068',
    muted: '#7A5850',
    disabled: '#5A4440',
    body: '#E8C4B8',
    light: '#D4A89E',
    onAccent: '#1A0E0B',
  },
  // Coral-orange to warm red accent
  accent: {
    amber: '#F06040',
    amberDark: '#E04535',
    amberLight: '#FF8060',
    amberGradient: 'linear-gradient(135deg, #F06040, #E04535)',
    amberTextGradient: 'linear-gradient(135deg, #FF8060, #F06040)',
  },
  status: {
    green: '#34D399',
    red: '#F87171',
    blue: '#93C5FD',
  },
  // Warm rose event tones
  events: {
    text: '#E0A0C0',
    active: '#D080A8',
    gradientStart: '#C070A0',
    gradientEnd: '#A85890',
  },
  community: {
    text: '#E8B098',
  },
  selection: {
    bg: 'rgba(240, 96, 64, 0.35)',
  },
  // Warm coral borders — slightly more visible against lighter bg
  border: {
    subtle: 'rgba(255, 160, 120, 0.1)',
    medium: 'rgba(255, 160, 120, 0.14)',
    strong: 'rgba(255, 160, 120, 0.18)',
    dashed: 'rgba(255, 160, 120, 0.22)',
    nav: 'rgba(255, 160, 120, 0.1)',
  },
  // Coral-orange tints
  amberTint: {
    bg06: 'rgba(240, 96, 64, 0.08)',
    bg10: 'rgba(240, 96, 64, 0.12)',
    bg15: 'rgba(240, 96, 64, 0.18)',
    border15: 'rgba(240, 96, 64, 0.18)',
    border20: 'rgba(240, 96, 64, 0.24)',
    border30: 'rgba(240, 96, 64, 0.34)',
    border40: 'rgba(240, 96, 64, 0.44)',
    shadow: 'rgba(240, 96, 64, 0.35)',
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
  // Warm rose tints
  purpleTint: {
    text: '#E0A0C0',
    bg08: 'rgba(200, 100, 140, 0.1)',
    bg12: 'rgba(200, 100, 140, 0.14)',
    bg15: 'rgba(200, 100, 140, 0.17)',
    bg20: 'rgba(200, 100, 140, 0.22)',
    border15: 'rgba(200, 100, 140, 0.17)',
    border20: 'rgba(200, 100, 140, 0.22)',
    border30: 'rgba(200, 100, 140, 0.32)',
  },
  communityTint: {
    bg: 'rgba(232, 176, 152, 0.1)',
    bg12: 'rgba(232, 176, 152, 0.14)',
    border: 'rgba(232, 176, 152, 0.18)',
    border40: 'rgba(232, 176, 152, 0.44)',
  },
  skeleton: {
    bg: 'rgba(255, 160, 120, 0.06)',
    shimmer: 'rgba(255, 160, 120, 0.1)',
  },
  scrollbar: {
    track: '#3E2C26',
    thumb: '#9A7068',
    thumbHover: '#D4A89E',
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
