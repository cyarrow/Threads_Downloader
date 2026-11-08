// Quick save panel (快速面板) on the web build. Shares are simulated with the
// web-only stand-in (?share=… / window.__shareToApp).
const { run } = require('./lib/harness.cjs');
const U = (code, author = 'starlight.daily') => `https://www.threads.com/@${author}/post/${code}`;

run(__filename, async ({ base, newPage, check, step, scheme, out }) => {
  const open = async (opts = {}) => {
    const page = await newPage();
    page.errs = []; page.on('pageerror', (e) => page.errs.push(e.message));
    if (opts.slowFetch) {
      // The web mock "reads" a post in 600 ms; stretch only that timer to 3 s so the
      // post is still loading when the panel's 1.5 s settle time runs out.
      await page.addInitScript(() => {
        const st = window.setTimeout;
        window.setTimeout = (fn, ms, ...a) => st(fn, ms === 600 ? 3000 : ms, ...a);
      });
    }
    return page;
  };
  let n = 0;
  const shot = (page, name) => page.screenshot({ path: `${out}/${scheme}-q${String(++n).padStart(2, '0')}-${name}.png` });
  const has = async (page, s) => (await page.getByText(s).count()) > 0;
  const rows = (page) => page.getByRole('button', { name: /^存到「/ });
  const rowInfo = async (page) => {
    const list = rows(page); const k = await list.count(); const info = [];
    for (let i = 0; i < k; i++) {
      const el = list.nth(i);
      info.push({ name: (await el.getAttribute('aria-label')), y: Math.round((await el.boundingBox()).y) });
    }
    return info;
  };
  const share = async (page, url) => { await page.evaluate((u) => window.__shareToApp(u), url); };

  // --- 1. First share: skeleton while loading, then three locked rows -------------
  const page = await open();
  await page.goto(`${base}?share=${encodeURIComponent(U('VID1'))}`);
  await step('first share opens quick panel', async () => {
    await page.getByText('其他標籤…').waitFor({ timeout: 5000 });
    check('quick panel shown for a share', await has(page, '其他標籤…') && await has(page, '先存到未分類'));
    check('no 完成 button in compact mode', (await page.getByText('完成', { exact: true }).count()) === 0);
    check('skeleton rows while the post loads', (await page.getByLabel('正在找適合的標籤').count()) > 0);
    await page.waitForTimeout(1200);
    const info = await rowInfo(page);
    check('three tag rows after load', info.length === 3, JSON.stringify(info.map((r) => r.name)));
    check('keyword suggestion leads', /^存到「追星」，內文提到「安可」/.test(info[0]?.name || ''), info[0]?.name);
    await shot(page, 'first-share');
    const boxes = await Promise.all([0, 1, 2].map(async (i) => (await rows(page).nth(i).boundingBox()).height));
    check('rows are ≥ 56px tall', boxes.every((h) => h >= 56), boxes.join(','));
    await page.waitForTimeout(1500);
    const later = await rowInfo(page);
    check('rows unchanged after settle time', JSON.stringify(later) === JSON.stringify(info));
    // Hold the first row to show the ink press state.
    const b = await rows(page).first().boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(150);
    await shot(page, 'row-pressed');
    await page.mouse.up(); await page.waitForTimeout(700);
    check('one tap closes the sheet', !(await has(page, '其他標籤…')));
    check('card saved with that tag', (await page.getByRole('button', { name: /@starlight\.daily/ }).first().getAttribute('aria-label') || '').includes('追星'));
  });

  // --- 2. Same author again: author + recent reasons; 其他標籤… opens full picker ---
  await step('second share + expand', async () => {
    await share(page, U('IDOL1')); await page.waitForTimeout(1400);
    const info = await rowInfo(page);
    check('same-author reason shown', info.some((r) => /同作者/.test(r.name)), JSON.stringify(info.map((r) => r.name)));
    await shot(page, 'same-author');
    await page.getByText('其他標籤…').click(); await page.waitForTimeout(500);
    check('full picker after 其他標籤…', await has(page, '全部標籤') && (await page.getByText('完成', { exact: true }).count()) === 1);
    await shot(page, 'expanded');
    await page.getByRole('checkbox', { name: '生活' }).last().click();
    await page.getByText('完成', { exact: true }).click(); await page.waitForTimeout(600);
    const label = await page.getByRole('button', { name: /應援手幅/ }).first().getAttribute('aria-label');
    check('full picker saves the picked tag', (label || '').includes('生活'), label);
  });

  // --- 3. 先存到未分類 -------------------------------------------------------------
  await step('save unsorted', async () => {
    await share(page, U('MEME1', 'meme.lab')); await page.waitForTimeout(1300);
    await page.getByText('先存到未分類').click(); await page.waitForTimeout(600);
    check('先存到未分類 closes the sheet', !(await has(page, '其他標籤…')));
    check('card left untagged (整理未分類 count)', await has(page, '整理未分類（1 篇）'));
  });

  // --- 4. 同時下載 still works from the compact panel -----------------------------
  await step('download from quick panel', async () => {
    await share(page, U('CAR1', 'tainan.eats')); await page.waitForTimeout(1300);
    await page.getByRole('switch', { name: /同時下載到相簿/ }).click(); await page.waitForTimeout(200);
    await shot(page, 'download-on');
    await rows(page).first().click(); await page.waitForTimeout(900);
    check('download picker after a quick tap', await has(page, '下載哪幾項'));
    await page.getByText('下載 3 項').click(); await page.waitForTimeout(2200);
  });

  // --- 5. Setting off → full sheet for shares --------------------------------------
  await step('setting', async () => {
    await page.getByRole('button', { name: '設定' }).click(); await page.waitForTimeout(600);
    const sw = page.getByRole('switch', { name: '分享時用快速面板' });
    check('setting defaults to on', (await sw.getAttribute('aria-checked')) === 'true');
    await shot(page, 'settings-on');
    await sw.click(); await page.waitForTimeout(300);
    check('setting turns off', (await sw.getAttribute('aria-checked')) === 'false');
    await shot(page, 'settings-off');
    await page.getByRole('button', { name: '關閉' }).last().click(); await page.waitForTimeout(500);
    await share(page, U('SEA1', 'mv.news')); await page.waitForTimeout(1000);
    check('share opens the full sheet when off', !(await has(page, '其他標籤…')) && (await page.getByText('完成', { exact: true }).count()) === 1);
    await page.getByText('完成', { exact: true }).click(); await page.waitForTimeout(500);
  });
  check('no page errors (main run)', page.errs.length === 0, page.errs.slice(0, 2).join(' | '));
  await page.close();

  // --- 6. Slow post: rows lock on recents, late suggestions don't move them --------
  const slow = await open({ slowFetch: true });
  await slow.goto(base); await slow.waitForTimeout(1500);
  await step('slow fetch locks rows', async () => {
    // History: one 旅遊 post by jp.travel, then 梗圖 as the latest recent tag.
    await share(slow, U('IMG1', 'jp.travel')); await slow.waitForTimeout(3300);
    await slow.getByText('其他標籤…').click(); await slow.waitForTimeout(300);
    await slow.getByRole('checkbox', { name: '旅遊' }).last().click();
    await slow.getByText('完成', { exact: true }).click(); await slow.waitForTimeout(500);
    await share(slow, U('MEME1', 'meme.lab')); await slow.waitForTimeout(400);
    await slow.getByText('其他標籤…').click(); await slow.waitForTimeout(300);
    await slow.getByRole('checkbox', { name: '梗圖' }).last().click();
    await slow.getByText('完成', { exact: true }).click(); await slow.waitForTimeout(3200);
    // Same author as the 旅遊 post, but its details take 3 s to arrive.
    await share(slow, U('IMG2', 'jp.travel')); await slow.waitForTimeout(800);
    check('skeleton rows while waiting (slow)', (await slow.getByLabel('正在找適合的標籤').count()) > 0);
    await shot(slow, 'loading-skeleton');
    await slow.waitForTimeout(1000);
    const early = await rowInfo(slow);
    await shot(slow, 'slow-locked');
    check('rows shown after settle time while still loading', early.length === 3 && await has(slow, '讀取中…'), JSON.stringify(early.map((r) => r.name)));
    await slow.waitForTimeout(2000);
    const late = await rowInfo(slow);
    await shot(slow, 'slow-after-load');
    check('post loaded', await has(slow, '@jp.travel'));
    check('rows identical after suggestions arrive', JSON.stringify(early) === JSON.stringify(late), JSON.stringify(late.map((r) => r.name)));
    await slow.getByText('其他標籤…').click(); await slow.waitForTimeout(400);
    check('late suggestion offered in the full picker', await has(slow, /同作者有 1 篇用過/));
    await shot(slow, 'slow-expanded');
    await slow.getByRole('button', { name: '關閉' }).last().click(); await slow.waitForTimeout(400);
  });
  check('no page errors (slow run)', slow.errs.length === 0, slow.errs.slice(0, 2).join(' | '));
});
