import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlaybackFocus, playbackFocus, playingAfterPageChange } from '../src/collection/playback.js';

const fakePlayer = (name) => {
  const p = { name, pauses: 0, playing: true };
  p.pause = () => {
    p.pauses += 1;
    p.playing = false;
  };
  return p;
};

test('starting a second video pauses the first', () => {
  const focus = createPlaybackFocus();
  const a = fakePlayer('a');
  const b = fakePlayer('b');
  focus.claim(a);
  assert.equal(a.pauses, 0);
  focus.claim(b);
  assert.equal(a.pauses, 1);
  assert.equal(a.playing, false);
  assert.equal(b.pauses, 0);
  assert.equal(focus.current(), b);
});

test('switching back and forth always leaves exactly one playing', () => {
  const focus = createPlaybackFocus();
  const players = [fakePlayer('a'), fakePlayer('b'), fakePlayer('c')];
  for (const x of players) x.playing = false;
  for (const p of [0, 1, 2, 0, 2, 1]) {
    players[p].playing = true;
    focus.claim(players[p]);
    assert.deepEqual(
      players.filter((x) => x.playing).map((x) => x.name),
      [players[p].name],
    );
  }
});

test('the same player claiming again (resume after pause) does not pause itself', () => {
  const focus = createPlaybackFocus();
  const a = fakePlayer('a');
  focus.claim(a);
  focus.claim(a);
  assert.equal(a.pauses, 0);
});

test('a dropped (paused or closed) player is never touched again', () => {
  const focus = createPlaybackFocus();
  const a = fakePlayer('a');
  const b = fakePlayer('b');
  focus.claim(a);
  focus.drop(a);
  assert.equal(focus.current(), null);
  focus.claim(b);
  assert.equal(a.pauses, 0);
});

test('dropping a player that does not hold playback changes nothing', () => {
  const focus = createPlaybackFocus();
  const a = fakePlayer('a');
  const b = fakePlayer('b');
  focus.claim(a);
  focus.drop(b);
  assert.equal(focus.current(), a);
});

test('a player that throws on pause (already released) does not break the claim', () => {
  const focus = createPlaybackFocus();
  const gone = { pause: () => { throw new Error('released'); } };
  const b = fakePlayer('b');
  focus.claim(gone);
  assert.doesNotThrow(() => focus.claim(b));
  assert.equal(focus.current(), b);
});

test('the app-wide instance is shared', () => {
  assert.equal(typeof playbackFocus.claim, 'function');
  assert.equal(typeof playbackFocus.drop, 'function');
});

test('pager: leaving the playing page returns it to the poster', () => {
  assert.equal(playingAfterPageChange(0, 1), -1);
  assert.equal(playingAfterPageChange(2, 0), -1);
});

test('pager: settling back on the playing page keeps it playing', () => {
  assert.equal(playingAfterPageChange(1, 1), 1);
  assert.equal(playingAfterPageChange(-1, 0), -1);
});
