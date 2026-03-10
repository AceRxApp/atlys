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
    body: '#000000',
    bodyGradient: 'linear-gradient(180deg, #000000 0%, #0A0A0A 100%)',
    surface: '#0A0A0A',
    surfaceAlpha: 'rgba(10, 10, 10, 0.85)',
    elevated: '#161616',
    nav: 'rgba(0,0,0,0.97)',
    toast: 'rgba(10,10,10,0.97)',
    input: '#000000',
    modalOverlay: 'rgba(0,0,0,0.9)',
    modalOverlayDeep: 'rgba(0,0,0,0.95)',
    subtle: 'rgba(255,255,255,0.03)',
    subtleMedium: 'rgba(255,255,255,0.05)',
    subtleStrong: 'rgba(255,255,255,0.06)',
    subtleButton: 'rgba(255,255,255,0.08)',
    imageOverlay: 'rgba(0,0,0,0.92)',
    photoButton: 'rgba(0,0,0,0.6)',
    photoCounter: 'rgba(0,0,0,0.5)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A0',
    tertiary: '#6A6A6A',
    muted: '#4A4A4A',
    disabled: '#2A2A2A',
    body: '#D0D0D0',
    light: '#C0C0C0',
    onAccent: '#000000',
  },
  ...sharedTokens,
  border: {
    subtle: 'rgba(255,255,255,0.06)',
    medium: 'rgba(255,255,255,0.08)',
    strong: 'rgba(255,255,255,0.12)',
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
    track: '#0A0A0A',
    thumb: '#6A6A6A',
    thumbHover: '#A0A0A0',
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
  mapColorScheme: 'LIGHT',
  // Real sunset sky — pink and orange hues like the sun going down
  bg: {
    body: '#F2C8BC',
    bodyGradient: 'linear-gradient(180deg, #F5C8B0 0%, #E8B0A8 100%)',
    surface: '#FCDDD4',
    surfaceAlpha: 'rgba(252, 221, 212, 0.94)',
    elevated: '#EBB8AE',
    nav: 'rgba(242, 200, 188, 0.97)',
    toast: 'rgba(242, 200, 188, 0.97)',
    input: '#FCDDD4',
    modalOverlay: 'rgba(60, 15, 20, 0.50)',
    modalOverlayDeep: 'rgba(60, 15, 20, 0.62)',
    subtle: 'rgba(220, 80, 60, 0.06)',
    subtleMedium: 'rgba(220, 80, 60, 0.09)',
    subtleStrong: 'rgba(220, 80, 60, 0.12)',
    subtleButton: 'rgba(220, 80, 60, 0.13)',
    imageOverlay: 'rgba(242, 200, 188, 0.92)',
    photoButton: 'rgba(80, 20, 20, 0.32)',
    photoCounter: 'rgba(80, 20, 20, 0.25)',
  },
  // Deep warm brown text on pink-coral backgrounds
  text: {
    primary: '#2A0E08',
    secondary: '#5C2820',
    tertiary: '#8A5048',
    muted: '#B08078',
    disabled: '#C8A8A0',
    body: '#3E1810',
    light: '#7A4840',
    onAccent: '#FFFFFF',
  },
  // Vivid sunset orange-coral accent
  accent: {
    amber: '#E06030',
    amberDark: '#C84820',
    amberLight: '#F07840',
    amberGradient: 'linear-gradient(135deg, #E06030, #C84820)',
    amberTextGradient: 'linear-gradient(135deg, #F07840, #E06030)',
  },
  status: {
    green: '#30A870',
    red: '#D04040',
    blue: '#4878C0',
  },
  // Rose-coral event tones
  events: {
    text: '#C04848',
    active: '#B03838',
    gradientStart: '#C84040',
    gradientEnd: '#A83030',
  },
  community: {
    text: '#B85840',
  },
  selection: {
    bg: 'rgba(224, 96, 48, 0.22)',
  },
  // Pink-tinted borders
  border: {
    subtle: 'rgba(180, 60, 50, 0.12)',
    medium: 'rgba(180, 60, 50, 0.18)',
    strong: 'rgba(180, 60, 50, 0.24)',
    dashed: 'rgba(180, 60, 50, 0.22)',
    nav: 'rgba(180, 60, 50, 0.12)',
  },
  // Orange-coral tints
  amberTint: {
    bg06: 'rgba(224, 96, 48, 0.07)',
    bg10: 'rgba(224, 96, 48, 0.12)',
    bg15: 'rgba(224, 96, 48, 0.16)',
    border15: 'rgba(224, 96, 48, 0.20)',
    border20: 'rgba(224, 96, 48, 0.25)',
    border30: 'rgba(224, 96, 48, 0.33)',
    border40: 'rgba(224, 96, 48, 0.42)',
    shadow: 'rgba(224, 96, 48, 0.22)',
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
  // Rose tints for events/tags
  purpleTint: {
    text: '#B84040',
    bg08: 'rgba(184, 64, 64, 0.08)',
    bg12: 'rgba(184, 64, 64, 0.12)',
    bg15: 'rgba(184, 64, 64, 0.15)',
    bg20: 'rgba(184, 64, 64, 0.19)',
    border15: 'rgba(184, 64, 64, 0.17)',
    border20: 'rgba(184, 64, 64, 0.22)',
    border30: 'rgba(184, 64, 64, 0.30)',
  },
  communityTint: {
    bg: 'rgba(184, 88, 64, 0.09)',
    bg12: 'rgba(184, 88, 64, 0.14)',
    border: 'rgba(184, 88, 64, 0.20)',
    border40: 'rgba(184, 88, 64, 0.42)',
  },
  skeleton: {
    bg: 'rgba(180, 60, 50, 0.07)',
    shimmer: 'rgba(180, 60, 50, 0.12)',
  },
  scrollbar: {
    track: '#EBB8AE',
    thumb: '#B08078',
    thumbHover: '#8A5048',
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
