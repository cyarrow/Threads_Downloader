import { useColorScheme } from 'react-native';

// iOS-style system palette, resolved for light and dark appearance.
const light = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  fill: 'rgba(118,118,128,0.12)',
  label: '#000000',
  secondary: 'rgba(60,60,67,0.6)',
  tertiary: 'rgba(60,60,67,0.3)',
  separator: 'rgba(60,60,67,0.18)',
  accent: '#007AFF',
  onAccent: '#FFFFFF',
  success: '#34C759',
  danger: '#FF3B30',
};

const dark = {
  background: '#000000',
  card: '#1C1C1E',
  fill: 'rgba(118,118,128,0.24)',
  label: '#FFFFFF',
  secondary: 'rgba(235,235,245,0.6)',
  tertiary: 'rgba(235,235,245,0.3)',
  separator: 'rgba(84,84,88,0.6)',
  accent: '#0A84FF',
  onAccent: '#FFFFFF',
  success: '#30D158',
  danger: '#FF453A',
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
};
