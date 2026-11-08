// 批次選取 (multi-select on the wall, author and tag pages: tri-state 加標籤,
// 精選, 下載, 刪除 + 復原, Android back) and the 作者頁 (from detail, 串流, 翻翻).
// Theme arg / E2E_THEME=film switches to 底片 first.
const { run } = require('./lib/harness.cjs');

run(__filename, async ({ base, newPage, check, step, scheme, theme, out }) => {
  const W = Number(process.env.W) || 390, H = Number(process.env.H) || 844;
  const page = await newPage({ viewport: { width: W, height: H } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/BackHandler is not supported|Failed to load resource/.test(m.text()) && errs.push(m.text().slice(0, 200)));
  const wait = (ms) => page.waitForTimeout(ms);
  let n = 0;
  const tag = `${theme}-${scheme}`;
  const shot = async (name) => { await wait(400); await page.screenshot({ path: `${out}/${tag}-${String(++n).padStart(2, '0')}-${name}.png` }); };
  const has = async (s) => (await page.getByText(s).count()) > 0;
  const visible = (loc) => loc.locator('visible=true');
  const tab = (name) => page.getByRole('tab', { name });
  const selected = async (name) => (await tab(name).getAttribute('aria-selected')) === 'true';
  const btn = (name, exact = true) => visible(page.getByRole('button', { name, exact }));
  const heading = (name) => visible(page.getByRole('heading', { name, exact: true }));
  const cardCount = async () => visible(page.getByRole('button', { name: /^(精選，)?@/ })).count();
  const cardLabel = async (re) => visible(page.getByRole('button', { name: re })).first().getAttribute('aria-label');
  const selBox = (re) => visible(page.getByRole('checkbox', { name: re })).first();
  const isChecked = async (loc) => (await loc.getAttribute('aria-checked')) === 'true';
  const back = () => page.evaluate(() => window.__pressBack());
  const addLink = async (url, tagName) => {
    await btn('收藏連結').first().click(); await wait(300);
    await page.getByLabel('貼文連結').fill(url);
    await page.getByText('收藏', { exact: true }).last().click(); await wait(1300);
    if (tagName) {
      await page.getByRole('checkbox', { name: tagName }).last().click();
      await page.getByText('完成', { exact: true }).click();
    } else {
      await page.getByRole('button', { name: '關閉' }).last().click();
    }
    await wait(500);
  };
  const longPress = async (loc) => {
    // Off-screen cards would put the press on the tab bar instead.
    for (let i = 0; i < 10; i++) {
      const b = await loc.boundingBox();
      if (b && b.y > 80 && b.y + 60 < H - 140) break;
      await scrollWall(b && b.y > H / 2 ? 300 : -300);
    }
    const box = await loc.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 20); await page.mouse.down(); await wait(700); await page.mouse.up(); await wait(400);
  };
  const toastText = async () => {
    const live = visible(page.locator('[aria-live="polite"]'));
    const k = await live.count(); const texts = [];
    for (let i = 0; i < k; i++) texts.push((await live.nth(i).innerText()).trim());
    return texts.join(' | ');
  };
  const scrollWall = async (dy) => { await page.mouse.move(W / 2, H / 2); await page.mouse.wheel(0, dy); await wait(400); };

  await page.goto(base); await wait(2500);

  if (theme === 'film') {
    await step('switch to 底片', async () => {
      await btn('設定').click(); await wait(600);
      await page.getByRole('radio', { name: '主題：底片' }).click(); await wait(500);
      await page.getByRole('button', { name: '關閉' }).last().click(); await wait(400);
    });
  }

  await step('seed posts', async () => {
    await addLink('https://www.threads.com/@jp.travel/post/IMG1', '旅遊');
    await addLink('https://www.threads.com/@tainan.eats/post/CAR1', '美食');
    await addLink('https://www.threads.com/@starlight.daily/post/VID1', '追星');
    await addLink('https://www.threads.com/@quiet.notes/post/TXT1', '生活');
    await addLink('https://www.threads.com/@duo.cam/post/DUO1', '追星');
    await addLink('https://www.threads.com/@jp.travel/post/IMG2');
    await addLink('https://www.threads.com/@meme.lab/post/MEME1');
    await addLink('https://www.threads.com/@starlight.daily/post/IDOL1');
    await addLink('https://www.threads.com/@starlight.daily/post/IDOL2', '生活');
    check('nine cards saved', (await cardCount()) === 9, String(await cardCount()));
  });

  // ---------- 批次選取 on the 收藏 wall ----------
  await step('enter selection from the header', async () => {
    check('header has 選取多篇', (await btn('選取多篇').count()) === 1);
    await btn('選取多篇').click(); await wait(400);
    check('header reads 已選 0 篇', (await heading('已選 0 篇').count()) === 1);
    check('全選 and 取消 in the header', (await btn('全選這裡的 9 篇').count()) === 1 && (await btn('結束選取').count()) === 1);
    const bar = ['加標籤', '精選', '下載', '刪除'];
    let disabled = true;
    for (const b of bar) disabled = disabled && (await btn(b).getAttribute('aria-disabled')) === 'true';
    check('action bar: 加標籤 / 精選 / 下載 / 刪除, disabled with nothing picked', disabled);
    const barBox = await btn('加標籤').boundingBox();
    const tabBox = await tab('收藏').boundingBox();
    check('bar sits right above the tab bar', barBox.y + barBox.height <= tabBox.y + 1 && tabBox.y - (barBox.y + barBox.height) < 4, `${barBox.y + barBox.height} / ${tabBox.y}`);
    check('bar buttons ≥ 48 tall', barBox.height >= 48, String(barBox.height));
    check('cards are checkboxes now', (await visible(page.getByRole('checkbox', { name: /^選取：/ })).count()) === 9);
    await shot('select-empty');
  });

  await step('tap toggles; ✓ state is exposed', async () => {
    const a = selBox(/^選取：@jp\.travel，河口湖/);
    await a.click(); await wait(250);
    check('tap checks a card', await isChecked(a) && (await heading('已選 1 篇').count()) === 1);
    const b = selBox(/^選取：@meme\.lab/);
    await b.click(); await wait(250);
    check('second card → 已選 2 篇', (await heading('已選 2 篇').count()) === 1);
    await b.click(); await wait(250);
    check('tap again unchecks', !(await isChecked(b)) && (await heading('已選 1 篇').count()) === 1);
    check('bar enabled once something is picked', (await btn('加標籤').getAttribute('aria-disabled')) !== 'true');
    await scrollWall(900); await scrollWall(-900);
    check('selection survives scrolling', await isChecked(selBox(/^選取：@jp\.travel，河口湖/)) && (await heading('已選 1 篇').count()) === 1);
    await shot('select-one');
  });

  await step('全選 / 全不選', async () => {
    await btn('全選這裡的 9 篇').click(); await wait(300);
    check('全選 → 已選 9 篇', (await heading('已選 9 篇').count()) === 1);
    check('全選 turns into 全不選', (await btn('全部取消勾選').count()) === 1);
    await shot('select-all');
    await btn('全部取消勾選').click(); await wait(300);
    check('全不選 → 已選 0 篇', (await heading('已選 0 篇').count()) === 1);
  });

  await step('last cards stay above the bar (content inset)', async () => {
    for (let i = 0; i < 6; i++) await scrollWall(1200);
    const bar = await btn('加標籤').boundingBox();
    const boxes = visible(page.getByRole('checkbox', { name: /^選取：/ }));
    let lowest = 0;
    for (let i = 0; i < (await boxes.count()); i++) { const b = await boxes.nth(i).boundingBox(); if (b && b.y < H) lowest = Math.max(lowest, b.y + b.height); }
    check('lowest card ends above the action bar', lowest > 0 && lowest <= bar.y, `${Math.round(lowest)} ≤ ${Math.round(bar.y)}`);
    await shot('select-bottom');
    for (let i = 0; i < 6; i++) await scrollWall(-1200);
  });

  await step('tri-state 加標籤: mixed stays untouched', async () => {
    await selBox(/^選取：@starlight\.daily，今晚/).click();
    await selBox(/^選取：@duo\.cam/).click();
    await selBox(/^選取：@quiet\.notes/).click(); await wait(250);
    check('已選 3 篇', (await heading('已選 3 篇').count()) === 1);
    await btn('加標籤').click(); await wait(600);
    check('sheet title 3 篇的標籤', await has('3 篇的標籤'));
    const fan = page.getByRole('checkbox', { name: '追星，3 篇裡有 2 篇' });
    const life = page.getByRole('checkbox', { name: '生活，3 篇裡有 1 篇' });
    const food = page.getByRole('checkbox', { name: '美食，都沒有' });
    check('追星 shows mixed 2/3', (await fan.count()) === 1 && (await fan.getAttribute('aria-checked')) === 'mixed' && await has('追星 2/3'));
    check('生活 shows mixed 1/3', (await life.count()) === 1 && (await life.getAttribute('aria-checked')) === 'mixed');
    check('美食 unchecked', (await food.count()) === 1 && (await food.getAttribute('aria-checked')) === 'false');
    check('apply disabled before any change', await has('還沒有變更'));
    await shot('batch-tags-mixed');
    await life.click(); await wait(150);
    check('mixed → all (加上：生活)', await has('加上：生活') && (await page.getByRole('checkbox', { name: '生活，全部都有' }).count()) === 1);
    await page.getByRole('checkbox', { name: '生活，全部都有' }).click(); await wait(150);
    check('all → none (移除：生活)', await has('移除：生活'));
    await page.getByRole('checkbox', { name: '生活，都沒有' }).click(); await wait(150);
    check('none → back to mixed, no change', await has('還沒有變更') && (await page.getByRole('checkbox', { name: '生活，3 篇裡有 1 篇' }).count()) === 1);
    await food.click(); await wait(150);
    check('tap 美食 → 加上：美食', await has('加上：美食'));
    await shot('batch-tags-changed');
    await page.getByText('套用到 3 篇', { exact: true }).click(); await wait(700);
    check('toast: 已更新 3 篇的標籤', (await toastText()).includes('已更新 3 篇的標籤'), await toastText());
    check('still selecting after tagging', (await heading('已選 3 篇').count()) === 1);
  });

  await step('精選 for all picked', async () => {
    check('bar offers 精選', (await btn('精選').count()) === 1);
    await btn('精選').click(); await wait(500);
    check('toast: 已把 3 篇設為精選', (await toastText()).includes('已把 3 篇設為精選'));
    check('button flips to 取消精選', (await btn('取消精選').count()) === 1);
    await shot('select-featured');
    await btn('取消精選').click(); await wait(500);
    check('取消精選 clears it again', (await toastText()).includes('已取消 3 篇的精選') && (await btn('精選').count()) === 1);
    await btn('結束選取').click(); await wait(400);
    check('取消 ends selection', (await heading('收藏').count()) === 1);
  });

  await step('tag results on the cards', async () => {
    const vid = await cardLabel(/^(精選，)?@starlight\.daily，影片，今晚/);
    const duo = await cardLabel(/^(精選，)?@duo\.cam/);
    const quiet = await cardLabel(/^(精選，)?@quiet\.notes/);
    check('mixed 追星 untouched: still on its two posts, not added to the third', /追星/.test(vid) && /追星/.test(duo) && !/追星/.test(quiet), quiet);
    check('mixed 生活 untouched: only quiet.notes', /生活/.test(quiet) && !/生活/.test(vid) && !/生活/.test(duo));
    check('美食 added to all three', [vid, duo, quiet].every((l) => /美食/.test(l)));
    check('精選 cleared again', !/^精選/.test(vid));
  });

  await step('下載 queues every picked post', async () => {
    await btn('選取多篇').click(); await wait(300);
    await selBox(/^選取：@jp\.travel，河口湖/).click();
    await selBox(/^選取：@meme\.lab/).click();
    await selBox(/^選取：@quiet\.notes/).click(); await wait(200);
    await btn('下載').click(); await wait(300);
    const msg = await toastText();
    check('toast: 2 queued, text-only skipped', msg.includes('已加入下載：2 篇，1 篇沒有可下載的媒體'), msg);
    check('download ends selection', (await heading('收藏').count()) === 1);
    check('pill shows the queue', (await has(/（還有 1 篇）/)) || (await has(/讀取貼文中|下載中/)));
    await shot('download-queued');
    await wait(3500);
    const a = await cardLabel(/@jp\.travel，圖片，河口湖/);
    const b = await cardLabel(/@meme\.lab/);
    check('both marked 已下載', /已下載/.test(a) && /已下載/.test(b), `${a} / ${b}`);
  });

  await step('刪除 asks with the count; 復原 brings all back in place', async () => {
    const before = await visible(page.getByRole('button', { name: /^(精選，)?@/ })).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')).sort());
    await btn('選取多篇').click(); await wait(300);
    await selBox(/^選取：@meme\.lab/).click();
    await selBox(/^選取：@duo\.cam/).click(); await wait(200);
    await btn('刪除').click(); await wait(500);
    check('confirm sheet names the count', await has('刪除 2 篇收藏？'));
    await shot('delete-confirm');
    await back(); await wait(400);
    check('back closes the confirm, selection stays', !(await has('刪除 2 篇收藏？')) && (await heading('已選 2 篇').count()) === 1);
    await shot('after-back-confirm');
    await btn('刪除').click({ timeout: 5000 }); await wait(500);
    await shot('confirm-again');
    await page.getByText('刪除 2 篇', { exact: true }).click({ timeout: 5000 }); await wait(600);
    check('both deleted, selection ended', (await cardCount()) === 7 && (await heading('收藏').count()) === 1);
    check('toast: 已刪除 2 篇收藏 · 復原', (await toastText()).includes('已刪除 2 篇收藏') && (await btn('復原').count()) === 1);
    await shot('delete-undo-toast');
    await btn('復原').click(); await wait(600);
    const after = await visible(page.getByRole('button', { name: /^(精選，)?@/ })).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')).sort());
    check('復原 restores both', after.length === 9 && JSON.stringify(after) === JSON.stringify(before));
  });

  await step('long-press menu → 選取多篇 starts with that card', async () => {
    await longPress(visible(page.getByRole('button', { name: /@tainan\.eats/ })).first());
    check('menu offers 選取多篇', await has('選取多篇'));
    await shot('menu-select');
    await page.getByText('選取多篇', { exact: true }).click(); await wait(400);
    check('已選 1 篇 with the pressed card checked', (await heading('已選 1 篇').count()) === 1 && await isChecked(selBox(/^選取：@tainan\.eats/)));
  });

  await step('Android back ends selection first', async () => {
    const handled = await back(); await wait(300);
    check('back handled and selection ended', handled === true && (await heading('收藏').count()) === 1);
    check('next back would leave the app', (await back()) === false);
  });

  await step('leaving the tab ends selection', async () => {
    await btn('選取多篇').click(); await wait(200);
    await selBox(/^選取：@tainan\.eats/).click(); await wait(200);
    await tab('串流').click(); await wait(500);
    await tab('收藏').click(); await wait(500);
    check('back on 收藏: not selecting', (await heading('收藏').count()) === 1 && (await btn('選取多篇').count()) === 1);
  });

  // ---------- 作者頁 ----------
  await step('author page from the post detail', async () => {
    await visible(page.getByRole('button', { name: /@starlight\.daily，影片，今晚/ })).first().click(); await wait(800);
    const link = btn('作者 @starlight.daily 的所有收藏');
    check('detail byline is a ≥48dp link', (await link.count()) === 1 && (await link.boundingBox()).height >= 48);
    await shot('detail-byline');
    await link.click(); await wait(700);
    check('author page title', (await heading('@starlight.daily').count()) === 1);
    check('summary: 3 篇 · 最常用標籤：追星、生活', await has('3 篇 · 最常用標籤：追星、生活'), '');
    check('three cards, all by the author', (await cardCount()) === 3 && (await visible(page.getByRole('button', { name: /^(精選，)?@starlight\.daily/ })).count()) === 3);
    check('用串流看 and 選取多篇 on the page', (await btn('用串流看 @starlight.daily').count()) === 1 && (await btn('選取多篇').count()) === 1);
    await shot('author-page');
    await back(); await wait(500);
    check('back returns to the detail it came from', (await btn('作者 @starlight.daily 的所有收藏').count()) === 1 && (await has('收藏於')));
    await back(); await wait(500);
    check('back again: the wall', (await heading('收藏').count()) === 1);
  });

  await step('select all on the author page and tag them', async () => {
    await visible(page.getByRole('button', { name: /@starlight\.daily，影片，今晚/ })).first().click(); await wait(800);
    await page.getByRole('heading', { name: '@starlight.daily' }).first().click(); await wait(700);
    check('running head opens the author page too', (await heading('@starlight.daily').count()) === 1);
    await btn('選取多篇').click(); await wait(300);
    await btn('全選這裡的 3 篇').click(); await wait(300);
    check('已選 3 篇', (await heading('已選 3 篇').count()) === 1);
    await shot('author-select-all');
    await btn('加標籤').click(); await wait(500);
    const fan = page.getByRole('checkbox', { name: '追星，3 篇裡有 1 篇' });
    check('追星 mixed 1/3 on the author', (await fan.count()) === 1);
    await fan.click(); await wait(150);
    await page.getByText('套用到 3 篇', { exact: true }).click(); await wait(700);
    check('toast: 已更新 2 篇的標籤 (one already had it)', (await toastText()).includes('已更新 2 篇的標籤'), await toastText());
    await back(); await wait(300);
    check('back: selection ends, still on the author page', (await heading('@starlight.daily').count()) === 1);
    const labels = await visible(page.getByRole('button', { name: /^(精選，)?@starlight\.daily/ })).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    check('all three now 追星', labels.length === 3 && labels.every((l) => /追星/.test(l)), labels.join(' / '));
    check('summary still lists 追星 first', await has('3 篇 · 最常用標籤：追星、生活'));
  });

  await step('用串流看 from the author page', async () => {
    await btn('用串流看 @starlight.daily').click(); await wait(900);
    check('switches to 串流', await selected('串流'));
    check('author chip shown', (await btn('只看 @starlight.daily，點一下看全部作者').count()) === 1);
    const bylines = await visible(page.getByText(/^(文 ／ )?@[\w.]+ ›$/)).allInnerTexts();
    check('feed only has that author', bylines.length > 0 && bylines.every((b) => b.includes('@starlight.daily')), bylines.join('|'));
    await shot('stream-author');
    await btn('只看 @starlight.daily，點一下看全部作者').click(); await wait(600);
    check('clearing the chip shows everyone', (await btn('只看 @starlight.daily，點一下看全部作者').count()) === 0);
  });

  await step('author page from 串流, back to 串流', async () => {
    const link = btn('作者 @quiet.notes 的所有收藏').first();
    for (let i = 0; i < 12 && !(await link.count()); i++) await scrollWall(500);
    check('stream byline target ≥ 48 tall', (await link.boundingBox()).height >= 48);
    await link.click(); await wait(700);
    check('opens in 收藏', (await selected('收藏')) && (await heading('@quiet.notes').count()) === 1);
    check('summary for a 1-post author', await has(/^1 篇 · 最常用標籤：/));
    await btn('返回').click(); await wait(600);
    check('back returns to 串流', await selected('串流'));
  });

  await step('author page from 翻翻, back to 翻翻', async () => {
    await tab('翻翻').click(); await wait(800);
    const link = visible(page.getByRole('button', { name: /^作者 @[\w.]+ 的所有收藏$/ })).first();
    const name = (await link.getAttribute('aria-label')).match(/@([\w.]+)/)[1];
    await shot('deck-author');
    await link.click(); await wait(700);
    check('翻翻 handle opens that author', (await selected('收藏')) && (await heading(`@${name}`).count()) === 1, name);
    await back(); await wait(600);
    check('back returns to 翻翻', await selected('翻翻'));
    check('deck still has its top card', (await visible(page.getByRole('button', { name: /^@/ })).count()) >= 1);
    await tab('收藏').click(); await wait(500);
  });

  await step('selection on a tag page', async () => {
    await btn('所有標籤').click({ force: true }); await wait(600);
    await page.getByRole('button', { name: /^美食，/ }).click(); await wait(600);
    await btn('選取多篇').click(); await wait(300);
    await btn(/^全選這裡的 \d+ 篇$/, false).click(); await wait(300);
    check('tag page selection works', (await heading('已選 4 篇').count()) === 1);
    await shot('tag-select');
    await back(); await wait(300);
    check('back: selection ends, tag page stays', (await heading('美食').count()) === 1);
    await back(); await wait(300); await back(); await wait(300);
  });

  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
});
