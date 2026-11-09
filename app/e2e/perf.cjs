// Performance harness for a large collection (run by hand; not part of
// `npm run e2e`). Seeds the web build with N generated posts (`?seed=N`, see
// src/collection/perfSeed.js) and measures, in Chromium at phone size with the
// CPU slowed down (default 4×, a rough stand-in for a mid-range Android phone):
//
//   load      first wall card on screen after navigation (ms since navigation start)
//   scroll    fast wheel scroll down the 收藏 wall: long tasks, frames over 50 ms
//   search    typing a query: per-key input→paint, results on screen after the last key
//   filter    tapping a tag chip on the wall and clearing it again
//   tabs      tapping 串流 / 翻翻 (first visit mounts them) and back to 收藏
//   featured  setting / clearing 精選 on one card from its menu, also with every tab mounted
//   sheet     opening and closing 設定; opening 所有標籤
//   select    批次選取 on the wall: start, 全選, untick one card, end
//
// Every interaction reports its input→next-paint time (Event Timing `duration`,
// the INP measure, 8 ms steps, '<16' below the API's threshold), the long-task
// time in the second after it, and how many components rendered (a fake React
// DevTools hook walks each commit, so it needs the unminified export this
// script builds: names stay readable). Web numbers are a proxy for Android:
// compare before/after on the same machine, don't read them as phone timings.
//
// usage: node e2e/perf.cjs [--build] [--sizes 1000,3000] [--runs 3] [--cpu 4]
//                          [--out e2e/.out/perf-<label>.json] [--label name] [--web dir]
//        node e2e/perf.cjs --compare before.json[,more.json] after.json[,more.json]   (markdown table)
//   --build  export the web build without minifying into e2e/.out/web-perf first
//   --select-only  load, then only the 批次選取 steps (quick re-measure)
//   --web    serve another export (default e2e/.out/web-perf), e.g. one built from an older commit
// Env: E2E_CHROMIUM=<chromium binary> (as for the suites).
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const APP_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(__dirname, '.out');
const WEB = path.join(OUT_DIR, 'web-perf');

function parseArgs(argv) {
  const a = { selectOnly: false, build: false, sizes: [1000, 3000], runs: 3, cpu: 4, out: null, label: 'run', compare: null, web: WEB };
  for (let i = 0; i < argv.length; i++) {
    const v = () => argv[++i];
    switch (argv[i]) {
      case '--build': a.build = true; break;
      case '--select-only': a.selectOnly = true; break;
      case '--sizes': a.sizes = v().split(',').map(Number).filter(Boolean); break;
      case '--runs': a.runs = Number(v()); break;
      case '--cpu': a.cpu = Number(v()); break;
      case '--out': a.out = path.resolve(v()); break;
      case '--label': a.label = v(); break;
      case '--web': a.web = path.resolve(v()); break;
      case '--compare': a.compare = [v(), v()]; break;
      default:
        console.error(`Unknown argument: ${argv[i]}`);
        process.exit(2);
    }
  }
  a.out ||= path.join(OUT_DIR, `perf-${a.label}.json`);
  return a;
}

