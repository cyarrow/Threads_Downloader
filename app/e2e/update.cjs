// Update banner: a newer GitHub release shows 有新版本 on the wall and in 設定 ›
// 檢查更新. On Android the app downloads and installs the APK itself (a native
// path these web runs can't reach); the web build opens the download link, which
// is what this suite checks, along with the banner's layout in both schemes.
const { run } = require('./lib/harness.cjs');

const APK = 'https://github.com/cyarrow/Threads_Downloader/releases/download/build-999/threads-downloader-1.1.0-999.apk';
const RELEASE = {
  tag_name: 'build-999',
  name: 'Threads 下載 1.1.0 (build 999)',
  body: '',
  html_url: 'https://github.com/cyarrow/Threads_Downloader/releases/tag/build-999',
  assets: [{ name: 'threads-downloader-1.1.0-999.apk', browser_download_url: APK, size: 49480569 }],
};

run(__filename, async ({ base, newPage, check, step, until, scheme, out }) => {
  const page = await newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  // Registered after the harness's "no release" route, so it wins.
  await page.route(/^https:\/\/api\.github\.com\//, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(RELEASE) }),
  );
  const text = async (s) => (await page.getByText(s).count()) > 0;

  await page.goto(base);
  await step('banner', async () => {
    check('有新版本 banner shown', !!(await until(() => text('有新版本'), { timeout: 8000 })));
    check('banner names the build', await text('Threads 下載 1.1.0 (build 999)'));
    check('download-and-install action', (await page.getByRole('button', { name: '下載並安裝' }).count()) > 0);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${scheme}-01-banner.png` });
  });
  await step('web opens the APK link', async () => {
    const popup = page.waitForEvent('popup', { timeout: 5000 });
    await page.getByRole('button', { name: '下載並安裝' }).click();
    const p = await popup;
    check('download link opened', p.url() === APK || (await p.evaluate(() => location.href).catch(() => '')) === APK, p.url());
    await p.close().catch(() => {});
  });
  await step('settings row', async () => {
    await page.getByRole('button', { name: '設定' }).first().click();
    check('settings offers the update', !!(await until(() => text('build 999 可更新，點一下'))));
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${scheme}-02-settings.png` });
  });
  await step('dismiss', async () => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    if (await text('檢查更新')) await page.getByRole('button', { name: '關閉' }).first().click().catch(() => {});
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: '稍後再說' }).click();
    check('banner hidden after 稍後再說', !!(await until(async () => !(await text('有新版本')))));
  });
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
});
