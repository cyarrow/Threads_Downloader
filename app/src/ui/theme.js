import { useColorScheme } from 'react-native';

// iOS-style palette tuned for WCAG AA: every text color is ≥4.5:1 on the surfaces
// it sits on (card, background, and input fill), and `tertiary` is reserved for
// non-text graphics, which only need 3:1. Filled controls use `accentFill`, which
// can differ from the `accent` used for text and icons.
const light = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  fill: 'rgba(118,118,128,0.12)',
  label: '#000000',
  secondary: '#6C6C70',
  tertiary: '#8E8E93',
  separator: 'rgba(60,60,67,0.18)',
  accent: '#0062CC',
  accentFill: '#0062CC',
  accentSoft: 'rgba(0,98,204,0.12)',
  onAccent: '#FFFFFF',
  success: '#248A3D',
  danger: '#D70015',
  dangerFill: '#D70015',
  onFill: '#FFFFFF',
  scrim: 'rgba(0,0,0,0.55)',
};

const dark = {
  background: '#000000',
  card: '#1C1C1E',
  fill: 'rgba(118,118,128,0.24)',
  label: '#FFFFFF',
  secondary: '#AEAEB2',
  tertiary: '#8E8E93',
  separator: 'rgba(84,84,88,0.6)',
  accent: '#4DA3FF',
  accentFill: '#0071E3',
  accentSoft: 'rgba(64,156,255,0.18)',
  onAccent: '#FFFFFF',
  success: '#248A3D',
  danger: '#FF6961',
  dangerFill: '#D70015',
  onFill: '#FFFFFF',
  scrim: 'rgba(0,0,0,0.55)',
};

export function useTheme() {
  return useColorScheme() === 'dark' ? dark : light;
}

// Size-specific tracking: tighter as text grows, near zero for body copy.
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.6 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 17, lineHeight: 24, letterSpacing: -0.2 },
  subhead: { fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
};

// Minimum touch target (Apple HIG 44pt / Material 48dp; 44 plus hitSlop covers both).
export const TOUCH = 44;