// --- Runs in the page before the app loads -------------------------------------
function instrument() {
  const P = (window.__perf = { lt: [], ev: [], inputs: [], renders: {}, total: 0, commits: 0, frames: null, firstCard: null, doneAt: null, mark: 0 });
  for (const type of ['pointerdown', 'keydown', 'input']) addEventListener(type, (e) => P.inputs.push(e.timeStamp), true);
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => P.lt.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true });
  } catch { /* not supported */ }
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => P.ev.push([e.name, e.startTime, e.duration]))).observe({ type: 'event', durationThreshold: 16, buffered: true });
  } catch { /* not supported */ }
  // First wall card (PostCard's label starts with @author, or 精選，@author).
  const CARD = '[role="button"][aria-label^="@"], [role="button"][aria-label^="精選，@"]';
  const seek = () => {
    if (document.querySelector(CARD)) P.firstCard = performance.now();
    else requestAnimationFrame(seek);
  };
  requestAnimationFrame(seek);
  let last = 0;
  const frame = (t) => {
    if (P.frames && last) P.frames.push(t - last);
    last = t;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // A minimal React DevTools hook: React calls onCommitFiberRoot after every
  // commit (production builds too). A fiber rendered in this commit if it is new
  // (no alternate) or carries PerformedWork; subtrees whose child list didn't
  // change weren't visited by React and are skipped.
  const COMPONENT = new Set([0, 1, 11, 15]); // function, class, forwardRef, simple memo
  const nameOf = (f) => {
    const t = f.type;
    if (!t) return '?';
    if (f.tag === 11) return t.displayName || (t.render && (t.render.displayName || t.render.name)) || 'ForwardRef';
    return t.displayName || t.name || 'Anonymous';
  };
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    isDisabled: false,
    renderers: new Map(),
    inject(renderer) {
      this.renderers.set(1, renderer);
      return 1;
    },
    checkDCE() {},
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
    onScheduleFiberRoot() {},
    onCommitFiberRoot(id, root) {
      P.commits++;
      const stack = [root.current];
      while (stack.length) {
        const f = stack.pop();
        const prev = f.alternate;
        if (COMPONENT.has(f.tag) && (!prev || f.flags & 1)) {
          const n = nameOf(f);
          P.renders[n] = (P.renders[n] || 0) + 1;
          P.total++;
        }
        if (prev && f.child === prev.child) continue;
        for (let c = f.child; c; c = c.sibling) stack.push(c);
      }
    },
  };
  P.start = () => {
    P.mark = performance.now();
    P.renders = {};
    P.total = 0;
    P.commits = 0;
    P.doneAt = null;
  };
  P.collect = () => {
    const lt = P.lt.filter(([s]) => s >= P.mark);
    const ev = P.ev.filter(([, s]) => s >= P.mark);
    const inputs = P.inputs.filter((s) => s >= P.mark);
    const firstInput = inputs.length ? Math.min(...inputs) : null;
    const lastInput = inputs.length ? Math.max(...inputs) : null;
    return {
      inp: ev.length ? Math.max(...ev.map(([, , d]) => d)) : 0,
      keys: ev.filter(([n]) => n === 'keydown' || n === 'input' || n === 'beforeinput').map(([, , d]) => d),
      done: P.doneAt != null && firstInput != null ? P.doneAt - firstInput : null,
      doneAfterLast: P.doneAt != null && lastInput != null ? P.doneAt - lastInput : null,
      ltTotal: lt.reduce((s, [, d]) => s + d, 0),
      ltMax: lt.reduce((m, [, d]) => Math.max(m, d), 0),
      ltCount: lt.length,
      renders: P.total,
      commits: P.commits,
      byName: { ...P.renders },
    };
  };
}

// Components whose render counts are worth printing on their own.
const WATCH = ['Home', 'CardWall', 'PostCardImpl', 'StreamScreen', 'StreamScreenImpl', 'StreamPostImpl', 'DeckScreen', 'DeckScreenImpl', 'DeckCardImpl', 'TagBrowser', 'Cover', 'TagScrollRow'];

const median = (xs) => {
  const v = xs.filter((x) => x != null).sort((a, b) => a - b);
  return v.length ? v[Math.floor((v.length - 1) / 2)] : null;
};

