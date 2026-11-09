// Design tokens for the collection feature. Source of truth:
// design-system/threads-collection/MASTER.md (§2–4 雜誌, §16 themes); colours live in
// themes.js and are verified with contrast_check_themes.py.
import { createContext, createElement, useContext, useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { TAG_COLORS } from './palette.js';
import { DEFAULT_THEME, THEMES, THEME_IDS, normalizeThemeId, tagStyle } from './themes.js';

// LXGW WenKai TC (subset, see app/assets/fonts): a regular-script face with a
// light handwritten warmth. Used for headings and the posts' own words; small
// functional text (labels, chips, meta, inputs) stays in the system sans.
// Android registers it as an XML family "WenKai" with 400 and 700 (app.json).
export const BRAND_FONT = Platform.select({ ios: 'LXGW WenKai TC', default: 'WenKai' });
// WenKai Bold: 底片's titles. Native picks the 700 face of the family; the web
// stand-in registers the bold file as its own family (fonts.web.js), and asking
// for weight 700 there would embolden it a second time.
export const BRAND_FONT_BOLD_WEB = 'WenKaiBold';
const BRAND_BOLD = Platform.select({
  web: { fontFamily: BRAND_FONT_BOLD_WEB },
  default: { fontFamily: BRAND_FONT, fontWeight: '700' },
});
// 底片's date imprint: digits-only subset of IBM Plex Mono Medium, renamed (OFL RFN).
export const IMPRINT_FONT = 'ImprintMono';

// 雜誌 type scale (module default; screens use t.font for the current theme).
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
  imprint: { fontSize: 12, lineHeight: 14, letterSpacing: 0.5, fontFamily: IMPRINT_FONT },
  // The user's own note written by hand: on a 底片 print's edge or a photo's back.
  hand: { fontSize: 13, lineHeight: 18, fontFamily: BRAND_FONT },
};

// 底片 type: WenKai Bold stands in for a serif in titles (Android's `serif` only
// reaches Noto Serif CJK on some builds, and only at 400), posts stay WenKai
// Regular, and the ruled text cards use a 26pt line to sit on their rules.
const filmFont = {
  ...font,
  display: { fontSize: 30, lineHeight: 38, letterSpacing: 1, ...BRAND_BOLD },
  title: { fontSize: 20, lineHeight: 28, ...BRAND_BOLD },
  card: { fontSize: 14, lineHeight: 22, fontFamily: BRAND_FONT },
  quote: { fontSize: 16, lineHeight: 26, fontFamily: BRAND_FONT },
  kicker: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 1 },
};

const FONTS = { editorial: font, film: filmFont };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
// 雜誌 corners (module default; screens use t.radius for the current theme).
export const radius = THEMES.editorial.knobs.radius;
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

// Everything a screen needs for one theme + scheme, built once so the object is
// stable between renders (safe in memo deps).
function resolve(id, scheme) {
  const theme = THEMES[id];
  const { radius: r, ...knobs } = theme.knobs;
  const tags = {};
  for (const hue of Object.keys(TAG_COLORS)) tags[hue] = tagStyle(id, scheme, hue);
  return {
    ...theme.colors[scheme],
    scheme,
    theme: id,
    themeName: theme.name,
    ...knobs,
    font: FONTS[id] || font,
    radius: r,
    tag: (hue) => tags[hue] || tags.slate,
  };
}
const RESOLVED = Object.fromEntries(THEME_IDS.map((id) => [id, { light: resolve(id, 'light'), dark: resolve(id, 'dark') }]));

const ThemeContext = createContext({ id: DEFAULT_THEME, setTheme: null });

// Provided by CollectionProvider (store.js), which persists the choice. Screens
// outside it get the default theme.
export function ThemeProvider({ id, onChange, children }) {
  const value = useMemo(() => ({ id: normalizeThemeId(id), setTheme: onChange || null }), [id, onChange]);
  return createElement(ThemeContext.Provider, { value }, children);
}

// The selected theme id, a setter (null outside the provider), and the choices.
export const THEME_CHOICES = THEME_IDS.map((id) => ({ id, name: THEMES[id].name }));
export function useThemeChoice() {
  const { id, setTheme } = useContext(ThemeContext);
  return { id, setTheme, choices: THEME_CHOICES };
}

// Colour tokens + `scheme` (as before), plus `theme` ('editorial' | 'film'),
// `themeName`, `font`, `radius`, the layout knobs (`printFrame`, `rule`, `marker`,
// `textCard`, `kickerTone`) and `tag(hue)` → { mark, text, paper, onPaper,
// onPaperMuted, paperRule }. See MASTER.md §16 for how screens use them.
export function useCollectionTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { id } = useContext(ThemeContext);
  return RESOLVED[id][scheme];
}
