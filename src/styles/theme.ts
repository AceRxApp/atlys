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
  // Rich golden-hour — warm peach & apricot, clearly distinct from light mode's cool beige
  bg: {
    body: '#FAE0C8',
    bodyGradient: 'linear-gradient(180deg, #FCDEC0 0%, #F0C8A8 100%)',
    surface: '#FFF0DD',
    surfaceAlpha: 'rgba(255, 240, 221, 0.93)',
    elevated: '#F0D0B0',
    nav: 'rgba(250, 224, 200, 0.97)',
    toast: 'rgba(250, 224, 200, 0.97)',
    input: '#FFF0DD',
    modalOverlay: 'rgba(50, 20, 5, 0.50)',
    modalOverlayDeep: 'rgba(50, 20, 5, 0.60)',
    subtle: 'rgba(200, 90, 30, 0.06)',
    subtleMedium: 'rgba(200, 90, 30, 0.09)',
    subtleStrong: 'rgba(200, 90, 30, 0.12)',
    subtleButton: 'rgba(200, 90, 30, 0.13)',
    imageOverlay: 'rgba(250, 224, 200, 0.92)',
    photoButton: 'rgba(70, 30, 10, 0.35)',
    photoCounter: 'rgba(70, 30, 10, 0.28)',
  },
  // Deep espresso text on warm peach — richer contrast than light mode
  text: {
    primary: '#2D1408',
    secondary: '#6A3E28',
    tertiary: '#946050',
    muted: '#B88878',
    disabled: '#D0B8A8',
    body: '#4A2818',
    light: '#7A5040',
    onAccent: '#FFFFFF',
  },
  // Vivid burnt-orange accent — distinct from light mode's golden amber
  accent: {
    amber: '#D85A18',
    amberDark: '#C04810',
    amberLight: '#E87030',
    amberGradient: 'linear-gradient(135deg, #D85A18, #C04810)',
    amberTextGradient: 'linear-gradient(135deg, #E87030, #D85A18)',
  },
  status: {
    green: '#2DAF6E',
    red: '#D84040',
    blue: '#4880C0',
  },
  // Warm coral event tones
  events: {
    text: '#C05838',
    active: '#B04828',
    gradientStart: '#C84828',
    gradientEnd: '#A83820',
  },
  community: {
    text: '#B86030',
  },
  selection: {
    bg: 'rgba(216, 90, 24, 0.22)',
  },
  // Visible warm borders — not just subtle tints
  border: {
    subtle: 'rgba(180, 70, 20, 0.12)',
    medium: 'rgba(180, 70, 20, 0.18)',
    strong: 'rgba(180, 70, 20, 0.24)',
    dashed: 'rgba(180, 70, 20, 0.22)',
    nav: 'rgba(180, 70, 20, 0.12)',
  },
  // Burnt-orange tints
  amberTint: {
    bg06: 'rgba(216, 90, 24, 0.07)',
    bg10: 'rgba(216, 90, 24, 0.12)',
    bg15: 'rgba(216, 90, 24, 0.16)',
    border15: 'rgba(216, 90, 24, 0.20)',
    border20: 'rgba(216, 90, 24, 0.25)',
    border30: 'rgba(216, 90, 24, 0.33)',
    border40: 'rgba(216, 90, 24, 0.42)',
    shadow: 'rgba(216, 90, 24, 0.22)',
  },
  greenTint: {
    bg: 'rgba(45, 175, 110, 0.09)',
    bgStrong: 'rgba(45, 175, 110, 0.16)',
    border: 'rgba(45, 175, 110, 0.22)',
    borderStrong: 'rgba(45, 175, 110, 0.30)',
  },
  redTint: {
    bg: 'rgba(216, 64, 64, 0.09)',
    border: 'rgba(216, 64, 64, 0.20)',
    borderStrong: 'rgba(216, 64, 64, 0.28)',
  },
  blueTint: {
    bg: 'rgba(72, 128, 192, 0.09)',
    border: 'rgba(72, 128, 192, 0.18)',
  },
  // Deep terracotta tints
  purpleTint: {
    text: '#B85038',
    bg08: 'rgba(184, 80, 56, 0.08)',
    bg12: 'rgba(184, 80, 56, 0.12)',
    bg15: 'rgba(184, 80, 56, 0.15)',
    bg20: 'rgba(184, 80, 56, 0.19)',
    border15: 'rgba(184, 80, 56, 0.17)',
    border20: 'rgba(184, 80, 56, 0.22)',
    border30: 'rgba(184, 80, 56, 0.30)',
  },
  communityTint: {
    bg: 'rgba(184, 96, 48, 0.09)',
    bg12: 'rgba(184, 96, 48, 0.14)',
    border: 'rgba(184, 96, 48, 0.20)',
    border40: 'rgba(184, 96, 48, 0.42)',
  },
  skeleton: {
    bg: 'rgba(180, 70, 20, 0.07)',
    shimmer: 'rgba(180, 70, 20, 0.12)',
  },
  scrollbar: {
    track: '#F0D0B0',
    thumb: '#B88878',
    thumbHover: '#946050',
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