async function measureRun(ctx, n, cpu, selectOnly) {
  const { newPage, base, check } = ctx;
  const page = await newPage();
  page.setDefaultTimeout(180000); // a baseline step can block the page for many seconds
  await page.addInitScript(instrument);
  const cdp = await page.context().newCDPSession(page);
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const wait = (ms) => page.waitForTimeout(ms);
  const visible = (loc) => loc.locator('visible=true').first();
  const res = {};
  // Waits until the page has had no long task for 800 ms, so every step starts idle.
  const idle = () =>
    page.waitForFunction(() => {
      const lt = window.__perf.lt;
      const end = lt.length ? lt[lt.length - 1][0] + lt[lt.length - 1][1] : 0;
      return performance.now() - end > 800;
    }, null, { polling: 200 });
  // One interaction: reset the counters, act, wait for `until` (polled every
  // frame in the page, its time is `done`), let the next second's work run, collect.
  const interact = async (name, act, until, settle = 1000) => {
    await idle();
    await page.evaluate(() => window.__perf.start());
    await act();
    if (until) {
      await page.waitForFunction(
        (src) => {
          const ok = new Function(`return (${src})`)()();
          if (ok && window.__perf.doneAt == null) window.__perf.doneAt = performance.now();
          return ok;
        },
        until.toString(),
        { polling: 'raf', timeout: 180000 },
      );
    }
    await wait(settle);
    res[name] = await page.evaluate(() => window.__perf.collect());
  };

  await page.goto(`${base}?seed=${n}`);
  await page.waitForFunction(() => window.__perf.firstCard != null, null, { timeout: 120000 });
  res.load = await page.evaluate(() => {
    const P = window.__perf;
    const lt = P.lt.filter(([s]) => s < P.firstCard);
    return { firstCard: P.firstCard, ltTotal: lt.reduce((s, [, d]) => s + d, 0), ltMax: lt.reduce((m, [, d]) => Math.max(m, d), 0), commits: P.commits, renders: P.total };
  });
  // Launch refreshes up to 30 cards in the background (text posts); let that settle.
  await page.evaluate(() => window.__perf.start());
  await wait(4000);
  res.launchRefresh = await page.evaluate(() => window.__perf.collect());
  check(`${n} posts: wall shows cards`, (await page.getByText(`${n} 篇`, { exact: false }).count()) > 0);

  if (!selectOnly) {
    // Scroll: 40 wheel steps of 250 px, 40 ms apart (~6000 px/s, a quick fling).
    await page.mouse.move(195, 500);
    await page.evaluate(() => { window.__perf.start(); window.__perf.frames = []; });
    for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 250); await wait(40); }
    await wait(800);
    res.scroll = await page.evaluate(() => {
      const P = window.__perf;
      const f = P.frames;
      P.frames = null;
      return { ...P.collect(), frames: f.length, slowFrames: f.filter((d) => d > 50).length, worstFrame: Math.max(0, ...f) };
    });
    for (let i = 0; i < 15; i++) { await page.mouse.wheel(0, -2000); await wait(60); }
    await wait(800);

    // Search: type a handle fragment one key at a time; results = every card on
    // the wall is by a matching author (includes the 250 ms search debounce).
    await interact('searchOpen', () => visible(page.getByRole('button', { name: '搜尋', exact: true })).click(), () => !!document.querySelector('input[aria-label="搜尋作者或內文"]'));
    await interact(
      'search',
      () => page.getByLabel('搜尋作者或內文').pressSequentially('club1', { delay: 120 }),
      () => {
        const cards = [...document.querySelectorAll('[role="button"][aria-label*="@"]')].filter((e) => e.checkVisibility({ visibilityProperty: true }) && /^(精選，)?@/.test(e.getAttribute('aria-label')));
        return cards.length > 0 && cards.every((e) => e.getAttribute('aria-label').includes('club1'));
      },
    );
    await interact('searchClose', () => visible(page.getByRole('button', { name: '關閉搜尋' })).click(), () => !document.querySelector('input[aria-label="搜尋作者或內文"]'));

    // Tag filter on the wall.
    await interact('filterOn', () => visible(page.getByRole('checkbox', { name: '美食', exact: true })).click(), () => [...document.querySelectorAll('[aria-live]')].some((e) => /\d+ 篇/.test(e.textContent)));
    await interact('filterOff', () => visible(page.getByRole('checkbox', { name: '全部', exact: true })).click(), () => ![...document.querySelectorAll('[aria-live]')].some((e) => /清除篩選/.test(e.textContent)));

    // Long-presses the card labelled `label` until its menu (a row reading `row`)
    // is open. A busy main thread can turn a long press into a tap (the detail
    // page opens): then go back and try again.
    const openMenu = async (label, row) => {
      for (let i = 0; i < 6; i++) {
        const card = visible(page.getByRole('button', { name: label, exact: true }));
        await card.scrollIntoViewIfNeeded();
        await idle();
        const b = await card.boundingBox();
        // Hold longer on each try: Chrome handles the mouseup before a long-press
        // timer that a long task delayed, which turns the press into a tap.
        await page.mouse.move(b.x + b.width / 2, b.y + 20); await page.mouse.down(); await wait([1200, 3000, 8000, 15000, 30000, 60000][i]); await page.mouse.up(); await wait(800);
        if (await page.getByText(row, { exact: true }).locator('visible=true').count()) return;
        await idle();
        if (await page.getByRole('button', { name: '返回' }).locator('visible=true').count()) await visible(page.getByRole('button', { name: '返回' })).click();
        await idle();
      }
      await page.screenshot({ path: path.join(OUT_DIR, 'perf-no-menu.png') });
      throw new Error(`menu with 「${row}」 did not open for ${label}`);
    };
    // 精選 on one card (long-press menu), then back.
    const toggleFeatured = async (name) => {
      // A non-featured card on screen (the list keeps off-screen cells in the DOM).
      const label = await page.evaluate(() => {
        const el = [...document.querySelectorAll('[role="button"][aria-label^="@"]')].find((e) => {
          const r = e.getBoundingClientRect();
          return e.checkVisibility({ visibilityProperty: true }) && r.top > 80 && r.top < 600 && r.height > 180; // not the 回顧 thumbnails
        });
        return el && el.getAttribute('aria-label');
      });
      if (!label) { await page.screenshot({ path: path.join(OUT_DIR, 'perf-no-card.png') }); throw new Error('no card on screen to long-press'); }
      await openMenu(label, '設為精選（放大成整排）');
      await interact(name, () => visible(page.getByText('設為精選（放大成整排）', { exact: true })).click(), () => [...document.querySelectorAll('[aria-live]')].some((e) => e.textContent.includes('已設為精選')));
      await wait(3000); // toast gone
      await openMenu(`精選，${label}`, '取消精選');
      await interact(`${name}Off`, () => visible(page.getByText('取消精選', { exact: true })).click(), () => [...document.querySelectorAll('[aria-live]')].some((e) => e.textContent.includes('已取消精選')));
      await wait(3000);
    };
    await toggleFeatured('featured');

    // Sheet: 設定 open / close.
    await interact('sheetOpen', () => visible(page.getByRole('button', { name: '設定', exact: true })).click(), () => [...document.querySelectorAll('[role="heading"]')].some((e) => e.textContent === '設定'));
    await wait(400);
    await interact('sheetClose', () => visible(page.getByRole('button', { name: '關閉', exact: true })).click(), () => ![...document.querySelectorAll('[role="heading"]')].some((e) => e.textContent === '設定'));

    // 所有標籤 (tag covers) and back.
    await interact('allTags', () => visible(page.getByRole('button', { name: '所有標籤' })).click(), () => [...document.querySelectorAll('[role="heading"]')].some((e) => e.textContent === '所有標籤' && e.checkVisibility({ visibilityProperty: true })));
    await interact('allTagsBack', () => visible(page.getByRole('button', { name: '返回' })).click(), () => [...document.querySelectorAll('[role="heading"]')].some((e) => e.textContent === '收藏' && e.checkVisibility({ visibilityProperty: true })));

    // Tabs: first visits mount 串流 / 翻翻.
    const tabOn = (name) => new Function(`return () => [...document.querySelectorAll('[role="tab"]')].some((e) => e.getAttribute('aria-label') === '${name}' && e.getAttribute('aria-selected') === 'true')`)();
    const tabTo = (key, name) => interact(key, () => page.getByRole('tab', { name }).click(), tabOn(name));
    await tabTo('tabStream', '串流');
    await wait(500);
    await tabTo('tabHome', '收藏');
    await tabTo('tabDeck', '翻翻');
    await wait(500);
    await tabTo('tabHome2', '收藏');
    await tabTo('tabStream2', '串流');
    await tabTo('tabHome3', '收藏');

    // 精選 again, now with 串流 and 翻翻 mounted (hidden) too.
    await toggleFeatured('featuredAllTabs');
  }

  // 批次選取 on the wall: start, 全選, untick one card, end. The selection
  // helpers compare every post with every picked id.
  const heading = () => page.evaluate(() => [...document.querySelectorAll('[role="heading"]')].map((e) => e.textContent).find((x) => /^已選 \d+ 篇$/.test(x)) || '');
  await interact('selectStart', () => visible(page.getByRole('button', { name: '選取多篇' })).click(), () => [...document.querySelectorAll('[role="heading"]')].some((e) => e.textContent === '已選 0 篇'));
  await interact('selectAll', () => visible(page.getByRole('button', { name: /^全選這裡的/ })).click(), () => [...document.querySelectorAll('[role="heading"]')].some((e) => /^已選 [1-9]\d* 篇$/.test(e.textContent)));
  const all = Number((await heading()).match(/\d+/)[0]);
  // A selectable card on screen (scroll the wall a little if the banners fill it).
  let pick = null;
  for (let i = 0; i < 8 && !pick; i++) {
    pick = await page.evaluate(() => {
      const el = [...document.querySelectorAll('[aria-label^="選取："]')].find((e) => {
        const r = e.getBoundingClientRect();
        return e.checkVisibility({ visibilityProperty: true }) && r.top > 80 && r.top < 600 && r.height > 180;
      });
      return el && el.getAttribute('aria-label');
    });
    if (!pick) { await page.mouse.move(195, 500); await page.mouse.wheel(0, 300); await wait(500); }
  }
  if (!pick) throw new Error('no selectable card on screen');
  await interact(
    'selectToggle',
    () => visible(page.getByLabel(pick, { exact: true })).click(),
    new Function(`return () => [...document.querySelectorAll('[role="heading"]')].some((e) => e.textContent === '已選 ${all - 1} 篇')`)(),
  );
  await interact('selectExit', () => visible(page.getByRole('button', { name: '結束選取' })).click(), () => !document.querySelector('[aria-label="批次動作"]'));


  await page.close();
  return res;
}

