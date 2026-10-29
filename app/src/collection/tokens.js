// Design tokens for the collection feature. Source of truth:
// design-system/threads-collection/MASTER.md (verify colors with contrast_check.py).
import { Platform, useColorScheme } from 'react-native';
import { TAG_COLORS } from './palette.js';

export { TAG_COLORS };

const light = {
  background: '#FFFBEB',
  card: '#FFFFFF',
  muted: '#FCF6F0',
  field: '#F5EFE6',
  foreground: '#0F172A',
  mutedForeground: '#475569',
  border: '#E7DCCB',
  primary: '#D97706', // fill only, never text
  onPrimary: '#000000',
  accent: '#2563EB',
  danger: '#DC2626',
  success: '#15803D',
  scrim: 'rgba(0,0,0,0.45)',
  badge: 'rgba(15,23,42,0.72)',
  onBadge: '#FFFFFF',
};

const dark = {
  background: '#12100E',
  card: '#1E1B18',
  muted: '#2A2622',
  field: '#2A2622',
  foreground: '#F5F1EA',
  mutedForeground: '#B8B0A6',
  border: '#3A352F',
  primary: '#F59E0B',
  onPrimary: '#000000',
  accent: '#60A5FA',
  danger: '#F87171',
  success: '#4ADE80',
  scrim: 'rgba(0,0,0,0.6)',
  badge: 'rgba(0,0,0,0.72)',
  onBadge: '#FFFFFF',
};

// Chip colors for a tag hue in the current scheme; selected chips invert to a
// solid fill and must also show a checkmark (color is never the only signal).
export function tagColors(hue, scheme, selected) {
  const c = TAG_COLORS[hue] || TAG_COLORS.slate;
  if (scheme === 'dark') {
    return selected
      ? { bg: c.darkText, text: '#000000', dot: c.dot }
      : { bg: `${c.dot}33`, text: c.darkText, dot: c.dot }; // 0x33 ≈ 20% over card
  }
  return selected
    ? { bg: c.lightText, text: '#FFFFFF', dot: c.dot }
    : { bg: c.lightBg, text: c.lightText, dot: c.dot };
}

export function useCollectionTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...(scheme === 'dark' ? dark : light), scheme };
}

// LXGW WenKai TC (subset, see app/assets/fonts): a regular-script face with a
// light handwritten warmth. Used for headings and the posts' own words; small
// functional text (labels, chips, meta, inputs) stays in the system sans.
// Android registers it as an XML family "WenKai" with 400 and 700 (app.json).
export const BRAND_FONT = Platform.select({ ios: 'LXGW WenKai TC', default: 'WenKai' });

export const font = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700', fontFamily: BRAND_FONT },
  title: { fontSize: 21, lineHeight: 28, fontWeight: '700', fontFamily: BRAND_FONT },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  content: { fontSize: 17, lineHeight: 27, fontFamily: BRAND_FONT },
  card: { fontSize: 16, lineHeight: 23, fontFamily: BRAND_FONT },
  cardFeatured: { fontSize: 18, lineHeight: 26, fontWeight: '700', fontFamily: BRAND_FONT },
  quote: { fontSize: 18, lineHeight: 28, fontFamily: BRAND_FONT },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  meta: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 8, md: 12, lg: 16, sheet: 20, full: 999 };
export const icon = { sm: 16, md: 20, lg: 24 };

// Android 48dp / iOS 44pt minimum touch target.
export const TOUCH = Platform.select({ android: 48, ios: 44, default: 48 });

export const elevation = {
  level1: Platform.select({
    android: { elevation: 3 },
    default: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  }),
  level2: Platform.select({
    android: { elevation: 8 },
    default: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
  }),
};
