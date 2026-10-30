// Design tokens for the collection feature. Source of truth:
// design-system/threads-collection/MASTER.md (verify colors with contrast_check.py).
import { Platform, useColorScheme } from 'react-native';
import { TAG_COLORS } from './palette.js';

export { TAG_COLORS };

// 雜誌 direction: paper-white page, ink text, one blue accent for links. Primary
// is ink, so filled buttons and the FAB read as black type on paper.
const light = {
  background: '#F7F6F2',
  card: '#FFFFFF',
  muted: '#ECEAE4',
  field: '#ECEAE4',
  foreground: '#1E1D1A',
  mutedForeground: '#5E5B53',
  border: '#D9D6CE',
  primary: '#1E1D1A',
  onPrimary: '#F7F6F2',
  accent: '#2E4E8F',
  danger: '#B3261E',
  success: '#2F7D4A',
  scrim: 'rgba(0,0,0,0.45)',
  badge: 'rgba(30,29,26,0.72)',
  onBadge: '#FFFFFF',
};

const dark = {
  background: '#161615',
  card: '#1F1F1D',
  muted: '#2A2A27',
  field: '#2A2A27',
  foreground: '#EDEBE6',
  mutedForeground: '#A9A69E',
  border: '#36352F',
  primary: '#EDEBE6',
  onPrimary: '#161615',
  accent: '#9DB7EA',
  danger: '#F2978F',
  success: '#7CC793',
  scrim: 'rgba(0,0,0,0.6)',
  badge: 'rgba(0,0,0,0.7)',
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

// Tag-tinted paper for text-only cards: the light tint, or the hue at 20% over the
// dark card (same pair contrast_check.py verifies for chip text).
export function tagTint(hue, scheme, card) {
  const c = TAG_COLORS[hue] || TAG_COLORS.slate;
  if (scheme !== 'dark') return c.lightBg;
  const a = parseInt(c.dot.slice(1), 16);
  const b = parseInt(card.slice(1), 16);
  const ch = (shift) => Math.round(((a >> shift) & 255) * 0.2 + ((b >> shift) & 255) * 0.8);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
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
  display: { fontSize: 32, lineHeight: 40, letterSpacing: 1, fontFamily: BRAND_FONT },
  title: { fontSize: 21, lineHeight: 29, fontFamily: BRAND_FONT },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  content: { fontSize: 17, lineHeight: 27, fontFamily: BRAND_FONT },
  card: { fontSize: 15, lineHeight: 23, fontFamily: BRAND_FONT },
  cardFeatured: { fontSize: 21, lineHeight: 29, fontFamily: BRAND_FONT },
  quote: { fontSize: 18, lineHeight: 28, fontFamily: BRAND_FONT },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  meta: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  kicker: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 1.5 },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
// Editorial corners: nearly square boxes; only the FAB and switches stay round.
export const radius = { xs: 3, sm: 4, md: 8, lg: 12, sheet: 16, full: 999 };
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