// Metric rows for the summary: [label, key, field].
const ROWS = [
  ['load: first card (ms)', 'load', 'firstCard'],
  ['load: long tasks (ms)', 'load', 'ltTotal'],
  ['launch refresh (30 cards): long tasks (ms)', 'launchRefresh', 'ltTotal'],
  ['launch refresh: renders', 'launchRefresh', 'renders'],
  ['scroll: long tasks (ms)', 'scroll', 'ltTotal'],
  ['scroll: frames > 50 ms', 'scroll', 'slowFrames'],
  ['scroll: worst frame (ms)', 'scroll', 'worstFrame'],
  ['search: per key, worst input→paint (ms)', 'search', 'keyMax'],
  ['search: results after last key (ms, incl. 250 debounce)', 'search', 'doneAfterLast'],
  ['search: renders while typing', 'search', 'renders'],
  ['search close: input→paint (ms)', 'searchClose', 'inp'],
  ['filter on: input→paint (ms)', 'filterOn', 'inp'],
  ['filter on: renders', 'filterOn', 'renders'],
  ['filter off: input→paint (ms)', 'filterOff', 'inp'],
  ['精選: input→paint (ms)', 'featured', 'inp'],
  ['精選: renders (PostCard)', 'featured', 'renders', 'PostCardImpl'],
  ['精選 (all tabs mounted): input→paint (ms)', 'featuredAllTabs', 'inp'],
  ['精選 (all tabs mounted): renders (PostCard/StreamPost/DeckCard)', 'featuredAllTabs', 'renders', ['PostCardImpl', 'StreamPostImpl', 'DeckCardImpl']],
  ['設定 open: input→paint (ms)', 'sheetOpen', 'inp'],
  ['設定 open: renders', 'sheetOpen', 'renders'],
  ['設定 close: input→paint (ms)', 'sheetClose', 'inp'],
  ['所有標籤 open: input→paint (ms)', 'allTags', 'inp'],
  ['tab → 串流 (first): input→paint (ms)', 'tabStream', 'inp'],
  ['tab → 收藏: input→paint (ms)', 'tabHome', 'inp'],
  ['tab → 翻翻 (first): input→paint (ms)', 'tabDeck', 'inp'],
  ['tab → 串流 (again): input→paint (ms)', 'tabStream2', 'inp'],
  ['tab → 收藏 (again): renders', 'tabHome3', 'renders'],
  ['選取多篇: input→paint (ms)', 'selectStart', 'inp'],
  ['全選: input→paint (ms)', 'selectAll', 'inp'],
  ['全選 → untick one card: input→paint (ms)', 'selectToggle', 'inp'],
  ['全選 → untick one card: long tasks (ms)', 'selectToggle', 'ltTotal'],
  ['結束選取: input→paint (ms)', 'selectExit', 'inp'],
];

