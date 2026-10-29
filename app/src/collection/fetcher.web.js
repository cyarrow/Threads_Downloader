// Web build only (used by the automated E2E tests): no WebView, so posts come
// from fake data keyed by the link's shortcode. Codes starting with LOGIN or
// FAIL simulate a logged-out session and a network error.
import { useCallback, useRef } from 'react';
import { parseThreadsUrl } from '../threads';
import { FetchError } from './fetchError';

export { FetchError };

const img = {
  stage: require('./mock/stage.png'),
  food: require('./mock/food.png'),
  mountain: require('./mock/mountain.png'),
  cafe: require('./mock/cafe.png'),
  sea: require('./mock/sea.png'),
  idol: require('./mock/idol.png'),
  cake: require('./mock/cake.png'),
  meme: require('./mock/meme.png'),
};
const still = (image, ratio, type = 'image') => ({ type, url: image, poster: image, ratio });

const SAMPLES = {
  IMG: { caption: '河口湖早上六點的富士山，雲剛好散開。', media: [still(img.mountain, 0.75)] },
  CAR: {
    caption: '台南巷子裡的早午餐，蛋餅皮是現擀的，假日十點前去才不用排。',
    media: [still(img.food, 1), still(img.cafe, 1.25), still(img.cake, 1.1)],
  },
  VID: { caption: '今晚的安可舞台燈光太美了，整場都在尖叫！', media: [still(img.stage, 1.33, 'video')] },
  TXT: { caption: '長大以後才發現，能好好睡一覺、吃一頓熱的飯，就已經是很幸福的一天了。', media: [] },
  MEME: { caption: '週一早上的我 vs 週五下班的我', media: [still(img.meme, 1)] },
  IDOL: { caption: '應援手幅做好了！這次用了漸層燙金', media: [still(img.idol, 1.25)] },
  SEA: { caption: '新歌 MV 拍攝花絮釋出', media: [still(img.sea, 0.5625, 'video')] },
};

export function usePostFetcher() {
  const busy = useRef(0);
  const fetchPost = useCallback(async (url) => {
    const post = parseThreadsUrl(url);
    if (!post) throw new FetchError('invalid');
    busy.current += 1;
    await new Promise((r) => setTimeout(r, 600));
    busy.current -= 1;
    const code = post.code || `S${post.id}`;
    if (code.startsWith('LOGIN')) throw new FetchError('login');
    if (code.startsWith('FAIL')) throw new FetchError('network');
    const key = Object.keys(SAMPLES).find((k) => code.startsWith(k)) || 'IMG';
    const author = (url.match(/@([\w.]+)\//) || [])[1] || 'someone.tw';
    return { code, url: post.url, author, ...SAMPLES[key] };
  }, []);
  return { fetchPost, webView: null, busy: false };
}
