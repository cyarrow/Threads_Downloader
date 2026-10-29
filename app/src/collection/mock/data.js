// Fake data for the UI prototype only. Names and posts are fictional.
const img = {
  stage: require('./stage.png'),
  food: require('./food.png'),
  mountain: require('./mountain.png'),
  cafe: require('./cafe.png'),
  street: require('./street.png'),
  sea: require('./sea.png'),
  idol: require('./idol.png'),
  cake: require('./cake.png'),
  meme: require('./meme.png'),
  night: require('./night.png'),
};

// Two levels: parentId null = 大標籤.
export const TAGS = [
  { id: 'fan', name: '追星', parentId: null, color: 'rose' },
  { id: 'fan-a', name: '星光少年團', parentId: 'fan', color: 'rose' },
  { id: 'fan-b', name: 'Aurora 樂團', parentId: 'fan', color: 'rose' },
  { id: 'life', name: '生活', parentId: null, color: 'green' },
  { id: 'life-home', name: '居家', parentId: 'life', color: 'green' },
  { id: 'life-ootd', name: '穿搭', parentId: 'life', color: 'green' },
  { id: 'food', name: '美食', parentId: null, color: 'orange' },
  { id: 'food-dessert', name: '甜點', parentId: 'food', color: 'orange' },
  { id: 'food-cafe', name: '咖啡廳', parentId: 'food', color: 'orange' },
  { id: 'trip', name: '旅遊', parentId: null, color: 'sky' },
  { id: 'trip-jp', name: '日本', parentId: 'trip', color: 'sky' },
  { id: 'trip-tainan', name: '台南', parentId: 'trip', color: 'sky' },
  { id: 'meme', name: '梗圖', parentId: null, color: 'violet' },
];

const HOUR = 3600 * 1000;
const now = Date.now();

// media: [{ type: 'image' | 'video', image, ratio (height / width) }]
export const POSTS = [
  {
    id: 'p1', author: 'starlight.daily', featured: true, downloaded: true,
    caption: '今晚的安可舞台燈光太美了，整場都在尖叫。最後一首大合唱大家都哭了，這輩子一定要再來一次！',
    media: [{ type: 'video', image: img.stage, ratio: 1.33 }],
    tagIds: ['fan-a'], savedAt: now - 2 * HOUR,
  },
  {
    id: 'p2', author: 'tainan.eats',
    caption: '台南巷子裡的早午餐，蛋餅皮是現擀的，假日十點前去才不用排。',
    media: [{ type: 'image', image: img.food, ratio: 1 }, { type: 'image', image: img.cafe, ratio: 1.25 }, { type: 'image', image: img.cake, ratio: 1.1 }],
    tagIds: ['food', 'trip-tainan'], savedAt: now - 5 * HOUR,
  },
  {
    id: 'p3', author: 'quiet.notes',
    caption: '長大以後才發現，能好好睡一覺、吃一頓熱的飯、有人記得你喜歡什麼，就已經是很幸福的一天了。\n\n今天也辛苦了。',
    media: [], tagIds: ['life'], savedAt: now - 8 * HOUR,
  },
  {
    id: 'p4', author: 'jp.travel.memo',
    caption: '河口湖早上六點的富士山，雲剛好散開。',
    media: [{ type: 'image', image: img.mountain, ratio: 0.75 }],
    tagIds: ['trip-jp'], savedAt: now - 26 * HOUR,
  },
  {
    id: 'p5', author: 'aurora.band.fan', downloaded: true,
    caption: '新歌 MV 拍攝花絮釋出！主唱在海邊那段真的太好看',
    media: [{ type: 'video', image: img.sea, ratio: 0.5625 }],
    tagIds: ['fan-b'], savedAt: now - 30 * HOUR,
  },
  {
    id: 'p6', author: 'meme.factory',
    caption: '週一早上的我 vs 週五下班的我',
    media: [{ type: 'image', image: img.meme, ratio: 1 }],
    tagIds: ['meme'], savedAt: now - 2 * 24 * HOUR,
  },
  {
    id: 'p7', author: 'cozy.home.lab',
    caption: '小坪數客廳改造，燈光換成暖色之後整個氛圍差好多。附上清單在留言。',
    media: [{ type: 'image', image: img.cafe, ratio: 1.25 }, { type: 'image', image: img.night, ratio: 0.6 }],
    tagIds: ['life-home'], savedAt: now - 3 * 24 * HOUR,
  },
  {
    id: 'p8', author: 'city.walker', status: 'sourceDeleted',
    caption: '下雨後的街道反光很好拍，手機夜景模式就夠了。',
    media: [{ type: 'image', image: img.street, ratio: 1.5 }],
    tagIds: [], savedAt: now - 4 * 24 * HOUR,
  },
  {
    id: 'p9', author: 'sweet.tooth.tw',
    caption: '草莓季限定蛋糕，奶油不甜不膩，一個人可以吃完一整塊。',
    media: [{ type: 'image', image: img.cake, ratio: 1.1 }],
    tagIds: ['food-dessert'], savedAt: now - 5 * 24 * HOUR,
  },
  {
    id: 'p10', author: 'starlight.daily',
    caption: '應援手幅做好了！這次用了漸層燙金，大家覺得怎麼樣',
    media: [{ type: 'image', image: img.idol, ratio: 1.25 }],
    tagIds: ['fan-a', 'life'], savedAt: now - 6 * 24 * HOUR,
  },
  {
    id: 'p11', author: 'night.owl', status: 'failed',
    caption: '', media: [], tagIds: [], savedAt: now - 7 * 24 * HOUR,
  },
  {
    id: 'p12', author: 'quiet.notes',
    caption: '收藏一句話：「不用急著變成很厲害的人，先成為自己喜歡的人。」',
    media: [], tagIds: ['life'], savedAt: now - 9 * 24 * HOUR,
  },
];

// What a newly pasted/shared link turns into once "loading" finishes.
export const INCOMING = {
  author: 'aurora.band.fan',
  caption: '巡演台北場加開！明天中午十二點開賣，大家手速要快',
  media: [{ type: 'image', image: img.night, ratio: 0.6 }],
};
