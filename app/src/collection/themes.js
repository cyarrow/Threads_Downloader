// Theme registry for the collection screens: pure data, no React Native imports,
// so Node tests and design-system/threads-collection/contrast_check_themes.py can
// read it. tokens.js turns an entry into what useCollectionTheme() returns.
// Spec: design-system/threads-collection/MASTER.md §16.
//
// Every colour here is chosen together with the surface it sits on, per theme and
// per scheme: text never takes its colour from one theme and its background from
// another. Text that sits on a tag-coloured or paper surface comes from
// tagStyle(), which returns the surface and its text colours as one set.
import { TAG_COLORS } from './palette.js';

export const DEFAULT_THEME = 'editorial';

// Every theme defines every one of these, for light and dark (test/themes.test.mjs).
export const COLOR_TOKENS = [
  'background', // page
  'card', // sheets, panels
  'muted', // skeletons, image placeholders
  'field', // inputs, search bar
  'foreground', // main text; selected chip fill
  'mutedForeground', // secondary text
  'border', // decorative hairlines (not interactive)
  'outline', // edges of controls: ≥3:1 on background and card
  'primary', // filled buttons, FAB
  'onPrimary',
  'accent', // the one colour accent: links, 精選
  'danger',
  'success',
  'scrim',
  'badge', // translucent label over a photo
  'onBadge',
  'paper', // text-only post card (底片: back of a photo)
  'onPaper',
  'onPaperMuted',
  'paperRule', // ruled lines on the paper
  'edge', // white border of a print
  'onEdge', // text printed on that border (deck cards)
  'onEdgeMuted',
  'stamp', // date imprint on photos
  'stampGlow',
  'sprocket', // film strip rule under the masthead
  'sprocketHole',
];

// Layout knobs every theme sets (values are checked by the registry test).
export const KNOBS = {
  printFrame: [false, true], // photos as prints: paper edge, shadow, date imprint
  rule: ['line', 'sprocket'], // masthead rule: 2px ink line or perforated film strip
  marker: ['square', 'bar'], // tag colour marker: 8×8 square or 3×12 bar
  textCard: ['tint', 'lined'], // text-only posts: tag-tinted page or ruled photo back
  kickerTone: ['tag', 'muted'], // kicker text in the tag's colour or in mutedForeground
};
export const RADIUS_KEYS = ['xs', 'sm', 'md', 'lg', 'sheet', 'full'];

