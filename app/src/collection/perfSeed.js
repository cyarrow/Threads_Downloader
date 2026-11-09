// A large, realistic collection for the performance harness (e2e/perf.cjs).
// Pure and deterministic: the same `n` and `seed` give the same tags and posts.
// Only the web build's openRepo.web.js uses it (`?seed=3000`); it never ships to
// the native app. Tested in test/perfSeed.test.mjs.

// Two-level tags: 大標籤 with their 小標籤 (some have none).
const TAG_TREE = [
  { name: '追星', color: 'rose', kids: ['星光少年團', '小宇宙', '演唱會'] },
  { name: '生活', color: 'green', kids: ['居家', '療癒'] },
  { name: '美食', color: 'orange', kids: ['拉麵', '甜點', '咖啡廳', '火鍋'] },
  { name: '旅遊', color: 'sky', kids: ['日本', '台南', '韓國'] },
  { name: '梗圖', color: 'violet', kids: [] },
  { name: '穿搭', color: 'pink', kids: ['OOTD'] },
  { name: '工作', color: 'teal', kids: ['設計', '程式'] },
  { name: '閱讀', color: 'indigo', kids: [] },
];

const CAPTIONS = [
  '河口湖早上六點的富士山，雲剛好散開。',
  '台南巷子裡的早午餐，蛋餅皮是現擀的，假日十點前去才不用排。',
  '今晚的安可舞台燈光太美了，整場都在尖叫！',
  '長大以後才發現，能好好睡一覺、吃一頓熱的飯，就已經是很幸福的一天了。',
  '週一早上的我 vs 週五下班的我',
  '應援手幅做好了！這次用了漸層燙金',
  '新歌 MV 拍攝花絮釋出',
  '這家拉麵的湯頭熬了十二小時，叉燒入口即化。',
  '租屋小房間的收納改造，前後對比差好多。',
  '京都清水寺的楓葉這週正紅，人超多但值得。',
  '秋天的 OOTD：燕麥色針織外套配長裙。',
  '設計師私藏的配色網站整理，收起來慢慢看。',
  '這本書讀完後勁很強，推薦給最近很累的人。',
  '火鍋湯底排行榜，第一名是麻辣鴨血。',
  '首爾自由行五天四夜行程懶人包。',
  '咖啡廳的肉桂捲剛出爐，香到整條街都聞得到。',
  '演唱會搶票攻略：開賣前要先做的三件事。',
  '寫程式寫到半夜，貓咪一直坐在鍵盤上。',
  '療癒系的日常：陽台的小番茄終於紅了。',
  '生日咖啡應援場地公開，大家記得排隊時間！',
];

const NOTES = ['下次去台南要吃', '送給妹妹當生日禮物的參考', '跟朋友約週末一起去', '配色可以用在新專案', '記得帶現金', '想學這個收納法'];

// Media kinds and how often they appear; `sample` is the web stand-in's sample
// (fetcher.web.js SAMPLES key) whose media the post reuses, and also its code
// prefix, so a background refresh of the post returns the same kind.
const KINDS = [
  { sample: 'IMG', share: 0.34 },
  { sample: 'IDOL', share: 0.08 },
  { sample: 'MEME', share: 0.06 },
  { sample: 'CAR', share: 0.2 },
  { sample: 'VID', share: 0.07 },
  { sample: 'SEA', share: 0.05 },
  { sample: 'TXT', share: 0.2 },
];

const YEAR = 365 * 24 * 3600 * 1000;

// mulberry32: tiny deterministic PRNG.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The `?seed=N` count from a page's query string (0 = no seeding), capped at 20000.
export function seedCount(search) {
  const m = /[?&]seed=(\d+)/.exec(search || '');
  return m ? Math.min(Number(m[1]), 20000) : 0;
}

// → { tags, posts }: `n` posts newest first, spread over the last three years,
// with 0–3 tags each (大標籤 or 小標籤), notes on some, a few 精選, a few failed
// or deleted at the source. `samples`: { IMG: { media }, CAR: { media }, … }
// (the web stand-in's sample media; plain objects in tests).
export function seedCollection(n, { samples, now = Date.now(), seed = 1 } = {}) {
  const rand = rng(seed);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const tags = [];
  let createdAt = now - 3 * YEAR;
  TAG_TREE.forEach((p, i) => {
    const parentId = `t_seed${i}`;
    tags.push({ id: parentId, name: p.name, parentId: null, color: p.color, createdAt: createdAt++ });
    p.kids.forEach((name, k) => tags.push({ id: `${parentId}_${k}`, name, parentId, color: p.color, createdAt: createdAt++ }));
  });
  const authors = Array.from({ length: 120 }, (_, i) => (i % 3 === 0 ? `daily.${i}.tw` : i % 3 === 1 ? `eats_${i}` : `fan.club${i}`));

  const posts = [];
  for (let i = 0; i < n; i++) {
    let r = rand();
    const kind = KINDS.find((k) => (r -= k.share) < 0) || KINDS[0];
    const media = (samples?.[kind.sample]?.media || []).map((m) => ({ ...m }));
    // A few authors save a lot (Zipf-like), most only a handful.
    const author = authors[Math.floor(authors.length * rand() ** 2)];
    const code = `${kind.sample}${String(i).padStart(5, '0')}`;
    const savedAt = Math.round(now - (i + rand()) * ((3 * YEAR) / Math.max(n, 1)));
    const roll = rand();
    const status = roll < 0.003 ? 'failed' : roll < 0.008 ? 'sourceDeleted' : 'ready';
    const tagCount = [0, 1, 1, 1, 2, 2, 2, 3][Math.floor(rand() * 8)];
    const tagIds = [];
    for (let k = 0; k < tagCount; k++) {
      const id = pick(tags).id;
      if (!tagIds.includes(id)) tagIds.push(id);
    }
    posts.push({
      id: `p_seed${i}`,
      code,
      url: `https://www.threads.com/@${author}/post/${code}`,
      author,
      caption: `${pick(CAPTIONS)}${rand() < 0.3 ? ` #${i}` : ''}`,
      media,
      cover: media[0]?.poster || null,
      status,
      error: status === 'failed' ? 'network' : null,
      featured: rand() < 0.04,
      downloaded: rand() < 0.3,
      savedAt,
      fetchedAt: savedAt + 1000,
      note: rand() < 0.12 ? pick(NOTES) : '',
      tagIds,
    });
  }
  return { tags, posts };
}
