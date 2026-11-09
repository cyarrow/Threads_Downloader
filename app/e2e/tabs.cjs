// Tabs on the web build: bottom tabs, header ＋, 所有標籤 / tag page, 串流
// (filters, 隨機, 精選, inline video), and the 翻翻 deck (mouse drags, buttons,
// undo, 未分類 triage, reduced motion).
const { run } = require('./lib/harness.cjs');

run(__filename, async ({ base, newPage, check, step, until, scheme, out }) => {
  const page = await newPage({ media: true, viewport: { width: Number(process.env.W) || 390, height: Number(process.env.H) || 844 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
  const wait = (ms) => page.waitForTimeout(ms);
  let n = 0;
  const shot = async (name) => { await wait(350); await page.screenshot({ path: `${out}/tabs-${scheme}-${String(++n).padStart(2, '0')}-${name}.png` }); };
  const has = async (s) => (await page.getByText(s).count()) > 0;
  const tab = (name) => page.getByRole('tab', { name });
  const selected = async (name) => (await tab(name).getAttribute('aria-selected')) === 'true';
  const addLink = async (url, tag) => {
    await page.getByRole('button', { name: '收藏連結', exact: true }).first().click(); await wait(300);
    await page.getByLabel('貼文連結').fill(url);
    await page.getByText('收藏', { exact: true }).last().click(); await wait(1300);
    if (tag) {
      await page.getByRole('checkbox', { name: tag }).last().click();
      await page.getByText('完成', { exact: true }).click();
    } else {
      await page.getByRole('button', { name: '關閉' }).last().click();
    }
    await wait(500);
  };
  // The 翻翻 top card: the only visible button labelled "@author，…" on that tab.
  const topCard = () => page.getByRole('button', { name: /^@/ }).first();
  const topLabel = async () => topCard().getAttribute('aria-label');
  const drag = async (dx, dy, { hold = false } = {}) => {
    const b = await topCard().boundingBox();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(x + (dx * i) / 12, y + (dy * i) / 12); await wait(16); }
    if (hold) return;
    await page.mouse.up(); await wait(600);
  };
  const visible = (loc) => loc.locator('visible=true');
  // Stream posts on screen: one "文 ／ @author" byline each (hidden tabs are visibility: hidden).
  const bylines = () => visible(page.getByText(/^文 ／ @/));
  // TagChip's checked state isn't exposed as aria-checked on web; read the fill
  // instead (selected chips are filled with foreground ink).
  // The list recycles cells, so DOM order isn't screen order: the topmost byline.
  const topByline = async () => {
    const all = bylines(); const k = await all.count(); let best = null;
    for (let i = 0; i < k; i++) { const b = await all.nth(i).boundingBox(); if (b && (!best || b.y < best.y)) best = { y: b.y, text: await all.nth(i).innerText() }; }
    return best?.text || '';
  };
  // Wheel-scroll the visible list until `loc` is on screen (virtualized rows only exist near the viewport).
  const scrollTo = async (loc) => {
    await page.mouse.move(195, 500);
    for (let i = 0; i < 30; i++) {
      const el = visible(loc).first();
      if ((await visible(loc).count()) > 0) { const b = await el.boundingBox(); if (b && b.y > 0 && b.y < 700) return; }
      await page.mouse.wheel(0, 400); await wait(150);
    }
  };
  const chipOn = async (name) => {
    const chip = visible(page.getByRole('checkbox', { name, exact: true })).first();
    return chip.evaluate((el) => {
      const box = el.firstElementChild;
      const bg = getComputedStyle(box).backgroundColor;
      return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
    });
  };

  await page.goto(base); await wait(2500);

  await step('tab bar + header ＋', async () => {
    check('three tabs in order', (await page.getByRole('tab').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).join(',') === '翻翻,收藏,串流');
    check('收藏 selected on launch', await selected('收藏'));
    check('＋ 收藏連結 is in the header (one visible button, top of screen)', (await page.getByRole('button', { name: '收藏連結', exact: true }).count()) === 1 && (await page.getByRole('button', { name: '收藏連結', exact: true }).boundingBox()).y < 150);
    const bar = await tab('收藏').boundingBox();
    check('tab bar ≥ 56 tall, at the bottom', bar.height >= 56 && bar.y + bar.height >= (Number(process.env.H) || 844) - 1, JSON.stringify(bar));
    await shot('home-empty');
  });

  await step('seed posts', async () => {
    await addLink('https://www.threads.com/@jp.travel/post/IMG1', '旅遊');
    await addLink('https://www.threads.com/@tainan.eats/post/CAR1', '美食');
    await addLink('https://www.threads.com/@starlight.daily/post/VID1', '追星');
    await addLink('https://www.threads.com/@quiet.notes/post/TXT1', '生活');
    await addLink('https://www.threads.com/@duo.cam/post/DUO1', '追星');
    await addLink('https://www.threads.com/@jp.travel/post/IMG2');
    await addLink('https://www.threads.com/@meme.lab/post/MEME1');
    await addLink('https://www.threads.com/@starlight.daily/post/IDOL1');
    check('eight cards saved', (await page.getByRole('button', { name: /^(精選，)?@/ }).count()) === 8);
  });

  await step('收藏: one scrolling chip row + 所有標籤', async () => {
    const chips = page.getByRole('checkbox');
    const ys = new Set();
    for (let i = 0; i < await chips.count(); i++) ys.add(Math.round((await chips.nth(i).boundingBox()).y));
    check('chips sit on one line', ys.size === 1, [...ys].join(','));
    const all = page.getByRole('button', { name: '所有標籤' });
    check('所有標籤 chip present', (await all.count()) === 1);
    await shot('home-wall');
    await page.getByRole('checkbox', { name: '旅遊' }).click(); await wait(400);
    check('filter still works', await has('1 篇') && (await page.getByRole('button', { name: /jp\.travel/ }).count()) === 1);
    await page.getByText('清除篩選').click(); await wait(300);
  });

  await step('所有標籤 browser', async () => {
    await page.getByRole('button', { name: '所有標籤' }).click({ force: true }); await wait(600);
    check('covers per 大標籤', (await page.getByRole('button', { name: /^追星，2 篇/ }).count()) === 1 && (await page.getByRole('button', { name: /^旅遊，1 篇/ }).count()) === 1);
    check('整理未分類 entry with count', await has('3 篇還沒有標籤') && (await page.getByRole('button', { name: '整理未分類' }).count()) === 1);
    await shot('all-tags');
    await page.getByRole('button', { name: /^追星，/ }).click(); await wait(600);
    check('tag page title + 用串流看', (await page.getByRole('heading', { name: '追星' }).count()) === 1 && (await page.getByRole('button', { name: '用串流看「追星」' }).count()) === 1);
    check('tag page shows only 追星 posts', (await page.getByRole('button', { name: /^(精選，)?@/ }).count()) === 2);
    await shot('tag-page');
    await page.getByRole('button', { name: '返回所有標籤' }).click(); await wait(400);
    check('back returns to covers', (await page.getByRole('heading', { name: '所有標籤' }).count()) === 1);
    await page.getByRole('button', { name: /^追星，/ }).click(); await wait(400);
    await page.getByRole('button', { name: '用串流看「追星」' }).click(); await wait(800);
    check('用串流看 switches to 串流', await selected('串流'));
    check('stream filtered to 追星', (await chipOn('追星')) && (await bylines().count()) === 2);
    await shot('stream-filtered');
    await tab('收藏').click(); await wait(400);
    check('收藏 tab kept the tag page', (await page.getByRole('heading', { name: '追星' }).count()) === 1);
    await page.getByRole('button', { name: '返回所有標籤' }).click(); await wait(300);
    await page.getByRole('button', { name: '返回收藏' }).click(); await wait(400);
    check('back to the wall', (await page.getByRole('heading', { name: '收藏' }).count()) === 1);
  });

  await step('串流', async () => {
    await tab('串流').click(); await wait(500);
    await page.getByRole('checkbox', { name: '全部' }).click(); await wait(500);
    check('newest first: IDOL1 caption first', (await topByline()).includes('starlight.daily'));
    check('full caption, not truncated', await has('台南巷子裡的早午餐，蛋餅皮是現擀的，假日十點前去才不用排。'));
    await shot('stream');
    // Carousel counter + tag filter from a post
    await scrollTo(page.getByText('1 / 3')); await wait(400);
    check('carousel counter', await has('1 / 3'));
    await shot('stream-carousel');
    await page.getByRole('button', { name: '只看「美食」' }).first().click(); await wait(500);
    check('tag under a post filters the feed', (await chipOn('美食')) && (await bylines().count()) === 1);
    await page.getByRole('checkbox', { name: '全部' }).click(); await wait(400);
    // 隨機 + 換一批
    await page.getByRole('radio', { name: '隨機' }).click(); await wait(400);
    check('隨機 shows 換一批', (await page.getByRole('button', { name: '換一批' }).count()) === 1);
    const firstAuthors = async () => (await bylines().allInnerTexts()).join('|');
    const a1 = await firstAuthors();
    let changed = false;
    for (let i = 0; i < 4 && !changed; i++) { await page.getByRole('button', { name: '換一批' }).click(); await wait(400); changed = (await firstAuthors()) !== a1; }
    check('換一批 reorders', changed, a1);
    await shot('stream-random');
    await page.getByRole('radio', { name: '最新收藏' }).click(); await wait(400);
    // 設為精選 from the stream
    await page.getByRole('button', { name: '設為精選' }).first().click(); await wait(500);
    check('設為精選 flips to 取消精選', (await page.getByRole('button', { name: '取消精選' }).count()) >= 1);
    await page.getByRole('button', { name: '取消精選' }).first().click(); await wait(400);
    // Video: tap ▶, then another ▶ → only one plays
    const play = visible(page.getByRole('button', { name: '播放影片' }));
    await scrollTo(page.getByRole('button', { name: '播放影片' })); await play.first().click(); await wait(800);
    await page.evaluate(() => { const all = document.querySelectorAll('video'); all[all.length - 1]?.play(); }); await wait(800);
    const vids = await page.evaluate(() => [...document.querySelectorAll('video')].map((v) => !v.paused));
    check('tap ▶ plays inline in the stream', vids.length === 1 && vids[0], JSON.stringify(vids));
    await shot('stream-video');
    // A second video further down: starting it leaves exactly one playing.
    await page.mouse.move(195, 400); await page.mouse.wheel(0, 700); await wait(400);
    await scrollTo(page.getByRole('button', { name: '播放影片' }));
    await play.first().click(); await wait(800);
    await page.evaluate(() => { const all = document.querySelectorAll('video'); all[all.length - 1]?.play(); }); await wait(800);
    const two = await page.evaluate(() => [...document.querySelectorAll('video')].map((v) => !v.paused));
    check('second stream video: still only one playing', two.filter(Boolean).length === 1, JSON.stringify(two));
    await tab('收藏').click(); await wait(800);
    const after = await page.evaluate(() => [...document.querySelectorAll('video')].length);
    check('leaving the 串流 tab stops its video', after === 0, String(after));
  });

  await step('翻翻: drag right = 精選, undo, left = next, up = tags', async () => {
    await tab('翻翻').click(); await wait(600);
    check('hint shown', await has('右滑設為精選 · 左滑看下一張 · 上滑加標籤'));
    check('剩 8 張', await has('剩 8 張'));
    await shot('deck');
    const first = await topLabel();
    await drag(70, 10, { hold: true }); await wait(200);
    await shot('deck-drag');
    await page.mouse.move(400, 470); await wait(30); await page.mouse.up(); await wait(700);
    check('drag right sets 精選', await has('已設為精選'));
    check('next card on top', (await topLabel()) !== first);
    await page.getByRole('button', { name: '復原上一張' }).click(); await wait(500);
    check('undo puts the card back', (await topLabel()) === first && await has('已復原'));
    await tab('收藏').click(); await wait(300);
    check('undo removed 精選 again', (await page.getByRole('button', { name: /^精選，/ }).count()) === 0);
    await tab('翻翻').click(); await wait(400);
    await drag(-160, 0);
    check('drag left goes to the next card', (await topLabel()) !== first && await has('剩 7 張'));
    const second = await topLabel();
    await drag(0, -200);
    check('drag up opens the tag sheet', await has('編輯標籤'));
    await shot('deck-tag-sheet');
    await page.getByRole('checkbox', { name: '梗圖' }).last().click();
    await page.getByText('完成', { exact: true }).click();
    // The deck moves on once the sheet has saved the tags (async), not on a fixed beat.
    const moved = await until(async () => (await topLabel()) !== second && await has('標籤已更新'));
    check('after picking tags the deck moves on', !!moved, moved ? '' : `top: ${await topLabel()}, status 標籤已更新: ${await has('標籤已更新')}`);
    await wait(300);
    await page.getByRole('button', { name: '復原上一張' }).click(); await wait(500);
    check('undo of tags brings the card back', (await topLabel()) === second);
    // Buttons
    await page.getByRole('button', { name: '設為精選' }).click(); await wait(700);
    check('♥ button sets 精選', await has('已設為精選'));
    await page.getByRole('button', { name: '下一張' }).click(); await wait(700);
    check('✕ button moves on', await has('下一張'));
    await page.getByRole('button', { name: '復原上一張' }).click(); await wait(300);
    await page.getByRole('button', { name: '復原上一張' }).click(); await wait(300);
    // Tap opens the post detail
    const label = await topLabel();
    await topCard().click(); await wait(700);
    check('tap opens the post detail', (await page.getByRole('button', { name: '返回' }).count()) === 1 && (await page.getByText('收藏於', { exact: false }).count()) > 0);
    await shot('deck-detail');
    await page.getByRole('button', { name: '返回' }).click(); await wait(400);
    check('back from detail keeps the card', (await topLabel()) === label);
  });

  await step('翻翻: 未分類 triage', async () => {
    await page.getByRole('checkbox', { name: '未分類' }).click(); await wait(600);
    const hint = await page.evaluate(() => document.body.innerText.match(/右滑加上「[^」]+」[^\n]*/)?.[0] || document.body.innerText.match(/沒有建議[^\n]*/)?.[0]);
    check('triage hint names the suggestion + reason', /^右滑加上「.+」（.+） · 左滑跳過$/.test(hint || ''), hint);
    const apply = page.getByRole('button', { name: /^加上「/ });
    check('right button reads ＋ tag', (await apply.count()) === 1 && /＋|\+/.test(await apply.innerText().catch(() => '')) || (await apply.count()) === 1);
    await shot('triage');
    const firstT = await topLabel();
    await drag(160, 0);
    check('drag right applies the suggestion', await has(/已加上「/));
    await page.getByRole('button', { name: '復原上一張' }).click(); await wait(500);
    check('undo puts it back into 未分類', (await topLabel()) === firstT);
    for (let i = 0; i < 4; i++) { const b = page.getByRole('button', { name: /^加上「|^自選標籤/ }); if (await b.isEnabled().catch(() => false)) { if (/^加上/.test(await b.getAttribute('aria-label'))) await b.click(); else await page.getByRole('button', { name: '跳過' }).click(); await wait(700); } }
    check('triage finishes', await has('未分類都整理好了'));
    await shot('triage-done');
    await tab('收藏').click(); await wait(400);
    check('整理未分類 entry gone when none left', !(await has(/整理未分類（/)));
  });

  await step('翻翻: finish the deck + 再洗一次', async () => {
    await tab('翻翻').click(); await wait(300);
    await page.getByRole('checkbox', { name: '全部' }).click(); await wait(400);
    for (let i = 0; i < 9; i++) { const b = page.getByRole('button', { name: '下一張' }); if (await b.isEnabled()) { await b.click(); await wait(500); } }
    check('翻完了 empty state', await has('這一疊翻完了'));
    await shot('deck-done');
    await page.getByRole('button', { name: '再洗一次' }).click(); await wait(500);
    check('再洗一次 deals again', await has('剩 8 張'));
  });

  await step('header actions on other tabs', async () => {
    await page.getByRole('button', { name: '搜尋' }).click(); await wait(500);
    check('搜尋 on 翻翻 opens search on 收藏', await selected('收藏') && (await page.getByLabel('搜尋作者或內文').count()) === 1);
    await page.getByRole('button', { name: '關閉搜尋' }).click(); await wait(300);
    await tab('串流').click(); await wait(300);
    await page.getByRole('button', { name: '收藏連結', exact: true }).click(); await wait(400);
    check('＋ on 串流 opens add-link sheet', (await page.getByLabel('貼文連結').count()) === 1);
    await page.getByRole('button', { name: '關閉' }).last().click(); await wait(300);
    // A share arriving while on 串流 still opens the save flow.
    await page.evaluate(() => window.__shareToApp('https://www.threads.com/@sea.fan/post/SEA1')); await wait(1500);
    check('share on another tab opens the save panel', await has('其他標籤…') || await has('已收藏'));
    await shot('share-on-stream');
    await page.getByText('先存到未分類').click().catch(() => page.getByText('完成', { exact: true }).click()); await wait(600);
    check('still on 串流 after saving', await selected('串流'));
  });

  await step('reduced motion: no fly-out, the next card is just there', async () => {
    const rm = await newPage({ deviceScaleFactor: 1, reducedMotion: 'reduce' });
    rm.on('pageerror', (e) => errs.push(e.message));
    await rm.goto(`${base}?share=${encodeURIComponent('https://www.threads.com/@a.cam/post/IMG7')}`);
    await rm.getByText('先存到未分類').click({ timeout: 8000 }); await rm.waitForTimeout(600);
    await rm.evaluate(() => window.__shareToApp('https://www.threads.com/@b.cam/post/MEME7')); await rm.waitForTimeout(1500);
    await rm.getByText('先存到未分類').click(); await rm.waitForTimeout(600);
    await rm.getByRole('tab', { name: '翻翻' }).click(); await rm.waitForTimeout(600);
    const top = () => rm.getByRole('button', { name: /^@/ }).first().getAttribute('aria-label');
    const before = await top();
    await rm.getByRole('button', { name: '設為精選' }).click(); await rm.waitForTimeout(60);
    const after = await top();
    check('reduced motion: ♥ switches cards immediately', after !== before, `${before} → ${after}`);
    const tr = await rm.getByRole('button', { name: /^@/ }).first().evaluate((el) => el.parentElement.style.transform);
    check('reduced motion: no tilt on the card', !/rotate\((?!0deg)/.test(tr), tr);
    await rm.close();
  });
  const real = errs.filter((e) => !/releases\/latest|status of 404|rate limit exceeded|status of 403/.test(e));
  check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
}, { autoplay: true });
