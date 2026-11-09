import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLOR_TOKENS,
  DEFAULT_THEME,
  KNOBS,
  RADIUS_KEYS,
  THEMES,
  THEME_IDS,
  formatImprint,
  mixHex,
  normalizeThemeId,
  tagStyle,
} from '../src/collection/themes.js';
import { TAG_HUES } from '../src/collection/palette.js';

const COLOR = /^(#[0-9A-F]{6}|rgba\(\d{1,3},\d{1,3},\d{1,3},(0|1|0?\.\d+)\))$/i;

test('registry has both themes with display names, editorial first and default', () => {
  assert.deepEqual(THEME_IDS, ['editorial', 'film']);
  assert.equal(DEFAULT_THEME, 'editorial');
  assert.equal(THEMES.editorial.name, '雜誌');
  assert.equal(THEMES.film.name, '底片');
});

test('every theme defines every colour token for light and dark, and nothing else', () => {
  for (const id of THEME_IDS) {
    for (const scheme of ['light', 'dark']) {
      const c = THEMES[id].colors[scheme];
      assert.deepEqual(Object.keys(c).sort(), [...COLOR_TOKENS].sort(), `${id} ${scheme}`);
      for (const k of COLOR_TOKENS) assert.match(c[k], COLOR, `${id} ${scheme} ${k} = ${c[k]}`);
    }
  }
});

test('every theme sets every layout knob to a known value and a full radius scale', () => {
  for (const id of THEME_IDS) {
    const k = THEMES[id].knobs;
    for (const [name, allowed] of Object.entries(KNOBS)) {
      assert.ok(allowed.includes(k[name]), `${id}.${name} = ${k[name]}`);
    }
    assert.deepEqual(Object.keys(k.radius).sort(), [...RADIUS_KEYS].sort(), id);
    for (const r of RADIUS_KEYS) assert.equal(typeof k.radius[r], 'number');
  }
  assert.equal(THEMES.film.knobs.printFrame, true);
  assert.equal(THEMES.film.knobs.marker, 'bar');
  assert.equal(THEMES.editorial.knobs.printFrame, false);
});

test('the editorial theme keeps the values the 雜誌 screens shipped with', () => {
  const l = THEMES.editorial.colors.light;
  const d = THEMES.editorial.colors.dark;
  assert.equal(l.background, '#F7F6F2');
  assert.equal(l.accent, '#2E4E8F');
  assert.equal(d.background, '#161615');
  assert.equal(d.outline, '#6E6B63');
  assert.deepEqual(THEMES.editorial.knobs.radius, { xs: 3, sm: 4, md: 8, lg: 12, sheet: 16, full: 999 });
});

test('unknown or missing theme ids fall back to the default', () => {
  assert.equal(normalizeThemeId('film'), 'film');
  assert.equal(normalizeThemeId(null), 'editorial');
  assert.equal(normalizeThemeId('nope'), 'editorial');
});

test('tagStyle returns a complete surface + text set for every hue, theme and scheme', () => {
  for (const id of THEME_IDS) {
    for (const scheme of ['light', 'dark']) {
      const c = THEMES[id].colors[scheme];
      for (const hue of TAG_HUES) {
        const s = tagStyle(id, scheme, hue);
        for (const k of ['mark', 'text', 'paper', 'onPaper', 'onPaperMuted']) assert.match(s[k], COLOR, `${id} ${scheme} ${hue} ${k}`);
        // Text on a paper always comes from the same theme + scheme as the paper.
        assert.ok([c.foreground, c.onPaper].includes(s.onPaper), `${id} ${scheme} ${hue} onPaper`);
      }
    }
  }
});

test('底片 text cards are ruled paper with muted kickers; 雜誌 keeps tag tints', () => {
  const film = tagStyle('film', 'dark', 'rose');
  assert.equal(film.paper, THEMES.film.colors.dark.paper);
  assert.equal(film.onPaper, THEMES.film.colors.dark.onPaper);
  assert.equal(film.paperRule, THEMES.film.colors.dark.paperRule);
  assert.equal(film.text, THEMES.film.colors.dark.mutedForeground);
  const mag = tagStyle('editorial', 'dark', 'rose');
  assert.equal(mag.paper, mixHex('#C4485C', '#1F1F1D', 0.2));
  assert.equal(mag.onPaper, THEMES.editorial.colors.dark.foreground);
  assert.equal(mag.text, '#EDA3AC');
  assert.equal(mag.paperRule, null);
  assert.equal(tagStyle('editorial', 'light', 'unknown').paper, '#E6E4DF'); // slate
});

test('mixHex blends channel by channel', () => {
  assert.equal(mixHex('#FFFFFF', '#000000', 0.5), '#808080');
  assert.equal(mixHex('#C4485C', '#1F1F1D', 0), '#1f1f1d');
});

test('formatImprint prints a film-camera date with space-padded month and day', () => {
  assert.equal(formatImprint(new Date(2026, 10, 2).getTime()), "'26 11  2");
  assert.equal(formatImprint(new Date(2025, 0, 31).getTime()), "'25  1 31");
  assert.equal(formatImprint(null), '');
  assert.equal(formatImprint(Number.NaN), '');
});
