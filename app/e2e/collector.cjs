// The script the app injects into its hidden WebView to read a post
// (src/injected.js), run in a real browser against stand-in Threads pages:
// - it reads the post's JSON as soon as the HTML is parsed, while an image is
//   still loading (it used to wait for the whole page);
// - injected again and again while the page loads (as the app does), it replies
//   once per request;
// - injected into the page that was open before the request, it stays quiet;
// - a /share/ link that moves to /@user/post/CODE in the page reloads once and
//   then reports the code.
// Native-only code can't run in these web builds; this checks the script itself.
const http = require('http');
const path = require('path');
const { run } = require('./lib/harness.cjs');

const injectedPath = path.join(__dirname, '..', 'src', 'injected.js');

// injected.js is an ES module; load its source as CommonJS for this test.
function loadCollectScript() {
  const fs = require('fs');
  const src = fs.readFileSync(injectedPath, 'utf8').replace(/export function/g, 'function');
  return new Function(`${src}; return collectScript;`)();
}

const POST_JSON = JSON.stringify({ data: { post: { code: 'ABC123', media_type: 1, image_versions2: { candidates: [{ url: 'https://cdn/x.jpg', width: 1080, height: 1350 }] } } } });

function page(body) {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/slow.png') {
      // An image that takes 4 s: the old collector waited for it (onLoadEnd).
      setTimeout(() => { res.writeHead(200, { 'content-type': 'image/png' }); res.end(); }, 4000);
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    if (url.pathname === '/@u/post/ABC123') {
      res.end(page(`<script type="application/json">${POST_JSON}</script><img src="/slow.png">`));
    } else if (url.pathname === '/share/S1/') {
      // Threads' share page moves to the post inside the page, without its data.
      res.end(page(`<script>setTimeout(function(){history.replaceState(null,'','/@u/post/ABC123')},300)</script>`));
    } else if (url.pathname === '/@u/post/OLD999') {
      res.end(page(`<script type="application/json">${POST_JSON.replace(/ABC123/g, 'OLD999')}</script>`));
    } else {
      res.end(page(''));
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, origin: `http://127.0.0.1:${server.address().port}` })));
}

run(__filename, async ({ newPage, check, step }) => {
  const collectScript = loadCollectScript();
  const { server, origin } = await serve();
  const page = await newPage();
  const messages = [];
  await page.exposeFunction('__report', (m) => messages.push({ ...JSON.parse(m), at: Date.now() }));
  await page.addInitScript(() => {
    window.ReactNativeWebView = { postMessage: (m) => window.__report(m) };
  });
  const inject = (id, code, nonce, since) => page.evaluate(collectScript(id, code, nonce, since)).catch(() => {});
  const waitFor = async (pred, ms = 6000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (pred()) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  };

  try {
    await step('reads before the page finishes loading', async () => {
      messages.length = 0;
      const since = Date.now();
      const nav = page.goto(`${origin}/@u/post/ABC123`, { waitUntil: 'commit' });
      await nav;
      // The app injects on every load-progress tick; do the same a few times.
      for (let i = 0; i < 4; i++) {
        await inject('ABC123', 'ABC123', 'n1', since);
        await new Promise((r) => setTimeout(r, 100));
      }
      const got = await waitFor(() => messages.length > 0, 3000);
      check('reply arrives while the slow image is still loading', got && messages[0].at - since < 2500, got ? `${messages[0].at - since} ms` : 'no reply');
      check('the reply carries the post JSON and nonce', got && messages[0].json.length === 1 && messages[0].nonce === 'n1' && messages[0].code === 'ABC123');
      await inject('ABC123', 'ABC123', 'n1', since);
      await new Promise((r) => setTimeout(r, 600));
      check('repeated injections reply once', messages.length === 1, `${messages.length} replies`);
    });

    await step('ignores the page that was open before the request', async () => {
      // The previous read left another post on screen; a /share/ request (code
      // unknown) injected into it must not report that post.
      await page.goto(`${origin}/@u/post/OLD999`);
      await new Promise((r) => setTimeout(r, 100));
      messages.length = 0;
      const since = Date.now(); // the request starts after this page loaded
      await inject('S2', null, 'n2', since);
      await new Promise((r) => setTimeout(r, 800));
      check('no reply from the previous page', messages.length === 0, `${messages.length} replies`);
      // Control: the same injection without the start time does answer, with the
      // old post, which is what the guard prevents.
      await inject('S2', null, 'n2b', 0);
      await waitFor(() => messages.length > 0, 2000);
      check('control: unguarded it would report the old post', messages.length > 0 && messages[0].code === 'OLD999');
    });

    await step('share link: reloads once, then reports the code', async () => {
      messages.length = 0;
      const since = Date.now();
      await page.goto(`${origin}/share/S1/`, { waitUntil: 'commit' });
      // Keep injecting like the app does on progress/load events, across the reload.
      const end = Date.now() + 5000;
      while (Date.now() < end && !messages.length) {
        await inject('S1', null, 'n3', since);
        await new Promise((r) => setTimeout(r, 150));
      }
      check('reply names the post code', messages.length > 0 && messages[0].code === 'ABC123', JSON.stringify(messages[0] && { code: messages[0].code, n: messages[0].json.length }));
      check('the reloaded page had the post JSON', messages.length > 0 && messages[0].json.length === 1);
    });
  } finally {
    server.close();
  }
});