function summarize(runs) {
  // Derived per-run fields, then medians across runs.
  for (const r of runs.filter((x) => x.search)) {
    r.search.keyMax = r.search.keys.length ? Math.max(...r.search.keys) : 0;
  }
  const out = {};
  for (const [label, key, field, names] of ROWS) {
    const vals = runs.map((r) => r[key]?.[field]);
    let v = median(vals);
    if (names && v != null) {
      const list = [].concat(names);
      const parts = list.map((nm) => median(runs.map((r) => r[key]?.byName?.[nm] || 0)));
      v = `${v} (${parts.join('/')})`;
    }
    out[label] = typeof v === 'number' ? Math.round(v) : v;
  }
  return out;
}

function printCompare(a, b) {
  const sizes = Object.keys(a.sizes).filter((s) => b.sizes[s]);
  const head = ['Metric', ...sizes.flatMap((s) => [`${s} before`, `${s} after`])];
  console.log(`| ${head.join(' | ')} |`);
  console.log(`| ${head.map((_, i) => (i ? '---:' : '---')).join(' | ')} |`);
  for (const [label] of ROWS) {
    const cells = sizes.flatMap((s) => [a.sizes[s].summary[label], b.sizes[s].summary[label]].map((v) => (v === 0 && /input→paint/.test(label) ? '<16' : v ?? '–')));
    console.log(`| ${label} | ${cells.join(' | ')} |`);
  }
}

