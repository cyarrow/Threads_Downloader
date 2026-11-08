// 底片 theme walkthrough: switch the theme in 設定, then visit (and screenshot)
// every screen in it, and switch back to 雜誌.
const { run } = require('./lib/harness.cjs');
const U = (code, author) => `https://www.threads.com/@${author}/post/${code}`;

run(__filename, async ({ base, newPage, check, step, scheme, out }) => {
  const page = await newPage({ media: true });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/^Failed to load resource/.test(m.text()) && errs.push(m.text().slice(0, 200)));
  page.on('response', (r) => r.status() >= 400 && !r.url().includes('api.github.com') && errs.push('HTTP ' + r.status() + ' ' + r.url()));
  const wait = (ms) => page.waitForTimeout(ms);
  let n = 0;
  const shot = async (name, opts = {}) => { await wait(350); await page.screenshot({ path: `${out}/${scheme}-${String(++n).padStart(2, '0')}-${name}.png`, ...opts }); };
  const has = async (s) => (await page.getByText(s).count()) > 0;
  const closeSheet = async () => { await page.getByRole('button', { name: '關閉' }).last().click(); await wait(400); };
  const addLink = async (url, tag, { keepOpen } = {}) => {
    await page.getByRole('button', { name: '收藏連結', exact: true }).last().click(); await wait(300);
    await page.getByLabel('貼文連結').fill(url);
    await page.getByText('收藏', { exact: true }).last().click(); await wait(1300);
    if (tag) await page.getByRole('checkbox', { name: tag }).last().click();
    if (keepOpen) return;
    if (tag) await page.getByText('完成', { exact: true }).click();
    else await closeSheet();
    await wait(600);
  };
  const openCard = async (re) => { await page.getByRole('button', { name: re }).first().click(); await wait(900); };
  const back = async () => { await page.getByRole('button', { name: '返回' }).first().click(); await wait(500); };

  await page.goto(base); await wait(2500);

  await step('switch theme in settings', async () => {
    await page.getByRole('button', { name: '設定' }).click(); await wait(600);
    check('theme row defaults to 雜誌', (await page.getByRole('radio', { name: '主題：雜誌', checked: true }).count()) === 1);
    await page.getByRole('radio', { name: '主題：底片' }).click(); await wait(500);
    check('底片 selected', (await page.getByRole('radio', { name: '主題：底片', checked: true }).count()) === 1);
    await shot('settings');
    await closeSheet();
  });
  await step('empty state', async () => {
    check('empty state', await has('還沒有收藏'));
    await shot('empty');
  });
  await step('add link sheet', async () => {
    await page.getByRole('button', { name: '收藏連結', exact: true }).last().click(); await wait(400);
    await page.getByLabel('貼文連結').fill('not a link');
    await page.getByText('收藏', { exact: true }).last().click(); await wait(300);
    await shot('add-link-error');
    await closeSheet();
  });
  await step('save posts', async () => {
    await addLink(U('IMG1', 'jp.travel'), '旅遊', { keepOpen: true });
    await shot('save-sheet');
    await page.getByText('完成', { exact: true }).click(); await wait(300);
    await shot('toast');
    await wait(400);
    await addLink(U('CAR1', 'tainan.eats'), '美食');
    await addLink(U('TXT1', 'quiet.notes'), '生活');
    await addLink(U('VID1', 'starlight.daily'), '追星');
    await addLink(U('MEME1', 'meme.lab'), null);
    await addLink(U('SEA1', 'aurora.band'), '追星');
    await addLink(U('GONE1', 'old.post'), null);
    await addLink(U('IDOL1', 'fan.board'), '追星');
    check('cards saved', (await page.getByRole('button', { name: /@tainan\.eats/ }).count()) > 0);
  });
  await step('wall', async () => {
    await page.mouse.move(195, 600);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('wall-top');
    await page.mouse.wheel(0, 700); await wait(500);
    await shot('wall-scrolled');
    await page.mouse.wheel(0, 900); await wait(500);
    await shot('wall-scrolled-2');
    await page.mouse.wheel(0, -3000); await wait(400);
  });
  await step('filter + empty filter', async () => {
    await page.getByRole('checkbox', { name: '追星' }).first().click(); await wait(400);
    await shot('filter');
    await page.getByRole('checkbox', { name: '追星' }).first().click(); await wait(200);
    await page.getByRole('checkbox', { name: '梗圖' }).first().click(); await wait(400);
    check('empty filter', await has('找不到符合的貼文'));
    await shot('empty-filter');
    await page.getByText('清除篩選').first().click(); await wait(400);
  });
  await step('detail: carousel + feature', async () => {
    await openCard(/@tainan\.eats/);
    await shot('detail-carousel');
    await page.getByText('設為精選', { exact: true }).click(); await wait(300);
    await page.getByText('下載到相簿', { exact: true }).click(); await wait(900);
    if (await has('下載哪幾項')) { await shot('download-picker'); await closeSheet(); }
    await back();
    await shot('wall-featured');
  });
  await step('detail: image', async () => { await openCard(/@jp\.travel/); await shot('detail-image'); await back(); });
  await step('detail: text', async () => {
    await openCard(/@quiet\.notes/);
    await shot('detail-text');
    await back();
  });
  await step('detail: video', async () => {
    await openCard(/@starlight\.daily/);
    await shot('detail-video');
    await page.getByRole('button', { name: '播放影片' }).first().click(); await wait(1200);
    await shot('detail-video-playing');
    await back();
  });
  await step('long-press menu', async () => {
    const card = page.getByRole('button', { name: /@quiet\.notes/ }).first();
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 20); await page.mouse.down(); await wait(700); await page.mouse.up(); await wait(400);
    await shot('menu');
    await closeSheet();
  });
  await step('quick panel (share)', async () => {
    await page.evaluate((u) => window.__shareToApp(u), U('VID2', 'starlight.daily')); await wait(2200);
    check('quick panel', await has('其他標籤…'));
    await shot('quick-panel');
    await page.getByText('先存到未分類').click(); await wait(800);
  });
  await step('edit tags sheet', async () => {
    await openCard(/@meme\.lab/);
    await page.getByText('編輯標籤').first().click(); await wait(600);
    await page.getByRole('button', { name: '新增標籤' }).first().click(); await wait(300);
    await shot('tag-picker-new-tag');
    await closeSheet();
    await back();
  });
  await step('triage', async () => {
    // Merged tabs: 整理未分類 opens 翻翻 in 未分類 mode (was a separate triage screen).
    await page.getByText(/整理未分類/).first().click(); await wait(800);
    check('triage opens', (await has('套用建議')) || (await has('自選標籤')));
    await shot('triage');
    await page.getByRole('button', { name: '跳過', exact: true }).click(); await wait(600);
    await shot('triage-2');
    for (let i = 0; i < 4; i++) { await page.getByRole('button', { name: '跳過', exact: true }).click({ timeout: 2000 }).catch(() => {}); await wait(500); }
    await shot('triage-done');
    await page.getByRole('tab', { name: '收藏' }).click(); await wait(500);
  });
  await step('tag manager', async () => {
    await page.getByRole('button', { name: '設定' }).click(); await wait(500);
    await page.getByText('標籤管理').click(); await wait(700);
    await shot('tag-manager');
    await page.getByRole('button', { name: /^追星/ }).last().click(); await wait(500);
    await shot('tag-edit-sheet');
    await closeSheet();
    await back();
  });
  await step('switch back to 雜誌', async () => {
    await page.getByRole('button', { name: '設定' }).click(); await wait(500);
    await page.getByRole('radio', { name: '主題：雜誌' }).click(); await wait(400);
    check('雜誌 selected again', (await page.getByRole('radio', { name: '主題：雜誌', checked: true }).count()) === 1);
    await closeSheet();
    await shot('wall-editorial');
  });
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  check('no horizontal overflow', w <= 390, String(w));
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
}, { autoplay: true });
