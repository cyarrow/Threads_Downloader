// Shared plumbing for the browser E2E suites in app/e2e: serves the web export
// over a local HTTP server, launches Chromium, records PASS/FAIL lines and sets
// the exit code. Each suite is `run(__filename, async (t) => { ... })`.
//
// usage: node e2e/<suite>.cjs [webdir] [shotdir] [light|dark] [editorial|film]
//   webdir   web export to serve      (E2E_WEB,    default e2e/.out/web)
//   shotdir  where screenshots go     (E2E_OUT,    default e2e/.out/shots/<suite>-<scheme>[-<theme>])
//   scheme   prefers-color-scheme     (E2E_SCHEME, default light)
//   theme    app theme to switch to   (E2E_THEME,  default editorial; used by suites that support it)
// E2E_CHROMIUM=<path> launches that Chromium binary instead of Playwright's own.
// E2E_TIMEOUT=<seconds> fails the suite if it runs longer (default 600).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const E2E_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(E2E_DIR, '.out');
// The web stand-in data uses PNG stills as video URLs; suites that play video
// answer every media request with this small WebM instead.
const CLIP = path.join(E2E_DIR, 'clip.webm');

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
};

function options(file) {
  const [webArg, outArg, schemeArg, themeArg] = process.argv.slice(2);
  const suite = path.basename(file, path.extname(file));
  const scheme = schemeArg || process.env.E2E_SCHEME || 'light';
  const theme = themeArg || process.env.E2E_THEME || 'editorial';
  const variant = [suite, scheme, theme !== 'editorial' ? theme : null].filter(Boolean).join('-');
  return {
    suite,
    scheme,
    theme,
    web: path.resolve(webArg || process.env.E2E_WEB || path.join(OUT_DIR, 'web')),
    out: path.resolve(outArg || process.env.E2E_OUT || path.join(OUT_DIR, 'shots', variant)),
  };
}

// Static server for the export; unknown paths fall back to index.html.
function serve(root) {
  const server = http.createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html');
    res.setHeader('content-type', TYPES[path.extname(p)] || 'application/octet-stream');
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}/` })));
}

function loadChromium() {
  try {
    return require('playwright').chromium;
  } catch (e) {
    console.error('Cannot load playwright. Run `npm ci` in app/ and `npx playwright install chromium`.');
    throw e;
  }
}

async function run(file, body, { autoplay = false } = {}) {
  const o = options(file);
  const results = [];
  const check = (name, ok, extra = '') => {
    const line = `${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`;
    results.push(line);
    console.log(line);
  };
  // A step that throws (missing element, timeout) is one FAIL, and the suite goes on.
  const step = async (name, fn) => {
    try { await fn(); } catch (e) { check(name, false, e.message.split('\n')[0]); }
  };

  if (!['light', 'dark'].includes(o.scheme)) {
    console.error(`Unknown color scheme "${o.scheme}" (expected light or dark).`);
    process.exit(2);
  }
  if (!fs.existsSync(path.join(o.web, 'index.html'))) {
    console.error(`No web export at ${o.web}. Build one with \`node e2e/run.mjs --build\` or \`npx expo export --platform web --output-dir e2e/.out/web\`.`);
    process.exit(2);
  }
  fs.mkdirSync(o.out, { recursive: true });

  const limit = Number(process.env.E2E_TIMEOUT) || 600;
  const watchdog = setTimeout(() => {
    check(`${o.suite} finished within ${limit}s`, false);
    process.exit(1);
  }, limit * 1000);

  const chromium = loadChromium();
  const { server, base } = await serve(o.web);
  const launch = { args: autoplay ? ['--autoplay-policy=no-user-gesture-required'] : [] };
  if (process.env.E2E_CHROMIUM) launch.executablePath = process.env.E2E_CHROMIUM;
  const browser = await chromium.launch(launch);
  const clip = fs.existsSync(CLIP) ? fs.readFileSync(CLIP) : null;

  // A phone-sized page in the run's color scheme. `media: true` serves clip.webm
  // for every <video>. The app's update check (GitHub releases API) always gets
  // "no release" so runs don't depend on the network or on GitHub rate limits.
  const newPage = async ({ media = false, ...context } = {}) => {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      colorScheme: o.scheme,
      hasTouch: true,
      ...context,
    });
    await page.route(/^https:\/\/api\.github\.com\//, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' }),
    );
    if (media) {
      if (!clip) throw new Error(`missing ${CLIP}`);
      await page.route('**/*', (route) =>
        route.request().resourceType() === 'media'
          ? route.fulfill({ status: 200, contentType: 'video/webm', body: clip })
          : route.fallback(),
      );
    }
    return page;
  };

  // Polls `fn` until it returns something truthy (or `timeout` ms pass) and
  // returns its last result: wait for an expected state instead of sleeping.
  const until = async (fn, { timeout = 5000, interval = 100 } = {}) => {
    const end = Date.now() + timeout;
    for (;;) {
      const v = await fn().catch(() => false);
      if (v || Date.now() >= end) return v;
      await new Promise((r) => setTimeout(r, interval));
    }
  };

  let crashed = false;
  try {
    await body({ browser, base, newPage, check, step, until, scheme: o.scheme, theme: o.theme, out: o.out, suite: o.suite });
  } catch (e) {
    crashed = true;
    check(`${o.suite} ran to the end`, false, (e && e.stack) || String(e));
  } finally {
    clearTimeout(watchdog);
    await browser.close().catch(() => {});
    server.close();
  }
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  if (!results.length) console.log('FAIL no checks ran');
  console.log(`# ${o.suite} (${o.scheme}${o.theme !== 'editorial' ? ', ' + o.theme : ''}): ${results.length - failed} passed, ${failed} failed`);
  process.exit(failed || crashed || !results.length ? 1 : 0);
}

module.exports = { run, CLIP };
