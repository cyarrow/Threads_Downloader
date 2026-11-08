// At most one <video> plays at a time on the post detail page (carousel pages,
// page marks, closing the page, another post). Media requests get clip.webm.
const { run } = require('./lib/harness.cjs');

run(__filename, async ({ base, newPage, check, step, scheme, out }) => {
  const page = await newPage({ media: true, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  const wait = (ms) => page.waitForTimeout(ms);
  let n = 0;
  const shot = async (name) => page.screenshot({ path: `${out}/video-${scheme}-${String(++n).padStart(2, '0')}-${name}.png` });
  // [{ src-less index, paused, currentTime }] for every <video> in the page.
  const videos = () =>
    page.evaluate(() => [...document.querySelectorAll('video')].map((v) => ({ paused: v.paused, t: +v.currentTime.toFixed(2) })));
  const playingCount = async () => (await videos()).filter((v) => !v.paused).length;
  const addLink = async (url) => {
    await page.getByRole('button', { name: '收藏連結', exact: true }).last().click(); await wait(300);
    await page.getByLabel('貼文連結').fill(url);
    await page.getByText('收藏', { exact: true }).last().click(); await wait(1200);
    await page.getByText('完成', { exact: true }).click(); await wait(600);
  };

  await page.goto(base); await wait(2500);
  await step('save posts', async () => {
    await addLink('https://www.threads.com/@duo.cam/post/DUO1');
    await addLink('https://www.threads.com/@stage.cam/post/VID1');
    check('two-video post saved', (await page.getByRole('button', { name: /duo\.cam/ }).count()) > 0);
  });

  // On web, play() in useVideoPlayer's setup runs before the <video> exists, so a
  // tapped ▶ shows a paused video with controls (Android starts it). Press play
  // on the controls the way a user would: play() on the newest <video>.
  const tapPlay = async (which = 'first') => {
    await page.getByRole('button', { name: '播放影片' })[which]().click(); await wait(800);
    await page.evaluate(() => { const all = document.querySelectorAll('video'); all[all.length - 1]?.play(); });
    await wait(1200);
  };

  await step('carousel: starting the second video stops the first', async () => {
    await page.getByRole('button', { name: /duo\.cam/ }).first().click(); await wait(800);
    check('detail shows two ▶', (await page.getByRole('button', { name: '播放影片' }).count()) === 2);
    await tapPlay();
    let v = await videos();
    check('first video plays', v.length === 1 && !v[0].paused, JSON.stringify(v));
    await shot('first-playing');
    // Swipe to page 2 without the pager settling (web fires no momentum-end), then
    // tap its ▶ while page 1 is still mounted.
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('div')].find((d) => {
        const s = getComputedStyle(d);
        // Tabs build: the wall's tag chips also scroll sideways; pick the media pager.
        return (s.overflowX === 'auto' || s.overflowX === 'scroll') && d.scrollWidth > d.clientWidth + 10 && d.querySelector('[aria-label="播放影片"]');
      });
      el.scrollLeft = el.clientWidth;
    });
    await wait(600);
    await tapPlay('first'); // page 1 shows its player now, so the only ▶ left is page 2's
    v = await videos();
    check('after starting the second: exactly one playing', (await playingCount()) === 1, JSON.stringify(v));
    check('the first page is back to its poster + ▶', v.length === 1 && (await page.getByRole('button', { name: '播放影片' }).count()) === 1, JSON.stringify(v));
    await shot('second-playing');
  });

  await step('carousel: changing page returns the playing page to its poster', async () => {
    await page.getByRole('button', { name: '第 1 項', exact: true }).click(); await wait(1200);
    let v = await videos();
    check('leaving the playing page stops it', v.length === 0, JSON.stringify(v));
    check('both pages back to ▶', (await page.getByRole('button', { name: '播放影片' }).count()) === 2);
    await shot('back-to-posters');
    await tapPlay();
    check('page 1 plays again', (await playingCount()) === 1);
    await page.getByRole('button', { name: '第 2 項', exact: true }).click(); await wait(1200);
    v = await videos();
    check('page-mark tap to page 2 stops page 1', v.length === 0, JSON.stringify(v));
  });

  await step('closing the detail page stops its video', async () => {
    await page.getByRole('button', { name: '第 1 項', exact: true }).click(); await wait(800);
    await tapPlay();
    check('playing before close', (await playingCount()) === 1);
    await page.getByRole('button', { name: '返回' }).click(); await wait(1000);
    const v = await videos();
    check('no video left after close', v.length === 0, JSON.stringify(v));
  });

  await step('another post’s video plays alone', async () => {
    await page.getByRole('button', { name: /stage\.cam/ }).first().click(); await wait(800);
    await tapPlay();
    const v = await videos();
    check('only the new post’s video plays', v.length === 1 && !v[0].paused, JSON.stringify(v));
    await shot('other-post');
    await page.getByRole('button', { name: '返回' }).click(); await wait(800);
  });

  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
}, { autoplay: true });