const args = parseArgs(process.argv.slice(2));
if (args.compare) {
  // Each side may be several reports (comma-separated), e.g. one per size.
  const load = (list) => list.split(',').map((f) => JSON.parse(fs.readFileSync(path.resolve(f), 'utf8'))).reduce((a, r) => ({ ...r, sizes: { ...a.sizes, ...r.sizes } }), { sizes: {} });
  printCompare(...args.compare.map(load));
  process.exit(0);
}
if (args.build) {
  const r = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--no-minify', '--output-dir', path.relative(APP_DIR, args.web)], { cwd: APP_DIR, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}
// The harness reads positional arguments as webdir/shotdir/scheme; hand it ours via env.
process.argv = process.argv.slice(0, 2);
process.env.E2E_WEB = args.web;
process.env.E2E_TIMEOUT ||= String(60 * 60);

const { run } = require('./lib/harness.cjs');
run(__filename, async (ctx) => {
  const report = { label: args.label, cpu: args.cpu, runs: args.runs, at: new Date().toISOString(), sizes: {} };
  for (const n of args.sizes) {
    const runs = [];
    for (let i = 0; i < args.runs; i++) {
      console.log(`# ${n} posts, run ${i + 1}/${args.runs}`);
      runs.push(await measureRun(ctx, n, args.cpu, args.selectOnly));
    }
    const summary = summarize(runs);
    report.sizes[n] = { summary, runs };
    console.log(`\n## ${n} posts (median of ${args.runs}, CPU ${args.cpu}× slower)`);
    for (const [k, v] of Object.entries(summary)) console.log(`${k.padEnd(70)} ${v}`);
    const top = Object.entries(runs[0].featuredAllTabs?.byName || {}).sort((x, y) => y[1] - x[1]).slice(0, 12);
    console.log(`精選 (all tabs) top renders, run 1: ${top.map(([k, v]) => `${k}×${v}`).join(', ')}`);
    console.log(`watched: ${WATCH.map((w) => `${w}=${runs[0].featuredAllTabs?.byName[w] || 0}`).join(' ')}\n`);
    // Written after every size, so a later size failing keeps the earlier numbers.
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, JSON.stringify(report, null, 1));
    console.log(`wrote ${path.relative(process.cwd(), args.out)}`);
  }
});
