import test from 'node:test';
import assert from 'node:assert/strict';
import { score, rankFor } from '../assets/js/calc.js';

test('score sčítá body, prázdný výběr = 0, neznámý tier = 0', () => {
  assert.equal(score({ X: 'HT3', Y: 'LT3' }), 26);
  assert.equal(score({}), 0);
  assert.equal(score({ X: 'nic' }), 0);
});
test('rankFor: pořadí podle bodů, remíza sdílí místo', () => {
  const players = [{ modes: { X: 'HT3' } }, { modes: { X: 'LT3' } }];
  assert.deepEqual(rankFor(26, players), { rank: 1, total: 2 });
  assert.deepEqual(rankFor(16, players), { rank: 1, total: 2 });
  assert.deepEqual(rankFor(10, players), { rank: 2, total: 2 });
  assert.deepEqual(rankFor(0, []), { rank: 1, total: 0 });
});