export const THEMES = {
  // 雜誌 (2026-10-30): paper-white page, ink text, one blue accent for links.
  editorial: {
    id: 'editorial',
    name: '雜誌',
    colors: {
      light: {
        background: '#F7F6F2',
        card: '#FFFFFF',
        muted: '#ECEAE4',
        field: '#ECEAE4',
        foreground: '#1E1D1A',
        mutedForeground: '#5E5B53',
        border: '#D9D6CE',
        outline: '#8E8A80',
        primary: '#1E1D1A',
        onPrimary: '#F7F6F2',
        accent: '#2E4E8F',
        danger: '#B3261E',
        success: '#2F7D4A',
        scrim: 'rgba(0,0,0,0.45)',
        badge: 'rgba(30,29,26,0.72)',
        onBadge: '#FFFFFF',
        paper: '#FFFFFF',
        onPaper: '#1E1D1A',
        onPaperMuted: '#5E5B53',
        paperRule: '#D9D6CE',
        edge: '#FFFFFF',
        onEdge: '#1E1D1A',
        onEdgeMuted: '#5E5B53',
        stamp: '#E8772E',
        stampGlow: 'rgba(255,120,40,0.45)',
        sprocket: '#1E1D1A',
        sprocketHole: '#F7F6F2',
      },
      dark: {
        background: '#161615',
        card: '#1F1F1D',
        muted: '#2A2A27',
        field: '#2A2A27',
        foreground: '#EDEBE6',
        mutedForeground: '#A9A69E',
        border: '#36352F',
        outline: '#6E6B63',
        primary: '#EDEBE6',
        onPrimary: '#161615',
        accent: '#9DB7EA',
        danger: '#F2978F',
        success: '#7CC793',
        scrim: 'rgba(0,0,0,0.6)',
        badge: 'rgba(0,0,0,0.7)',
        onBadge: '#FFFFFF',
        paper: '#1F1F1D',
        onPaper: '#EDEBE6',
        onPaperMuted: '#A9A69E',
        paperRule: '#36352F',
        edge: '#EDEBE6',
        onEdge: '#1E1D1A',
        onEdgeMuted: '#5E5B53',
        stamp: '#E8772E',
        stampGlow: 'rgba(255,120,40,0.45)',
        sprocket: '#3A3934',
        sprocketHole: '#161615',
      },
    },
    knobs: {
      printFrame: false,
      rule: 'line',
      marker: 'square',
      textCard: 'tint',
      kickerTone: 'tag',
      // Editorial corners: nearly square boxes; only the FAB and switches stay round.
      radius: { xs: 3, sm: 4, md: 8, lg: 12, sheet: 16, full: 999 },
    },
  },

  // 底片 (2026-11-02): light = photo-album page, dark = darkroom. Photos are prints
  // with a paper edge and an orange date imprint; one warm rust accent.
  film: {
    id: 'film',
    name: '底片',
    colors: {
      light: {
        background: '#E6E0D4',
        card: '#F4F0E7',
        muted: '#D8D1C2',
        field: '#DCD5C7',
        foreground: '#26231E',
        mutedForeground: '#5C554A',
        border: '#C9C1B1',
        outline: '#857D6E',
        primary: '#26231E',
        onPrimary: '#F4F0E7',
        accent: '#9E4320',
        danger: '#A3241B',
        success: '#3A6E3C',
        scrim: 'rgba(20,16,10,0.5)',
        badge: 'rgba(0,0,0,0.6)',
        onBadge: '#FFFFFF',
        paper: '#F7F4EC',
        onPaper: '#26231E',
        onPaperMuted: '#5C554A',
        paperRule: '#DCD4C4',
        edge: '#FBF8F1',
        onEdge: '#26231E',
        onEdgeMuted: '#5C554A',
        stamp: '#E8772E',
        stampGlow: 'rgba(255,120,40,0.45)',
        sprocket: '#26231E',
        sprocketHole: '#E6E0D4',
      },
      dark: {
        background: '#141311',
        card: '#1D1B18',
        muted: '#2A2723',
        field: '#2A2723',
        foreground: '#ECE6DA',
        mutedForeground: '#A89F90',
        border: '#34302A',
        outline: '#71695D',
        primary: '#ECE6DA',
        onPrimary: '#141311',
        accent: '#F0A06A',
        danger: '#F2978F',
        success: '#7CC793',
        scrim: 'rgba(0,0,0,0.6)',
        badge: 'rgba(0,0,0,0.6)',
        onBadge: '#FFFFFF',
        paper: '#201E1A',
        onPaper: '#ECE6DA',
        onPaperMuted: '#A89F90',
        paperRule: '#363229',
        edge: '#EDE7DA',
        onEdge: '#26231E',
        onEdgeMuted: '#5C554A',
        stamp: '#E8772E',
        stampGlow: 'rgba(255,120,40,0.45)',
        sprocket: '#35312B',
        sprocketHole: '#141311',
      },
    },
    knobs: {
      printFrame: true,
      rule: 'sprocket',
      marker: 'bar',
      textCard: 'lined',
      kickerTone: 'muted',
      radius: { xs: 0, sm: 0, md: 0, lg: 0, sheet: 0, full: 999 },
    },
  },
};

export const THEME_IDS = Object.keys(THEMES);

export function normalizeThemeId(id) {
  return THEMES[id] ? id : DEFAULT_THEME;
}

export function themeColors(id, scheme) {
  return THEMES[normalizeThemeId(id)].colors[scheme === 'dark' ? 'dark' : 'light'];
}

// `a` over `b` at `alpha` (both #RRGGBB) → #rrggbb.
export function mixHex(a, b, alpha) {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(((x >> shift) & 255) * alpha + ((y >> shift) & 255) * (1 - alpha));
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

// One tag hue in one theme + scheme, as a set that belongs together:
//   mark          the colour bar/square (non-text; colour is never the only signal)
//   text          the tag's name on the page or a card (kicker)
//   paper         background of a text-only post card filed under this tag
//   onPaper       text on that paper, onPaperMuted its secondary text
//   paperRule     ruled lines on the paper (null = no lines)
export function tagStyle(id, scheme, hue) {
  const theme = THEMES[normalizeThemeId(id)];
  const c = theme.colors[scheme === 'dark' ? 'dark' : 'light'];
  const tc = TAG_COLORS[hue] || TAG_COLORS.slate;
  const dark = scheme === 'dark';
  const text = theme.knobs.kickerTone === 'tag' ? (dark ? tc.darkText : tc.lightText) : c.mutedForeground;
  if (theme.knobs.textCard === 'lined') {
    return { mark: tc.dot, text, paper: c.paper, onPaper: c.onPaper, onPaperMuted: c.onPaperMuted, paperRule: c.paperRule };
  }
  // Tag-tinted page: the light tint, or the hue at 20% over the dark card.
  const paper = dark ? mixHex(tc.dot, c.card, 0.2) : tc.lightBg;
  return { mark: tc.dot, text, paper, onPaper: c.foreground, onPaperMuted: c.mutedForeground, paperRule: null };
}

// Date imprint like a film camera's: '26 11  2 (year, month, day; month and day
// right-aligned in two columns, so a monospace face keeps them lined up).
export function formatImprint(ts) {
  const d = new Date(ts);
  if (!ts || Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, ' ');
  return `'${String(d.getFullYear()).slice(2)} ${pad(d.getMonth() + 1)} ${pad(d.getDate())}`;
}
