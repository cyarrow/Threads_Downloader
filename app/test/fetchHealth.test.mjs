import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  authorOf,
  createHealthTracker,
  failureLabel,
  failureSummary,
  initialHealth,
  noteLogin,
  recordOutcome,
} from '../src/collection/fetchHealth.js';
import { FetchError } from '../src/collection/fetchError.js';

const link = (user, code) => `https://www.threads.com/@${user}/post/${code}`;
const miss = (url, structural = false) => ({ type: 'miss', url, structural });

// Runs outcomes in order from a state; returns the kinds and the last result.
function run(outcomes, state = initialHealth()) {
  const kinds = [];
  let last;
  for (const o of outcomes) {
    last = recordOutcome(state, o);
    state = last.state;
    kinds.push(last.kind);
  }
  return { kinds, last, state };
}

test('authorOf reads the user from post links only', () => {
  assert.equal(authorOf(link('Jp.Travel', 'A')), 'jp.travel');
  assert.equal(authorOf('https://www.threads.com/t/ABC'), null);
  assert.equal(authorOf('https://www.threads.com/share/xyz/'), null);
  assert.equal(authorOf(undefined), null);
});

test('without any sign of a working session, an empty page means login (old behaviour)', () => {
  const { kinds } = run([miss(link('a', '1')), miss(link('b', '2')), miss(link('c', '3')), miss(link('d', '4'))]);
  assert.deepEqual(kinds, ['login', 'login', 'login', 'login']);
});

test('a redirect to /login is always login and forgets the session', () => {
  const { kinds, state } = run([{ type: 'ok' }, { type: 'loggedOut' }, miss(link('a', '1'))]);
  assert.deepEqual(kinds, [null, 'login', 'login']);
  assert.equal(state.loggedIn, false);
});

test('one empty page while logged in is a deleted / private post, not breakage', () => {
  const { kinds } = run([{ type: 'ok' }, miss(link('a', '1'))]);
  assert.deepEqual(kinds, [null, 'invalid']);
});

test('several different posts by different authors in a row → parse, earlier ones relabelled', () => {
  const a = link('a', '1');
  const b = link('b', '2');
  const c = link('c', '3');
  const { kinds, last } = run([{ type: 'ok' }, miss(a), miss(b), miss(c)]);
  assert.deepEqual(kinds, [null, 'invalid', 'invalid', 'parse']);
  assert.deepEqual(last.reclassify, [a, b]);
  // Further misses stay parse until something loads again.
  const more = recordOutcome(last.state, miss(link('d', '4')));
  assert.equal(more.kind, 'parse');
  assert.deepEqual(more.reclassify, [a, b, c]);
});

test('one author deleting several posts is not breakage', () => {
  const { kinds } = run([{ type: 'ok' }, miss(link('a', '1')), miss(link('a', '2')), miss(link('a', '3')), miss(link('a', '4'))]);
  assert.deepEqual(kinds, [null, 'invalid', 'invalid', 'invalid', 'invalid']);
});

test('retrying the same missing post does not build a streak', () => {
  const gone = link('a', '1');
  const { kinds } = run([{ type: 'ok' }, miss(gone), miss(gone), miss(gone), miss(link('b', '2'))]);
  assert.deepEqual(kinds, [null, 'invalid', 'invalid', 'invalid', 'invalid']);
});

test('a success in between resets the streak', () => {
  const { kinds } = run([{ type: 'ok' }, miss(link('a', '1')), miss(link('b', '2')), { type: 'ok' }, miss(link('c', '3'))]);
  assert.deepEqual(kinds, [null, 'invalid', 'invalid', null, 'invalid']);
});

test('timeouts and network errors neither break nor extend a streak', () => {
  const { kinds } = run([
    { type: 'ok' },
    miss(link('a', '1')),
    { type: 'error', kind: 'timeout' },
    miss(link('b', '2')),
    { type: 'error', kind: 'network' },
    miss(link('c', '3')),
  ]);
  assert.deepEqual(kinds, [null, 'invalid', 'timeout', 'invalid', 'network', 'parse']);
});

test('links without an author (/t/, /share/) count as different authors', () => {
  const { kinds } = run([
    { type: 'ok' },
    miss('https://www.threads.com/t/AAA'),
    miss('https://www.threads.com/t/BBB'),
    miss('https://www.threads.com/share/ccc/'),
  ]);
  assert.deepEqual(kinds, [null, 'invalid', 'invalid', 'parse']);
});

test('page data present but unreadable twice → parse even before a success', () => {
  const a = link('a', '1');
  const { kinds, last } = run([miss(a, true), miss(link('a', '2'), true)]);
  assert.deepEqual(kinds, ['network', 'parse']);
  assert.deepEqual(last.reclassify, [a]);
});

test('logging in clears old (logged-out) misses and counts as a working session', () => {
  const before = run([miss(link('a', '1')), miss(link('b', '2'))]).state;
  let state = noteLogin(before);
  assert.deepEqual(state, { loggedIn: true, streak: [] });
  const r = recordOutcome(state, miss(link('c', '3')));
  assert.equal(r.kind, 'invalid');
  state = r.state;
  state = recordOutcome(state, miss(link('d', '4'))).state;
  assert.equal(recordOutcome(state, miss(link('a', '1'))).kind, 'parse');
});

test('tracker returns FetchErrors carrying the links to relabel', () => {
  const h = createHealthTracker();
  assert.equal(h.record({ type: 'ok' }), null);
  h.record(miss(link('a', '1')));
  h.record(miss(link('b', '2')));
  const e = h.record(miss(link('c', '3')));
  assert.ok(e instanceof FetchError);
  assert.equal(e.kind, 'parse');
  assert.equal(e.reclassify.length, 2);
  assert.equal(h.record({ type: 'error', kind: 'invalid' }).kind, 'invalid');
  h.noteLogin();
  assert.equal(h.record(miss(link('d', '4'))).kind, 'invalid');
});

const failed = (error) => ({ status: 'failed', error });

test('failureSummary: one plain failure is left to its card', () => {
  assert.equal(failureSummary([]), null);
  assert.equal(failureSummary([failed('network'), { status: 'ready' }, { status: 'loading' }]), null);
});

test('failureSummary: two or more failures → retry-all banner', () => {
  assert.deepEqual(failureSummary([failed('network'), failed('timeout'), failed(null)]), { kind: 'failed', count: 3 });
});

test('failureSummary: any login failure wins and counts only login cards', () => {
  assert.deepEqual(failureSummary([failed('login'), failed('network'), failed('parse')]), { kind: 'login', count: 1 });
});

test('failureSummary: suspected breakage shows even for one card, counting everything retry-all retries', () => {
  assert.deepEqual(failureSummary([failed('parse')]), { kind: 'parse', count: 1 });
  assert.deepEqual(failureSummary([failed('parse'), failed('invalid')]), { kind: 'parse', count: 2 });
});

test('failureLabel words each kind for the card', () => {
  assert.equal(failureLabel('login'), '需要登入 Threads');
  assert.equal(failureLabel('invalid'), '可能已刪除或不公開');
  assert.equal(failureLabel('parse'), '暫時讀不到內容');
  assert.equal(failureLabel('network'), '讀取失敗');
  assert.equal(failureLabel(null), '讀取失敗');
});
