import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseThreadsUrl, extractPost, fileName, isLoggedInUrl } from '../src/threads.js';

const extractMedia = (...args) => extractPost(...args).media;

// Shape mirrors the JSON Threads embeds in its pages; values are synthetic.
const page = (post, extra = []) =>
  JSON.stringify({ require: [['x', { result: { data: { thread_items: [...extra, { post }] } } }]] });

const videoPost = {
  code: 'VID123',
  media_type: 2,
  video_versions: [
    { type: 101, url: 'https://cdn.example/v_low.mp4', width: 480, height: 854 },
    { type: 102, url: 'https://cdn.example/v_hd.mp4', width: 1080, height: 1920 },
  ],
  image_versions2: { candidates: [{ url: 'https://cdn.example/thumb.jpg', width: 1080, height: 1920 }] },
};

test('parseThreadsUrl handles .net/.com, /t/ links, and surrounding text', () => {
  assert.deepEqual(parseThreadsUrl('look https://www.threads.net/@some.user/post/ABC-_1?xmt=1 wow'), {
    id: 'ABC-_1',
    code: 'ABC-_1',
    url: 'https://www.threads.com/@some.user/post/ABC-_1',
  });
  assert.deepEqual(parseThreadsUrl('https://threads.com/t/XYZ'), {
    id: 'XYZ',
    code: 'XYZ',
    url: 'https://www.threads.com/t/XYZ',
  });
  assert.equal(parseThreadsUrl('https://instagram.com/p/ABC'), null);
});

test('parseThreadsUrl accepts the app\'s /share/ links without knowing the post code yet', () => {
  assert.deepEqual(parseThreadsUrl('https://www.threads.com/share/L0RUsdZj1/'), {
    id: 'L0RUsdZj1',
    code: null,
    url: 'https://www.threads.com/share/L0RUsdZj1/',
  });
  assert.equal(parseThreadsUrl(undefined), null);
});

test('picks the highest-resolution video, not the thumbnail', () => {
  assert.deepEqual(extractMedia([page(videoPost)], 'VID123'), [
    {
      type: 'video',
      url: 'https://cdn.example/v_hd.mp4',
      width: 1080,
      height: 1920,
      thumb: 'https://cdn.example/thumb.jpg',
    },
  ]);
});

test('carousel returns every item, mixing videos and images', () => {
  const post = {
    code: 'CAR1',
    media_type: 8,
    image_versions2: { candidates: [] },
    carousel_media: [
      { media_type: 1, video_versions: null, image_versions2: { candidates: [
        { url: 'https://cdn.example/a_small.jpg', width: 320, height: 320 },
        { url: 'https://cdn.example/a.jpg', width: 1440, height: 1440 },
      ] } },
      { media_type: 2, video_versions: [{ url: 'https://cdn.example/b.mp4', width: 720, height: 1280 }] },
    ],
  };
  assert.deepEqual(
    extractMedia([page(post)], 'CAR1').map((m) => m.url),
    ['https://cdn.example/a.jpg', 'https://cdn.example/b.mp4'],
  );
});

test('ignores replies and other posts in the same page', () => {
  const reply = { ...videoPost, code: 'OTHER', video_versions: [{ url: 'https://cdn.example/reply.mp4' }] };
  const media = extractMedia(['not json', page(videoPost, [{ post: reply }])], 'VID123');
  assert.equal(media[0].url, 'https://cdn.example/v_hd.mp4');
});

test('falls back to rendered <video> sources, skipping blob: urls', () => {
  assert.deepEqual(
    extractMedia([], 'NOPE', ['blob:https://threads.com/1', 'https://cdn.example/x.mp4', 'https://cdn.example/x.mp4']),
    [{ type: 'video', url: 'https://cdn.example/x.mp4' }],
  );
});

test('text-only post yields nothing', () => {
  const post = { code: 'TXT', media_type: 19, video_versions: null, image_versions2: { candidates: [] } };
  assert.deepEqual(extractMedia([page(post)], 'TXT'), []);
});

test('fileName picks an extension from the media type', () => {
  assert.equal(fileName('C', 0, { type: 'video', url: 'u' }), 'threads_C_1.mp4');
  assert.equal(fileName('C', 1, { type: 'image', url: 'https://x/a.webp?s=1' }), 'threads_C_2.webp');
  assert.equal(fileName('C', 2, { type: 'image', url: 'https://x/a.jpg' }), 'threads_C_3.jpg');
});

test('isLoggedInUrl: only a regular threads.com page counts as logged in', () => {
  assert.equal(isLoggedInUrl('https://www.threads.com/'), true);
  assert.equal(isLoggedInUrl('https://www.threads.com/@someone/post/ABC'), true);
  assert.equal(isLoggedInUrl('https://www.threads.com/login?show_choice_screen=false'), false);
  assert.equal(isLoggedInUrl('https://www.threads.com/accounts/login/'), false);
  assert.equal(isLoggedInUrl('https://www.instagram.com/accounts/login/'), false);
  assert.equal(isLoggedInUrl('https://www.threads.com.evil.example/'), false);
  assert.equal(isLoggedInUrl('about:blank'), false);
});

test('extractPost returns author, caption, and a grid-sized thumbnail per item', () => {
  const post = {
    code: 'CAP1',
    media_type: 1,
    user: { username: 'someone' },
    caption: { text: 'hello' },
    image_versions2: { candidates: [
      { url: 'https://cdn.example/full.jpg', width: 1440, height: 1440 },
      { url: 'https://cdn.example/s640.jpg', width: 640, height: 640 },
      { url: 'https://cdn.example/s320.jpg', width: 320, height: 320 },
      { url: 'https://cdn.example/s150.jpg', width: 150, height: 150 },
    ] },
  };
  const result = extractPost([page(post)], 'CAP1');
  assert.equal(result.author, 'someone');
  assert.equal(result.caption, 'hello');
  assert.equal(result.media[0].url, 'https://cdn.example/full.jpg');
  assert.equal(result.media[0].thumb, 'https://cdn.example/s320.jpg');
});

test('extractPost leaves author and caption null when only <video> tags were found', () => {
  assert.deepEqual(extractPost([], 'X', ['https://cdn.example/x.mp4']), {
    author: null,
    caption: null,
    media: [{ type: 'video', url: 'https://cdn.example/x.mp4' }],
  });
});
