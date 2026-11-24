export type AppThemeKey = 'dark' | 'midnight' | 'coffee-dark' | 'moss';

export interface LiquidTheme {
  key: AppThemeKey;
  label: string;
  canvas: string;
  orb1: string;
  orb2: string;
  orb3: string;
  glass: string;
  glassStrong: string;
  glassInput: string;
  bubbleOut: string;
  bubbleIn: string;
  border: string;
  specular: string;
  accent: string;
  accentSoft: string;
  text: string;
  textSub: string;
}

export const LIQUID_THEMES: Record<AppThemeKey, LiquidTheme> = {
  dark: {
    key: 'dark',
    label: 'Жидкий обсидиан',
    canvas: '#050914',
    orb1: 'rgba(59, 130, 246, 0.22)',
    orb2: 'rgba(139, 92, 246, 0.18)',
    orb3: 'rgba(6, 182, 212, 0.15)',
    glass: 'rgba(20, 30, 50, 0.72)',
    glassStrong: 'rgba(16, 25, 44, 0.88)',
    glassInput: 'rgba(10, 16, 30, 0.76)',
    bubbleOut: 'rgba(37, 99, 235, 0.42)',
    bubbleIn: 'rgba(26, 38, 62, 0.78)',
    border: 'rgba(255, 255, 255, 0.12)',
    specular: 'rgba(255, 255, 255, 0.26)',
    accent: '#60a5fa',
    accentSoft: 'rgba(96, 165, 250, 0.2)',
    text: '#f8fafc',
    textSub: '#94a3b8',
  },
  midnight: {
    key: 'midnight',
    label: 'Глубокий аметист',
    canvas: '#090514',
    orb1: 'rgba(168, 85, 247, 0.25)',
    orb2: 'rgba(236, 72, 153, 0.18)',
    orb3: 'rgba(99, 102, 241, 0.16)',
    glass: 'rgba(32, 20, 56, 0.72)',
    glassStrong: 'rgba(24, 15, 44, 0.88)',
    glassInput: 'rgba(16, 10, 32, 0.76)',
    bubbleOut: 'rgba(147, 51, 234, 0.44)',
    bubbleIn: 'rgba(38, 24, 66, 0.78)',
    border: 'rgba(255, 255, 255, 0.13)',
    specular: 'rgba(244, 114, 182, 0.28)',
    accent: '#c084fc',
    accentSoft: 'rgba(192, 132, 252, 0.2)',
    text: '#faf5ff',
    textSub: '#a78bfa',
  },
  'coffee-dark': {
    key: 'coffee-dark',
    label: 'Кофейный бархат',
    canvas: '#120b07',
    orb1: 'rgba(245, 158, 11, 0.20)',
    orb2: 'rgba(217, 119, 6, 0.16)',
    orb3: 'rgba(180, 83, 9, 0.14)',
    glass: 'rgba(38, 24, 16, 0.74)',
    glassStrong: 'rgba(28, 18, 12, 0.90)',
    glassInput: 'rgba(18, 11, 7, 0.78)',
    bubbleOut: 'rgba(180, 100, 42, 0.50)',
    bubbleIn: 'rgba(46, 30, 21, 0.80)',
    border: 'rgba(255, 224, 194, 0.14)',
    specular: 'rgba(251, 191, 36, 0.24)',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.22)',
    text: '#fef3c7',
    textSub: '#d6b49a',
  },
  moss: {
    key: 'moss',
    label: 'Изумрудный мох',
    canvas: '#06110b',
    orb1: 'rgba(16, 185, 129, 0.22)',
    orb2: 'rgba(20, 184, 166, 0.17)',
    orb3: 'rgba(52, 211, 153, 0.14)',
    glass: 'rgba(16, 36, 26, 0.74)',
    glassStrong: 'rgba(12, 28, 20, 0.90)',
    glassInput: 'rgba(8, 18, 13, 0.78)',
    bubbleOut: 'rgba(16, 135, 92, 0.48)',
    bubbleIn: 'rgba(20, 44, 32, 0.80)',
    border: 'rgba(167, 243, 208, 0.14)',
    specular: 'rgba(52, 211, 153, 0.25)',
    accent: '#34d399',
    accentSoft: 'rgba(52, 211, 153, 0.2)',
    text: '#ecfdf5',
    textSub: '#86efac',
  },
};

export const RADII = {
  PILL: 999,
  CARD: 28,
  BUBBLE: 24,
  INPUT: 24,
  ITEM: 24,
};
