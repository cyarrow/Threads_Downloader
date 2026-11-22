// Download picker with many items: every tile shows its preview, the grid
// scrolls inside the sheet, and the download button stays on screen.
const { run } = require('./lib/harness.cjs');

run(__filename, async ({ base, newPage, check, step, scheme, out }) => {
  const page = await newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  const wait = (ms) => page.waitForTimeout(ms);
  await page.goto(base);
  await wait(2500);
  await step('open picker for a 12-item post', async () => {
    await page.getByRole('button', { name: '收藏連結', exact: true }).last().click();
    await wait(300);
    await page.getByLabel('貼文連結').fill('https://www.threads.com/@tainan.eats/post/CARMANY1');
    await page.getByText('收藏', { exact: true }).last().click();
    await wait(1400);
    await page.getByRole('switch').first().click();
    await page.getByText('完成', { exact: true }).click();
    await wait(1200);
    check('picker shows 12 items', (await page.getByText('已選 12/12').count()) > 0);
    await page.screenshot({ path: `${out}/${scheme}-01-picker-top.png` });
  });
  await step('button and tiles fit the screen', async () => {
    const vh = page.viewportSize().height;
    const btn = await page.getByRole('button', { name: /下載 12 項/ }).boundingBox();
    check('download button fully on screen', !!btn && btn.y >= 0 && btn.y + btn.height <= vh, btn ? `y=${Math.round(btn.y)} h=${Math.round(btn.height)} vh=${vh}` : 'not found');
    const tiles = page.getByRole('checkbox', { name: /^第 \d+ 項/ });
    check('all 12 tiles rendered', (await tiles.count()) === 12);
    const imgs = await page.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.closest('[role="checkbox"]')).map((i) => i.naturalWidth > 0));
    check('every tile has a loaded preview', imgs.length === 12 && imgs.every(Boolean), `${imgs.filter(Boolean).length}/${imgs.length}`);
    await tiles.last().scrollIntoViewIfNeeded();
    await wait(300);
    const last = await tiles.last().boundingBox();
    const btn2 = await page.getByRole('button', { name: /下載 12 項/ }).boundingBox();
    check('last tile reachable by scrolling, above the button', !!last && !!btn2 && last.y + last.height <= btn2.y + 1, last && btn2 ? `tile bottom ${Math.round(last.y + last.height)} button top ${Math.round(btn2.y)}` : '');
    await page.screenshot({ path: `${out}/${scheme}-02-picker-scrolled.png` });
  });
  check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
});
