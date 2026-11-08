// Fetch-health banner against the web export (fetcher.web.js stand-in):
// retry-all, deleted/private vs "Threads 可能改版了" (parse), and the login banner.
const { run } = require('./lib/harness.cjs');

run(__filename, async ({ base, newPage, check, step, scheme, out }) => {
  const page = await newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  const wait = (ms) => page.waitForTimeout(ms);
  const shot = async (name) => { await wait(400); await page.screenshot({ path: `${out}/health-${scheme}-${name}.png` }); };
  const text = async (s) => (await page.getByText(s).count()) > 0;
  const banner = page.getByTestId('fetch-health');
  const addLink = async (url) => {
    await page.getByRole('button', { name: '收藏連結', exact: true }).last().click(); await wait(300);
    await page.getByLabel('貼文連結').fill(url);
    await page.getByText('收藏', { exact: true }).last().click(); await wait(200);
    await page.getByRole('button', { name: '關閉' }).last().click().catch(() => {}); await wait(300);
  };

  await page.goto(base); await wait(2500);
  await step('retry-all banner', async () => {
    await addLink('https://www.threads.com/@jp.travel/post/IMG1'); await wait(900);
    check('one good card, no banner', (await banner.count()) === 0);
    await addLink('https://www.threads.com/@cafe.hop/post/FLAKY1'); await wait(900);
    check('one failure → no banner yet', (await banner.count()) === 0 && await text('讀取失敗'));
    await addLink('https://www.threads.com/@tainan.eats/post/FLAKY2'); await wait(900);
    check('two failures → banner', (await banner.count()) === 1 && await text('2 篇讀取失敗'));
    await shot('1-failed');
    await page.getByRole('button', { name: '全部重試 2 篇' }).click(); await wait(200);
    check('retry-all puts cards back to loading', await text('讀取中…'));
    await wait(1800);
    check('banner gone after retry-all succeeds', (await banner.count()) === 0);
    check('retried cards loaded', (await page.getByRole('button', { name: /@cafe\.hop/ }).count()) > 0 && (await page.getByRole('button', { name: /@tainan\.eats/ }).count()) > 0);
    await shot('2-after-retry');
  });
  await step('deleted vs parse', async () => {
    await addLink('https://www.threads.com/@gone.a/post/GONE1'); await wait(900);
    check('single empty page reads as deleted/private', await text('可能已刪除或不公開') && (await banner.count()) === 0);
    await shot('3-one-deleted');
    await addLink('https://www.threads.com/@gone.b/post/GONE2'); await wait(900);
    check('second → generic banner, still not parse', await text('2 篇讀取失敗') && !(await text(/可能改版/)));
    await addLink('https://www.threads.com/@gone.c/post/GONE3'); await wait(900);
    check('third in a row, three authors → parse banner', await text('Threads 可能改版了，暫時讀不到貼文內容。') && await text('已收藏的連結都保留著，之後可以全部重試。'));
    check('earlier cards relabelled too', (await page.getByText('暫時讀不到內容').count()) === 3 && (await page.getByText('可能已刪除或不公開').count()) === 0);
    await shot('4-parse');
    await page.getByRole('button', { name: '全部重試 3 篇' }).click(); await wait(1800);
    check('parse retry-all re-queues and keeps banner (still broken)', (await page.getByText('暫時讀不到內容').count()) === 3);
  });
  await step('login banner', async () => {
    await addLink('https://www.threads.com/@night.owl/post/LOGIN1'); await wait(1000);
    // The login sheet opens on its own; cancel it, then use the banner.
    if (await text('登入只會保存在這支手機上')) { await page.getByText('取消', { exact: true }).last().click(); await wait(500); }
    await page.getByRole('button', { name: '關閉' }).last().click().catch(() => {}); await wait(500);
    check('login banner shown', await text('需要重新登入 Threads 才能讀取 1 篇'));
    await shot('5-login');
    await page.getByRole('button', { name: '登入 Threads' }).click(); await wait(600);
    check('banner 登入 opens login sheet', await text('登入只會保存在這支手機上'));
    await page.getByText('取消', { exact: true }).last().click(); await wait(500);
    await page.getByRole('button', { name: '先不要提醒' }).click(); await wait(300);
    check('dismiss hides banner', (await banner.count()) === 0);
  });
  check('no page errors', errs.filter((e) => !/releases\/latest|status of 404|rate limit/.test(e)).length === 0, errs.slice(0, 3).join(' | '));
});
