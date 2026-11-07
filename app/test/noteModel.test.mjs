import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOTE_MAX, mergeNote, normalizeNote, noteFirstLine } from '../src/collection/noteModel.js';

test('normalizeNote trims, caps the length and treats blank as no note', () => {
  assert.equal(normalizeNote('  想帶媽媽去  '), '想帶媽媽去');
  assert.equal(normalizeNote(' \n '), '');
  assert.equal(normalizeNote(null), '');
  assert.equal([...normalizeNote('字'.repeat(NOTE_MAX + 20))].length, NOTE_MAX);
  assert.equal(normalizeNote('🍜'.repeat(NOTE_MAX + 1)), '🍜'.repeat(NOTE_MAX)); // counts characters, not UTF-16 units
});

test('mergeNote keeps an existing note and adds a new one on its own line', () => {
  assert.equal(mergeNote('', '新的'), '新的');
  assert.equal(mergeNote('舊的', ''), '舊的');
  assert.equal(mergeNote('舊的', '新的'), '舊的\n新的');
  assert.equal(mergeNote('一樣', ' 一樣 '), '一樣');
});

test('noteFirstLine', () => {
  assert.equal(noteFirstLine('第一行\n第二行'), '第一行');
  assert.equal(noteFirstLine(''), '');
});
