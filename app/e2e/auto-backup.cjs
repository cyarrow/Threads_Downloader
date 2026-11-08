// 自動備份 settings + backup reminder (web build, fake folder in memory):
// choose folder, keep newest 5, folder lost, 30-day reminder, background backup.
const { run } = require('./lib/harness.cjs');
const DAY = 24 * 3600 * 1000;
const T0 = new Date(2026, 10, 2, 14, 2, 0).getTime();

run(__filename, async ({ base, newPage, check, step, scheme, out }) => {
  const page = await newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  page.on('response', (r) => r.status() >= 400 && errs.push('HTTP ' + r.status() + ' ' + r.url()));
  const realErrs = () => errs.filter((e) => !/releases\/latest|status of 404|rate limit exceeded/.test(e));
  const wait = (ms) => page.waitForTimeout(ms);
  let n = 0;
  const shot = async (name) => { await wait(400); const f = `${out}/${scheme}-${String(++n).padStart(2, '0')}-${name}.png`; await page.screenshot({ path: f }); };
  const text = async (s) => (await page.getByText(s).count()) > 0;
  const files = () => page.evaluate(() => window.__fakeBackupFolder.files());
  const openSettings = async () => { await page.getByRole('button', { name: '設定' }).click(); await wait(600); };
  const closeSheet = async () => { await page.getByRole('button', { name: '關閉', exact: true }).last().click(); await wait(500); };
  const visibility = async (state) => {
    await page.evaluate((s) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => s });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => s === 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    }, state);
    await wait(600);
  };
  const addLink = async (url) => {
    await page.getByRole('button', { name: '收藏連結', exact: true }).last().click(); await wait(300);
    await page.getByLabel('貼文連結').fill(url);
    await page.getByText('收藏', { exact: true }).last().click(); await wait(900);
    await page.getByText('完成', { exact: true }).click(); await wait(400);
  };

  await page.clock.install({ time: T0 - 40 * DAY });
  await page.goto(base); await wait(3000);

  await step('off state', async () => {
    await openSettings();
    check('auto backup block shown, off', (await text('自動備份')) && (await text('每天把收藏存一份到你選的資料夾，例如雲端硬碟同步的資料夾')));
    check('existing rows still there', (await text('匯出備份')) && (await text('匯入備份')));
    await shot('settings-off');
  });
  await step('choose folder backs up right away', async () => {
    await page.getByRole('button', { name: '選擇資料夾' }).click(); await wait(800);
    check('status line shows today + folder', await text(/^上次備份：今天 \d\d:\d\d · 雲端硬碟\/Threads備份$/));
    check('one file written', (await files()).length === 1, JSON.stringify(await files()));
    check('file name pattern', /^threads-collection-\d{8}-\d{6}\.json$/.test((await files())[0]));
    await shot('settings-on');
  });
  await step('立即備份 keeps newest 5', async () => {
    for (let i = 0; i < 6; i++) { await page.getByRole('button', { name: '立即備份' }).click(); await wait(1100); }
    const f = await files();
    check('pruned to 5 files', f.length === 5, f.join(', '));
    check('inline 已備份', await text('已備份'));
  });
  await step('folder lost', async () => {
    await page.evaluate(() => window.__fakeBackupFolder.revoke());
    await page.getByRole('button', { name: '立即備份' }).click(); await wait(800);
    check('error shown in settings', await text('自動備份失敗：找不到資料夾，請重新選擇'));
    check('button becomes 選擇資料夾', (await page.getByRole('button', { name: '選擇資料夾' }).count()) === 1);
    await shot('settings-folder-lost');
    await closeSheet();
    check('no nagging on the wall', !(await page.getByText(/自動備份失敗/).isVisible().catch(() => false)));
    await openSettings();
    await page.getByRole('button', { name: '選擇資料夾' }).click(); await wait(800);
    check('re-pick recovers', await text(/^上次備份：今天/));
    await page.getByRole('button', { name: '關閉自動備份' }).click(); await wait(500);
    check('turned off', await text('每天把收藏存一份到你選的資料夾，例如雲端硬碟同步的資料夾'));
    await closeSheet();
  });
  await step('reminder after 30 days with ≥20 posts', async () => {
    for (let i = 1; i <= 20; i++) await addLink(`https://www.threads.com/@jp.travel/post/IMG${100 + i}`);
    check('20 posts saved', await text(/20 篇/));
    check('no wall note yet (backup is recent)', !(await text('收藏超過 30 天沒備份')));
    await page.clock.setSystemTime(T0);
    await visibility('hidden');
    await visibility('visible');
    check('wall note shown', await text('收藏超過 30 天沒備份'));
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('wall-note');
    await openSettings();
    check('settings reminder line', await text('已經超過 30 天沒有備份了'));
    await shot('settings-reminder');
    await closeSheet();
    await page.getByRole('button', { name: '關閉備份提醒' }).click(); await wait(400);
    check('wall note dismissed', !(await text('收藏超過 30 天沒備份')));
    await page.clock.setSystemTime(T0 + 3 * DAY);
    await visibility('hidden');
    await visibility('visible');
    check('wall note not again within 30 days', !(await text('收藏超過 30 天沒備份')));
  });
  await step('automatic backup when going to background', async () => {
    await openSettings();
    await page.getByRole('button', { name: '選擇資料夾' }).click(); await wait(800);
    await closeSheet();
    const before = (await files()).length;
    await page.clock.setSystemTime(T0 + 4 * DAY);
    await visibility('hidden'); await visibility('visible');
    check('unchanged collection: no new backup next day', (await files()).length === before);
    await addLink('https://www.threads.com/@quiet.notes/post/TXT77');
    await visibility('hidden'); await visibility('visible');
    const names1 = await files();
    check('changed: background backup written', names1.some((x) => x.startsWith('threads-collection-20261106-')), names1.join(', '));
    await addLink('https://www.threads.com/@quiet.notes/post/TXT78');
    await visibility('hidden'); await visibility('visible');
    check('same day: no second automatic backup', JSON.stringify(await files()) === JSON.stringify(names1));
    check('still at most 5 files', (await files()).length <= 5);
  });
  check('no page errors', realErrs().length === 0, realErrs().slice(0, 3).join(' | '));
});
