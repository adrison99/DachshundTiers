import test from 'node:test';
import assert from 'node:assert/strict';
import { testsCount, badgesFor, tierDistribution, kitPopularity, topTested, testsPerMonth } from '../assets/js/stats.js';

const mk = (u, modes, history = {}) => ({ username: u, modes, history });
const a = mk('a', { X: 'HT1', Y: 'LT3' }, { X: [{ date: '01.06.2026', tier: 'LT3' }, { date: '01.07.2026', tier: 'HT1' }], Y: [{ date: '02.06.2026', tier: 'LT3' }] });
const b = mk('b', { X: 'LT3' }, { X: [{ date: '03.07.2026', tier: 'LT3' }] });

test('testsCount = počet záznamů historie, poškozená historie = 0', () => {
  assert.equal(testsCount(a), 3);
  assert.equal(testsCount({ username: 'c', modes: {}, history: { X: 'bad' } }), 0);
});
test('badgesFor: ht1, all-kits, first-point', () => {
  const ids = badgesFor(a, ['X', 'Y']);
  assert.ok(ids.includes('ht1') && ids.includes('all-kits') && ids.includes('first-point'));
  assert.ok(!ids.includes('tests-50'));
});
test('badgesFor: all-kits nesmí platit pro prázdný seznam kitů', () => {
  assert.ok(!badgesFor(a, []).includes('all-kits'));
});
test('badgesFor: hranice 50 testů', () => {
  const many = mk('m', { X: 'LT5' }, { X: Array.from({ length: 50 }, () => ({ date: '01.06.2026', tier: 'LT5' })) });
  const ids = badgesFor(many, ['X']);
  assert.ok(ids.includes('tests-50') && !ids.includes('tests-100'));
});
test('tierDistribution: v pořadí TIER_ORDER, bez nulových', () => {
  assert.deepEqual(tierDistribution([a, b]), [{ tier: 'HT1', count: 1 }, { tier: 'LT3', count: 2 }]);
});
test('kitPopularity: počet hráčů v kitu, desc', () => {
  assert.deepEqual(kitPopularity([a, b]), [{ kit: 'X', count: 2 }, { kit: 'Y', count: 1 }]);
});
test('topTested: desc, pak jméno, limit', () => {
  assert.deepEqual(topTested([a, b], 1), [{ username: 'a', tests: 3 }]);
});
test('testsPerMonth: vzestupně, neplatná data ignorována', () => {
  const c = mk('c', {}, { X: [{ date: 'bad', tier: 'LT3' }] });
  assert.deepEqual(testsPerMonth([a, b, c]), [{ month: '2026-06', count: 2 }, { month: '2026-07', count: 2 }]);
});
test('prázdné vstupy', () => {
  assert.deepEqual(tierDistribution([]), []);
  assert.deepEqual(testsPerMonth([]), []);
  assert.deepEqual(topTested([], 5), []);
});
