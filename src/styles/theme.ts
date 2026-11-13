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
    amber: '#FF6F5E',
    amberDark: '#D9394A',
    amberLight: '#FF9B7A',
    amberGradient: 'linear-gradient(135deg, #FF9B5E, #E8375F)',
    amberTextGradient: 'linear-gradient(135deg, #FF9B7A, #FF6F5E)',
  },
  status: {
    green: '#34D399',
    red: '#F87171',
    blue: '#8CB8D4',
  },
  events: {
    text: '#A99AE8',
    active: '#8D7BD6',
    gradientStart: '#8D7BD6',
    gradientEnd: '#6B57BF',
  },
  community: {
    text: '#5FC9B4',
  },
  selection: {
    bg: 'rgba(255,111,94,0.3)',
  },
};

export const darkTheme: ThemeTokens = {
  mode: 'dark',
  mapColorScheme: 'DARK',
  bg: {
    body: '#1A1512',
    bodyGradient: 'linear-gradient(180deg, #1A1512 0%, #211A15 100%)',
    surface: '#211A15',
    surfaceAlpha: 'rgba(33, 26, 21, 0.85)',
    elevated: '#2B221B',
    nav: 'rgba(26,21,18,0.97)',
    toast: 'rgba(33,26,21,0.97)',
    input: '#15110E',
    modalOverlay: 'rgba(12,9,7,0.9)',
    modalOverlayDeep: 'rgba(12,9,7,0.95)',
    subtle: 'rgba(241,222,206,0.04)',
    subtleMedium: 'rgba(241,222,206,0.06)',
    subtleStrong: 'rgba(241,222,206,0.075)',
    subtleButton: 'rgba(241,222,206,0.10)',
    imageOverlay: 'rgba(12,9,7,0.92)',
    photoButton: 'rgba(12,9,7,0.6)',
    photoCounter: 'rgba(12,9,7,0.5)',
  },
  text: {
    primary: '#FBF4EC',
    secondary: '#C0AE9E',
    tertiary: '#8F7E70',
    muted: '#5F5248',
    disabled: '#38302A',
    body: '#E3D4C5',
    light: '#D3C2B1',
    onAccent: '#2A0E0C',
  },
  ...sharedTokens,
  border: {
    subtle: 'rgba(241,222,206,0.08)',
    medium: 'rgba(241,222,206,0.11)',
    strong: 'rgba(241,222,206,0.16)',
    dashed: 'rgba(241,222,206,0.19)',
    nav: 'rgba(241,222,206,0.08)',
  },
  amberTint: {
    bg06: 'rgba(255,111,94,0.06)',
    bg10: 'rgba(255,111,94,0.1)',
    bg15: 'rgba(255,111,94,0.15)',
    border15: 'rgba(255,111,94,0.15)',
    border20: 'rgba(255,111,94,0.2)',
    border30: 'rgba(255,111,94,0.3)',
    border40: 'rgba(255,111,94,0.4)',
    shadow: 'rgba(255,111,94,0.3)',
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
    text: '#A99AE8',
    bg08: 'rgba(141,123,214,0.08)',
    bg12: 'rgba(141,123,214,0.12)',
    bg15: 'rgba(141,123,214,0.15)',
    bg20: 'rgba(141,123,214,0.2)',
    border15: 'rgba(141,123,214,0.15)',
    border20: 'rgba(141,123,214,0.2)',
    border30: 'rgba(141,123,214,0.3)',
  },
  communityTint: {
    bg: 'rgba(95,201,180,0.08)',
    bg12: 'rgba(95,201,180,0.12)',
    border: 'rgba(95,201,180,0.15)',
    border40: 'rgba(95,201,180,0.4)',
  },
  skeleton: {
    bg: 'rgba(241,222,206,0.045)',
    shimmer: 'rgba(241,222,206,0.08)',
  },
  scrollbar: {
    track: '#211A15',
    thumb: '#4A3F35',
    thumbHover: '#8F7E70',
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
    onAccent: '#2A0E0C',
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
    bg06: 'rgba(255,111,94,0.06)',
    bg10: 'rgba(255,111,94,0.08)',
    bg15: 'rgba(255,111,94,0.12)',
    border15: 'rgba(255,111,94,0.2)',
    border20: 'rgba(255,111,94,0.25)',
    border30: 'rgba(255,111,94,0.35)',
    border40: 'rgba(255,111,94,0.45)',
    shadow: 'rgba(255,111,94,0.15)',
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
    text: '#6B57BF',
    bg08: 'rgba(107,87,191,0.06)',
    bg12: 'rgba(107,87,191,0.1)',
    bg15: 'rgba(107,87,191,0.12)',
    bg20: 'rgba(107,87,191,0.15)',
    border15: 'rgba(107,87,191,0.15)',
    border20: 'rgba(107,87,191,0.2)',
    border30: 'rgba(107,87,191,0.25)',
  },
  communityTint: {
    bg: 'rgba(43,150,131,0.06)',
    bg12: 'rgba(43,150,131,0.1)',
    border: 'rgba(43,150,131,0.2)',
    border40: 'rgba(43,150,131,0.4)',
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
  mapColorScheme: 'LIGHT',
  // Golden hour — warm amber and honey tones
  bg: {
    body: '#F5DFC4',
    bodyGradient: 'linear-gradient(180deg, #F7E0C0 0%, #EDCFA8 100%)',
    surface: '#FBF0E0',
    surfaceAlpha: 'rgba(251, 240, 224, 0.94)',
    elevated: '#EDD4B0',
    nav: 'rgba(245, 223, 196, 0.97)',
    toast: 'rgba(245, 223, 196, 0.97)',
    input: '#FBF0E0',
    modalOverlay: 'rgba(50, 30, 10, 0.50)',
    modalOverlayDeep: 'rgba(50, 30, 10, 0.62)',
    subtle: 'rgba(180, 120, 40, 0.06)',
    subtleMedium: 'rgba(180, 120, 40, 0.09)',
    subtleStrong: 'rgba(180, 120, 40, 0.12)',
    subtleButton: 'rgba(180, 120, 40, 0.13)',
    imageOverlay: 'rgba(245, 223, 196, 0.92)',
    photoButton: 'rgba(60, 35, 10, 0.32)',
    photoCounter: 'rgba(60, 35, 10, 0.25)',
  },
  // Deep warm brown text on golden backgrounds
  text: {
    primary: '#2C1A08',
    secondary: '#5A3818',
    tertiary: '#8A6840',
    muted: '#B09068',
    disabled: '#C8B498',
    body: '#3E2410',
    light: '#7A5830',
    onAccent: '#FFFFFF',
  },
  // Rich golden amber accent
  accent: {
    amber: '#D48C20',
    amberDark: '#B87410',
    amberLight: '#E8A030',
    amberGradient: 'linear-gradient(135deg, #D48C20, #B87410)',
    amberTextGradient: 'linear-gradient(135deg, #E8A030, #D48C20)',
  },
  status: {
    green: '#30A870',
    red: '#D04040',
    blue: '#4878C0',
  },
  // Warm golden event tones
  events: {
    text: '#C07820',
    active: '#A86818',
    gradientStart: '#C08020',
    gradientEnd: '#A06810',
  },
  community: {
    text: '#B07028',
  },
  selection: {
    bg: 'rgba(212, 140, 32, 0.22)',
  },
  // Golden-tinted borders
  border: {
    subtle: 'rgba(160, 100, 30, 0.12)',
    medium: 'rgba(160, 100, 30, 0.18)',
    strong: 'rgba(160, 100, 30, 0.24)',
    dashed: 'rgba(160, 100, 30, 0.22)',
    nav: 'rgba(160, 100, 30, 0.12)',
  },
  // Golden amber tints
  amberTint: {
    bg06: 'rgba(212, 140, 32, 0.07)',
    bg10: 'rgba(212, 140, 32, 0.12)',
    bg15: 'rgba(212, 140, 32, 0.16)',
    border15: 'rgba(212, 140, 32, 0.20)',
    border20: 'rgba(212, 140, 32, 0.25)',
    border30: 'rgba(212, 140, 32, 0.33)',
    border40: 'rgba(212, 140, 32, 0.42)',
    shadow: 'rgba(212, 140, 32, 0.22)',
  },
  greenTint: {
    bg: 'rgba(48, 168, 112, 0.09)',
    bgStrong: 'rgba(48, 168, 112, 0.16)',
    border: 'rgba(48, 168, 112, 0.22)',
    borderStrong: 'rgba(48, 168, 112, 0.30)',
  },
  redTint: {
    bg: 'rgba(208, 64, 64, 0.09)',
    border: 'rgba(208, 64, 64, 0.20)',
    borderStrong: 'rgba(208, 64, 64, 0.28)',
  },
  blueTint: {
    bg: 'rgba(72, 120, 192, 0.09)',
    border: 'rgba(72, 120, 192, 0.18)',
  },
  // Warm amber tints for events/tags
  purpleTint: {
    text: '#B07020',
    bg08: 'rgba(176, 112, 32, 0.08)',
    bg12: 'rgba(176, 112, 32, 0.12)',
    bg15: 'rgba(176, 112, 32, 0.15)',
    bg20: 'rgba(176, 112, 32, 0.19)',
    border15: 'rgba(176, 112, 32, 0.17)',
    border20: 'rgba(176, 112, 32, 0.22)',
    border30: 'rgba(176, 112, 32, 0.30)',
  },
  communityTint: {
    bg: 'rgba(176, 112, 40, 0.09)',
    bg12: 'rgba(176, 112, 40, 0.14)',
    border: 'rgba(176, 112, 40, 0.20)',
    border40: 'rgba(176, 112, 40, 0.42)',
  },
  skeleton: {
    bg: 'rgba(160, 100, 30, 0.07)',
    shimmer: 'rgba(160, 100, 30, 0.12)',
  },
  scrollbar: {
    track: '#EDD4B0',
    thumb: '#B09068',
    thumbHover: '#8A6840',
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
