// Core flows: first run, saving (image / carousel + new tag + download / text /
// login failure / duplicate), filter + search, post detail + 精選, long-press
// delete + undo, same-author suggestion, 未分類 triage, tag manager, backup
// export + import.
const { run } = require('./lib/harness.cjs');

run(__filename, async ({ base, newPage, check, step, scheme, out }) => {
  const page = await newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('response', (r) => r.status() >= 400 && errs.push('HTTP ' + r.status() + ' ' + r.url())); page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  const wait = (ms) => page.waitForTimeout(ms);
  let n = 0; const shot = async (name) => { await wait(400); await page.screenshot({ path: `${out}/${scheme}-${String(++n).padStart(2, '0')}-${name}.png` }); };
  const text = async (s) => (await page.getByText(s).count()) > 0;
  const addLink = async (url) => {
    await page.getByRole('button', { name: '收藏連結', exact: true }).last().click(); await wait(300);
    await page.getByLabel('貼文連結').fill(url);
    await page.getByText('收藏', { exact: true }).last().click(); await wait(200);
  };

  await page.goto(base); await wait(2500);
  await step('first run', async () => {
    check('empty state shown', await text('還沒有收藏'));
    check('default tags seeded', (await page.getByRole('checkbox', { name: '追星' }).count()) > 0 && (await page.getByRole('checkbox', { name: '梗圖' }).count()) > 0);
    await shot('empty');
  });
  await step('save image post', async () => {
    await addLink('https://www.threads.com/@jp.travel/post/IMG1');
    check('save sheet opens as 已收藏', await text('已收藏'));
    await shot('sheet-loading'); await wait(1200);
    check('preview filled after fetch', await text('@jp.travel'));
    await page.getByRole('checkbox', { name: '旅遊' }).last().click();
    await shot('sheet-tagged');
    await page.getByText('完成', { exact: true }).click(); await wait(500);
    check('toast names the tag', await text('已收藏到 旅遊'));
    await shot('wall-one-card');
  });
  await step('save carousel + new tag + download', async () => {
    await addLink('https://www.threads.com/@tainan.eats/post/CAR1'); await wait(1200);
    await page.getByRole('switch').first().click();
    await page.getByRole('button', { name: '新增標籤' }).first().click(); await wait(200);
    await page.getByLabel('新標籤名稱').fill('早午餐');
    await page.getByRole('button', { name: '新增', exact: true }).click(); await wait(300);
    check('new tag auto-selected', (await page.getByRole('checkbox', { name: '早午餐', checked: true }).count()) > 0);
    await shot('sheet-new-tag');
    await page.getByText('完成', { exact: true }).click(); await wait(900);
    check('download picker for carousel', await text('下載哪幾項'));
    await shot('download-picker');
    await page.getByText('下載 3 項').click(); await wait(2200);
    check('download finished toast', await text('已存到相簿'));
    await shot('after-download');
  });
  await step('text post closed with X', async () => {
    await addLink('https://www.threads.com/@quiet.notes/post/TXT1'); await wait(1000);
    await page.getByRole('button', { name: '關閉' }).last().click(); await wait(500);
    check('closing keeps it in 未分類', await text('已收藏到「未分類」'));
  });
  await step('login failure', async () => {
    await addLink('https://www.threads.com/@night.owl/post/LOGIN1'); await wait(1300);
    check('login page opens', await text('登入 Threads'));
    await page.getByText('取消', { exact: true }).last().click(); await wait(300);
    await page.getByRole('button', { name: '關閉' }).last().click().catch(() => {}); await wait(400);
    check('card says login needed', await text('需要登入 Threads'));
    await shot('login-failed-card');
  });
  await step('duplicate save', async () => {
    await addLink('https://www.threads.com/@jp.travel/post/IMG1'); await wait(400);
    check('duplicate opens edit sheet', await text('編輯標籤') && await text('這篇已經收藏過'));
    await page.getByRole('button', { name: '關閉' }).last().click(); await wait(400);
  });
  await step('filter + search', async () => {
    await page.getByRole('checkbox', { name: '旅遊' }).first().click(); await wait(400);
    check('filter count 1', await text('1 篇'));
    await shot('filter');
    await page.getByText('清除篩選').first().click(); await wait(300);
    await page.getByRole('button', { name: '搜尋' }).click();
    await page.getByLabel('搜尋作者或內文').fill('富士山'); await wait(600);
    check('search finds the post', (await page.getByRole('button', { name: /jp\.travel/ }).count()) > 0 && (await page.getByRole('button', { name: /tainan\.eats/ }).count()) === 0);
    await page.getByRole('button', { name: '關閉搜尋' }).click(); await wait(400);
  });
  await step('detail + feature', async () => {
    await page.getByRole('button', { name: /tainan\.eats/ }).first().click(); await wait(700);
    check('detail shows caption', await text('蛋餅皮是現擀的'));
    await shot('detail');
    await page.getByText('設為精選', { exact: true }).click(); await wait(300);
    await page.getByRole('button', { name: '返回' }).click(); await wait(500);
    check('card is featured', (await page.getByRole('button', { name: /^精選，@tainan\.eats/ }).count()) > 0);
    await shot('featured-wall');
  });
  await step('long press delete + undo', async () => {
    const card = page.getByRole('button', { name: /@quiet\.notes/ }).first();
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 20); await page.mouse.down(); await wait(700); await page.mouse.up(); await wait(400);
    await shot('menu');
    await page.getByText('刪除收藏').click(); await wait(400);
    check('deleted', (await page.getByRole('button', { name: /@quiet\.notes/ }).count()) === 0);
    await page.getByText('復原').click(); await wait(500);
    check('undo restores card', (await page.getByRole('button', { name: /@quiet\.notes/ }).count()) > 0);
    await shot('after-undo');
  });

  await step('phase2: author suggestion', async () => {
    await addLink('https://www.threads.com/@jp.travel/post/IMG2'); await wait(1300);
    check('suggestion shown with reason', await text('同作者有 1 篇用過'));
    await shot('p2-suggestion');
    await page.getByText('完成', { exact: true }).click(); await wait(500);
  });
  await step('phase2: triage', async () => {
    // Tabs build: 整理未分類 opens the 翻翻 deck in its 未分類 mode (略過 = 跳過).
    await page.getByText(/整理未分類/).first().click(); await wait(700);
    check('triage opens', (await page.getByRole('tab', { name: '翻翻' }).getAttribute('aria-selected')) === 'true' && await text(/右滑加上「|沒有建議的標籤/) && await text(/剩 \d+ 張/));
    await shot('p2-triage');
    for (let i = 0; i < 3; i++) { const skip = page.getByRole('button', { name: '跳過' }); if (await skip.isEnabled()) { await skip.click(); await wait(600); } }
    check('triage finishes', await text('未分類都整理好了'));
    await shot('p2-triage-done');
    await page.getByRole('tab', { name: '收藏' }).click(); await wait(500);
  });
  await step('phase2: tag manager', async () => {
    await page.getByRole('button', { name: '設定' }).click(); await wait(500);
    await page.getByText('標籤管理').click(); await wait(700);
    await shot('p2-tag-manager');
    await page.getByRole('button', { name: /^梗圖/ }).last().click(); await wait(500); await shot('p2-edit-sheet');
    await page.getByRole('textbox').last().fill('迷因');
    await page.getByText('儲存', { exact: true }).click(); await wait(400);
    check('rename applied', await text('迷因'));
    await page.getByRole('button', { name: /^早午餐/ }).last().click(); await wait(500);
    await page.getByText('合併到…').click(); await wait(300);
    await shot('p2-merge');
    await page.getByText('美食', { exact: true }).last().click(); await wait(400);
    check('merged tag gone', (await page.getByText('早午餐', { exact: true }).count()) === 0);
    await page.getByRole('button', { name: /^迷因/ }).last().click(); await wait(400);
    await page.getByText('刪除', { exact: true }).click(); await wait(300);
    check('delete asks for confirmation', await text(/貼文本身不會被刪除/));
    await page.getByText('確定刪除').click(); await wait(400);
    check('deleted tag gone', (await page.getByText('迷因', { exact: true }).count()) === 0);
    await page.getByRole('button', { name: '返回' }).last().click(); await wait(500);
  });
  await step('phase3: export + import', async () => {
    await page.getByRole('button', { name: '設定' }).click(); await wait(500);
    await page.getByText('匯出備份').click(); await wait(600);
    check('export toast', await text(/已匯出 \d+ 篇收藏/));
    await page.getByRole('button', { name: '設定' }).click(); await wait(500);
    await page.getByText('匯入備份').click(); await wait(800);
    check('import skips existing', await text(/匯入 0 篇，\d+ 篇已經有了/));
    await shot('p3-import');
  });
  check('no page errors', errs.filter((e) => !/releases\/latest|status of 404|rate limit exceeded/.test(e)).length === 0, errs.filter((e) => !/releases\/latest|status of 404|rate limit exceeded/.test(e)).slice(0, 3).join(' | '));
});
