import test from 'node:test';
import assert from 'node:assert/strict';
import { recentChanges } from '../assets/js/feed.js';

const players = [
  { username: 'a', modes: {}, history: { X: [{ date: '01.06.2026', tier: 'LT4' }, { date: '05.07.2026', tier: 'LT3' }] } },
  { username: 'b', modes: {}, history: { Y: [{ date: '10.07.2026', tier: 'HT3' }, { date: 'bad', tier: 'HT1' }] } },
];
test('recentChanges: nejnovější první, from = předchozí tier', () => {
  const r = recentChanges(players, 10);
  assert.deepEqual(r.map(x => [x.username, x.from, x.to]), [['b', null, 'HT3'], ['a', 'LT4', 'LT3'], ['a', null, 'LT4']]);
});
test('recentChanges: limit a neplatné datum', () => {
  assert.equal(recentChanges(players, 1).length, 1);
  assert.equal(recentChanges(players, 10).length, 3);
});
test('recentChanges: prázdný vstup', () => {
  assert.deepEqual(recentChanges([], 5), []);
});
