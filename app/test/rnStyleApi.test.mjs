// React Native 0.88 no longer exports StyleSheet.absoluteFillObject (only
// absoluteFill). react-native-web still has it, so the browser tests pass while
// the phone gets `undefined`, and `{ ...StyleSheet.absoluteFillObject }` silently
// becomes {} (the download picker's tiles collapsed to zero height that way).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
function sources(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.(js|jsx)$/.test(name) ? [p] : [];
  });
}

test('no source uses StyleSheet.absoluteFillObject', () => {
  const files = [join(root, 'App.js'), ...sources(join(root, 'src'))];
  const hits = files.filter((f) => readFileSync(f, 'utf8').includes('absoluteFillObject'));
  assert.deepEqual(hits.map((f) => f.slice(root.length)), []);
});

test('the installed react-native still lacks it (drop this guard once it returns)', () => {
  const src = readFileSync(join(root, 'node_modules/react-native/Libraries/StyleSheet/StyleSheetExports.js'), 'utf8');
  assert.match(src, /absoluteFill,/);
  assert.doesNotMatch(src, /absoluteFillObject[,:]/);
});

// Build 48 crashed on launch: a Reanimated CSS transition used the string
// 'cubic-bezier(0.23, 1, 0.32, 1)' as transitionTimingFunction. The web accepts
// it, so the browser tests passed, but on Android Reanimated only takes its
// predefined names or a cubicBezier(x1, y1, x2, y2) object and throws.
test('no CSS-string cubic-bezier is passed to Reanimated transitions', () => {
  const files = [join(root, 'App.js'), ...sources(join(root, 'src'))];
  const hits = files.filter((f) => /cubic-bezier\(/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(hits.map((f) => f.slice(root.length)), []);
});
