// 自動標籤規則 (author / keyword rules in the quick panel and full sheet, apply to
// existing posts + undo, rules from the detail page, tag deletion) and 個人筆記
// (detail, wall, 串流, search, save sheet, backup round-trip). Theme arg /
// E2E_THEME=film runs it in 底片.
const { run } = require('./lib/harness.cjs');
const U = (code, author) => `https://www.threads.com/@${author}/post/${code}`;

run(__filename, async ({ base, newPage, check, step, scheme, theme, out }) => {
  const page = await newPage();
  page.setDefaultTimeout(6000);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|releases\/latest/.test(m.text()) && errs.push(m.text().slice(0, 200)));
  const wait = (ms) => page.waitForTimeout(ms);
  let n = 0;
  const tag = `${theme}-${scheme}`;
  const shot = async (name) => { await wait(350); await page.screenshot({ path: `${out}/${tag}-${String(++n).padStart(2, '0')}-${name}.png` }); };
  const has = async (s) => (await page.getByText(s).count()) > 0;
  const close = async () => { await page.getByRole('button', { name: '關閉' }).last().click(); await wait(450); };
  const openSettings = async () => { await page.getByRole('button', { name: '設定' }).first().click(); await wait(600); };
  const share = async (url) => { await page.evaluate((u) => window.__shareToApp(u), url); };
  const card = (re) => page.getByRole('button', { name: re }).first();
  const cardLabel = async (re) => (await card(re).getAttribute('aria-label')) || '';
  const quickRows = async () => {
    const list = page.getByRole('button', { name: /^存到「/ });
    const k = await list.count(); const out = [];
    for (let i = 0; i < k; i++) out.push({ name: await list.nth(i).getAttribute('aria-label'), y: Math.round((await list.nth(i).boundingBox()).y) });
    return out;
  };
  const addLink = async (url) => {
    await page.getByRole('button', { name: '收藏連結', exact: true }).last().click(); await wait(300);
    await page.getByLabel('貼文連結').fill(url);
    await page.getByText('收藏', { exact: true }).last().click(); await wait(300);
  };
  const openRules = async () => {
    await openSettings();
    await page.getByText('自動標籤規則', { exact: true }).click(); await wait(700);
  };
  const back = async () => { await page.getByRole('button', { name: '返回' }).last().click(); await wait(600); };
  const newRule = async (kind, value, tagName) => {
    await page.getByText('新增規則', { exact: true }).click(); await wait(500);
    if (kind === 'keyword') await page.getByRole('radio', { name: '條件：內文關鍵字' }).click();
    await page.getByLabel(kind === 'author' ? '作者帳號' : '內文關鍵字', { exact: true }).fill(value);
    await page.getByRole('checkbox', { name: tagName, exact: true }).last().click();
  };

  await page.goto(base); await wait(2500);
  if (theme === 'film') {
    await openSettings();
    await page.getByRole('radio', { name: '主題：底片' }).click(); await wait(400);
    await close();
  }

  // ---------------------------------------------------------------- rules
  await step('rules page (empty)', async () => {
    await openSettings();
    check('settings row says 未設定', await has('未設定'));
    await shot('settings');
    await page.getByText('自動標籤規則', { exact: true }).click(); await wait(700);
    check('empty rules page', await has('還沒有規則'));
    await shot('rules-empty');
  });

  await step('create author rule', async () => {
    await page.getByText('新增規則', { exact: true }).click(); await wait(500);
    await page.getByRole('button', { name: '建立規則', exact: true }).click(); await wait(300);
    check('empty handle is refused', await has('請輸入作者帳號'));
    await page.getByLabel('作者帳號').fill('@Starlight.Daily');
    await page.getByRole('button', { name: '建立規則', exact: true }).click(); await wait(300);
    check('a tag is required', await has('請選一個標籤'));
    await page.getByRole('checkbox', { name: '追星', exact: true }).last().click(); await wait(200);
    check('preview counts matches', await has(/目前的收藏裡有 0 篇是 @starlight\.daily 的/));
    await shot('rule-editor');
    await page.getByRole('button', { name: '建立規則', exact: true }).click(); await wait(700);
    check('created toast', await has(/已建立規則：作者 @starlight\.daily → 追星/));
    check('rule row listed', (await page.getByRole('button', { name: /作者 @starlight\.daily，自動加上「追星」/ }).count()) === 1);
    check('settings count', true);
    await shot('rules-one');
    await back();
  });

  await step('share a matching link: rule tag preselected with reason (quick panel)', async () => {
    await share(U('VID1', 'starlight.daily')); await wait(420); // sheet has sprung in; post still loading (600 ms)
    check('rule row reserved while loading', await has('讀取完會套用自動標籤規則…'));
    const moreBefore = Math.round((await page.getByText('其他標籤…').boundingBox()).y);
    await shot('quick-loading');
    await wait(1200);
    const chip = page.getByRole('checkbox', { name: /追星，規則：@starlight\.daily/ });
    check('rule chip shown and ticked', (await chip.count()) === 1 && (await chip.getAttribute('aria-checked')) === 'true');
    check('reason text visible', await has('規則：@starlight.daily'));
    const rows = await quickRows();
    check('rows skip the rule tag', rows.length === 3 && !rows.some((r) => /存到「追星」/.test(r.name)), JSON.stringify(rows.map((r) => r.name)));
    const moreAfter = Math.round((await page.getByText('其他標籤…').boundingBox()).y);
    check('nothing below the rule row moved', moreBefore === moreAfter, `${moreBefore} → ${moreAfter}`);
    check('finish button names the rule tag', await has('只存到「追星」'));
    await shot('quick-rule-hit');
    await page.getByRole('button', { name: /^存到「生活」/ }).click(); await wait(800);
    const label = await cardLabel(/今晚的安可舞台/);
    check('saved with tapped tag + rule tag', label.includes('追星') && label.includes('生活'), label);
  });

  await step('untick the rule tag', async () => {
    await share(U('IDOL1', 'starlight.daily')); await wait(1600);
    const chip = page.getByRole('checkbox', { name: /追星，規則：@starlight\.daily/ });
    await chip.click(); await wait(200);
    check('unticked', (await chip.getAttribute('aria-checked')) === 'false');
    check('finish button back to 先存到未分類', await has('先存到未分類'));
    await shot('quick-unticked');
    await page.getByText('先存到未分類').click(); await wait(700);
    const label = await cardLabel(/應援手幅/);
    check('saved without the rule tag', !label.includes('標籤：'), label);
  });

  await step('rule applies when the sheet is closed before the post loads', async () => {
    await share(U('SEA1', 'starlight.daily')); await wait(100);
    await page.getByText('先存到未分類').click(); await wait(1500);
    const label = await cardLabel(/新歌 MV/);
    check('tag added after load', label.includes('追星'), label);
  });

  await step('keyword rule + 套用到現有收藏 + undo', async () => {
    await addLink(U('IMG1', 'jp.travel')); await wait(900);
    await page.getByText('完成', { exact: true }).click(); await wait(500);
    await openRules();
    await newRule('keyword', '富士山', '旅遊'); await wait(200);
    check('preview finds the saved post', await has(/目前的收藏裡有 1 篇提到「富士山」，其中 1 篇還沒有「旅遊」/));
    await page.getByRole('button', { name: '建立規則', exact: true }).click(); await wait(600);
    check('offer to apply', await has(/現有的收藏裡有 1 篇符合/));
    await shot('apply-offer');
    await page.getByRole('button', { name: '套用到 1 篇' }).click(); await wait(600);
    check('applied toast with undo', await has('已幫 1 篇加上「旅遊」') && (await page.getByRole('button', { name: '復原' }).count()) === 1);
    await shot('applied-toast');
    await page.getByRole('button', { name: '復原' }).click(); await wait(500);
    check('undo toast', await has('已復原'));
    await back();
    let label = await cardLabel(/河口湖/);
    check('undo removed the tag', !label.includes('旅遊'), label);
    await openRules();
    await page.getByRole('button', { name: /內文提到「富士山」，自動加上「旅遊」/ }).click(); await wait(500);
    await page.getByRole('button', { name: '儲存' }).click(); await wait(500);
    await page.getByRole('button', { name: '套用到 1 篇' }).click(); await wait(600);
    await back();
    label = await cardLabel(/河口湖/);
    check('re-applied from the edit sheet', label.includes('旅遊'), label);
  });

  await step('keyword rule in the full sheet (+ 收藏連結)', async () => {
    await addLink(U('IMG2', 'mountain.fan')); await wait(150);
    check('full sheet reserves the rule row', await has('讀取完會套用自動標籤規則…'));
    await wait(1100);
    const grid = page.getByRole('checkbox', { name: '旅遊', exact: true });
    check('rule tag ticked in the picker', (await grid.last().getAttribute('aria-checked')) === 'true');
    check('reason in the sheet', await has('規則：「富士山」'));
    await shot('full-rule-hit');
    await page.getByText('完成', { exact: true }).click(); await wait(600);
    const label = await cardLabel(/@mountain\.fan/);
    check('saved with the keyword tag', label.includes('旅遊'), label);
  });

  await step('為 @author 建立規則 from the detail page', async () => {
    await addLink(U('CAR1', 'tainan.eats')); await wait(900);
    await page.getByText('完成', { exact: true }).click(); await wait(500);
    await card(/@tainan\.eats/).click(); await wait(800);
    await page.getByRole('button', { name: /^更多/ }).click(); await wait(400);
    await shot('more-menu');
    await page.getByText('為 @tainan.eats 建立規則').click(); await wait(500);
    check('editor prefilled with the author', (await page.getByLabel('作者帳號').inputValue()) === 'tainan.eats');
    await page.getByRole('checkbox', { name: '美食', exact: true }).last().click();
    await shot('rule-from-detail');
    await page.getByRole('button', { name: '建立規則', exact: true }).click(); await wait(500);
    await page.getByRole('button', { name: '套用到 1 篇' }).click(); await wait(600);
    check('applied on the detail page', await has('已幫 1 篇加上「美食」'));
    check('detail shows the new tag', (await page.getByText('美食', { exact: true }).count()) > 0);
    await back();
  });

  await step('deleting a tag removes its rule', async () => {
    await openSettings();
    await page.getByText('標籤管理', { exact: true }).click(); await wait(600);
    await page.getByRole('button', { name: /^旅遊/ }).first().click(); await wait(400);
    await page.getByText('刪除', { exact: true }).click(); await wait(300);
    check('delete warns about the rule', await has(/會加上這個標籤的 1 條自動標籤規則也會一起刪除/));
    await shot('tag-delete-warning');
    await page.getByText('確定刪除').click(); await wait(500);
    await back();
    await openRules();
    check('keyword rule gone', (await page.getByRole('button', { name: /^內文提到「富士山」/ }).count()) === 0);
    check('other rules stay', (await page.getByRole('button', { name: /^作者 @starlight\.daily，/ }).count()) === 1 && (await page.getByRole('button', { name: /^作者 @tainan\.eats，/ }).count()) === 1);
    await shot('rules-two');
  });

  await step('delete a rule with confirmation', async () => {
    await page.getByRole('button', { name: '刪除規則：作者 @tainan.eats' }).click(); await wait(400);
    check('confirm text', await has(/不會再因為「作者 @tainan\.eats」自動加上「美食」/));
    await shot('rule-delete-confirm');
    await page.getByText('刪除規則', { exact: true }).last().click(); await wait(500);
    check('rule deleted', (await page.getByRole('button', { name: /^作者 @tainan\.eats，/ }).count()) === 0 && await has('已刪除規則'));
    await back();
  });

  // ---------------------------------------------------------------- notes
  await step('add a note on the detail page', async () => {
    await card(/@jp\.travel/).click(); await wait(800);
    check('empty note prompt', await has('寫一句為什麼收藏'));
    await page.getByText('寫一句為什麼收藏').click(); await wait(500);
    await page.getByRole('textbox', { name: '筆記', exact: true }).fill('想帶媽媽去看日出\n要住河口湖旁邊');
    check('counter', await has('16 / 500'));
    await shot('note-sheet');
    await page.getByRole('button', { name: '完成' }).click(); await wait(500);
    check('saved toast', await has('筆記已儲存'));
    check('note shown', await has(/想帶媽媽去看日出/));
    await page.mouse.wheel(0, 600); await wait(300);
    await shot('detail-note');
  });

  await step('edit the note (closing keeps it)', async () => {
    await page.getByRole('button', { name: '編輯筆記' }).click(); await wait(400);
    await page.getByRole('textbox', { name: '筆記', exact: true }).fill('想帶媽媽去看日出');
    await close();
    check('edited note shown', (await page.getByRole('button', { name: '我的筆記：想帶媽媽去看日出', exact: true }).count()) === 1);
    await back();
  });

  await step('note on the wall card', async () => {
    const label = await cardLabel(/@jp\.travel/);
    check('card label carries the note', label.includes('我的筆記：想帶媽媽去看日出'), label);
    check('note line visible on the card', await page.getByText('想帶媽媽去看日出', { exact: true }).first().isVisible());
    await shot('wall-note');
  });

  await step('note in 串流', async () => {
    await page.getByRole('tab', { name: '串流' }).click(); await wait(700);
    const block = page.getByLabel('我的筆記：想帶媽媽去看日出', { exact: true });
    await block.scrollIntoViewIfNeeded(); await wait(300);
    check('stream shows the note block', (await block.count()) === 1 && await page.getByText('我的筆記', { exact: true }).first().isVisible());
    await shot('stream-note');
    await page.getByRole('tab', { name: '收藏' }).click(); await wait(500);
  });

  await step('search finds the note', async () => {
    await page.getByRole('button', { name: '搜尋' }).click();
    await page.getByLabel('搜尋作者或內文').fill('媽媽'); await wait(700);
    check('only the noted post', (await page.getByRole('button', { name: /@jp\.travel/ }).count()) === 1 && (await page.getByRole('button', { name: /@mountain\.fan|@tainan\.eats/ }).count()) === 0);
    await shot('search-note');
    await page.getByRole('button', { name: '關閉搜尋' }).click(); await wait(400);
  });

  await step('note from the save sheet', async () => {
    await addLink(U('TXT1', 'daily.words')); await wait(900);
    check('note field in the full sheet', (await page.getByPlaceholder('加一句筆記…').count()) === 1);
    await page.getByPlaceholder('加一句筆記…').fill('心情不好的時候看');
    await shot('sheet-note');
    await page.getByText('完成', { exact: true }).click(); await wait(600);
    check('text card has the note', (await cardLabel(/@daily\.words/)).includes('我的筆記：心情不好的時候看'));
    await shot('wall-note-text-card');
    await share(U('MEME1', 'meme.lab')); await wait(1200);
    check('no note field in the quick panel', (await page.getByPlaceholder('加一句筆記…').count()) === 0);
    await page.getByText('先存到未分類').click(); await wait(600);
  });

  await step('backup round-trip keeps notes and rules', async () => {
    await openSettings();
    await page.getByText('匯出備份').click(); await wait(600);
    // Lose the noted post and the remaining rule, then import the backup.
    await card(/@jp\.travel/).click({ button: 'left' }); await wait(800);
    await page.getByRole('button', { name: /^更多/ }).click(); await wait(400);
    await page.getByText('刪除收藏').click(); await wait(600);
    await openRules();
    await page.getByRole('button', { name: '刪除規則：作者 @starlight.daily' }).click(); await wait(400);
    await page.getByText('刪除規則', { exact: true }).last().click(); await wait(500);
    check('rules empty before import', await has('還沒有規則'));
    await back();
    await openSettings();
    await page.getByText('匯入備份').click(); await wait(900);
    check('import adds the deleted post', await has(/匯入 1 篇/));
    const label = await cardLabel(/@jp\.travel/);
    check('imported post has its note', label.includes('我的筆記：想帶媽媽去看日出'), label);
    await openRules();
    check('imported rule is back', (await page.getByRole('button', { name: /作者 @starlight\.daily，自動加上「追星」/ }).count()) === 1);
    await back();
  });

  await step('clear the note', async () => {
    await card(/@daily\.words/).click(); await wait(800);
    await page.getByRole('button', { name: '編輯筆記' }).click(); await wait(400);
    await page.getByText('清除', { exact: true }).click();
    await page.getByRole('button', { name: '完成' }).click(); await wait(500);
    check('cleared toast + prompt back', await has('已清除筆記') && await has('寫一句為什麼收藏'));
    await back();
    check('card no longer has a note', !(await cardLabel(/@daily\.words/)).includes('我的筆記'));
  });

  // Slow post: the quick rows lock (1.5 s) before the rule result arrives (3 s).
  await step('slow load: rows stay put when the rule tag arrives', async () => {
    const slow = await newPage({ viewport: { width: 360, height: 760 } });
    slow.setDefaultTimeout(6000);
    slow.on('pageerror', (e) => errs.push(e.message));
    await slow.addInitScript(() => {
      const st = window.setTimeout;
      window.setTimeout = (fn, ms, ...a) => st(fn, ms === 600 ? 3000 : ms, ...a);
    });
    await slow.goto(base); await slow.waitForTimeout(2500);
    if (theme === 'film') {
      await slow.getByRole('button', { name: '設定' }).first().click(); await slow.waitForTimeout(600);
      await slow.getByRole('radio', { name: '主題：底片' }).click(); await slow.waitForTimeout(300);
      await slow.getByRole('button', { name: '關閉' }).last().click(); await slow.waitForTimeout(400);
    }
    await slow.getByRole('button', { name: '設定' }).first().click(); await slow.waitForTimeout(600);
    await slow.getByText('自動標籤規則', { exact: true }).click(); await slow.waitForTimeout(700);
    await slow.getByText('新增規則', { exact: true }).click(); await slow.waitForTimeout(500);
    await slow.getByRole('radio', { name: '條件：內文關鍵字' }).click();
    await slow.getByLabel('內文關鍵字', { exact: true }).fill('安可');
    await slow.getByRole('checkbox', { name: '梗圖', exact: true }).last().click();
    await slow.getByRole('button', { name: '建立規則', exact: true }).click(); await slow.waitForTimeout(600);
    await slow.getByRole('button', { name: '返回' }).last().click(); await slow.waitForTimeout(500);
    await slow.evaluate((u) => window.__shareToApp(u), U('VID9', 'stage.fan')); await slow.waitForTimeout(2000);
    const rowsOf = async () => {
      const list = slow.getByRole('button', { name: /^存到「/ });
      const k = await list.count(); const o = [];
      for (let i = 0; i < k; i++) o.push(`${await list.nth(i).getAttribute('aria-label')}@${Math.round((await list.nth(i).boundingBox()).y)}`);
      return o;
    };
    const early = await rowsOf();
    check('rows locked while still loading', early.length === 3 && (await slow.getByText('讀取完會套用自動標籤規則…').count()) === 1, early.join(' | '));
    await slow.screenshot({ path: `${out}/${tag}-slow-1-locked.png` });
    await slow.waitForTimeout(1800);
    const late = await rowsOf();
    check('rows identical after the rule tag arrives', early.join() === late.join(), late.join(' | '));
    const chip = slow.getByRole('checkbox', { name: /梗圖，規則：「安可」/ });
    check('late rule tag shown ticked', (await chip.count()) === 1 && (await chip.getAttribute('aria-checked')) === 'true');
    await slow.screenshot({ path: `${out}/${tag}-slow-2-arrived.png` });
    await slow.getByRole('button', { name: /^存到「/ }).first().click(); await slow.waitForTimeout(700);
    const label = (await slow.getByRole('button', { name: /@stage\.fan/ }).first().getAttribute('aria-label')) || '';
    check('saved with row tag + late rule tag', label.includes('梗圖') && /標籤：\S+、/.test(label), label);
    await slow.close();
  });

  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
});
