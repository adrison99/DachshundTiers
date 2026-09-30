import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTier, tierPoints, playerPoints, sortPlayers } from '../assets/js/tiers.js';

test('LT3E se počítá jako LT3', () => {
  assert.equal(normalizeTier('LT3E'), 'LT3');
  assert.equal(tierPoints('LT3E'), 10);
});
test('LT3 EVAL se počítá jako LT3', () => {
  assert.equal(normalizeTier('LT3 EVAL'), 'LT3');
});
test('body podle dnešního tierConfig', () => {
  assert.equal(tierPoints('HT1'), 60);
  assert.equal(tierPoints('RLT2'), 22);
  assert.equal(tierPoints('LT5'), 1);
});
test('neznámý tier = 0 bodů, nevyhodí', () => {
  assert.equal(tierPoints('XYZ'), 0);
  assert.equal(tierPoints(undefined), 0);
  assert.equal(tierPoints(null), 0);
});
test('playerPoints sčítá a toleruje prázdné modes', () => {
  assert.equal(playerPoints({ A: 'HT3', B: 'LT3' }), 26);
  assert.equal(playerPoints({}), 0);
  assert.equal(playerPoints(undefined), 0);
});
test('sortPlayers: body desc, pak jméno', () => {
  const s = sortPlayers([
    { username: 'b', modes: { A: 'LT3' } },
    { username: 'a', modes: { A: 'LT3' } },
    { username: 'c', modes: { A: 'HT3' } },
  ]);
  assert.deepEqual(s.map(p => p.username), ['c', 'a', 'b']);
});
