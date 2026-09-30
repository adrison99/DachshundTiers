import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, modesAt, peakOf, minDate, pointsSeries } from '../assets/js/history.js';

const p = {
  username: 'a',
  modes: { X: 'HT3', Y: 'LT4' },
  history: {
    X: [{ date: '16.05.2026', tier: 'LT3' }, { date: '09.07.2026', tier: 'HT3' }],
    Y: [{ date: '01.06.2026', tier: 'LT4' }, { date: 'xx', tier: 'HT1' }],
  },
};

test('parseDate: platné i neplatné datum', () => {
  assert.equal(parseDate('16.05.2026').toISOString().slice(0, 10), '2026-05-16');
  assert.equal(parseDate('31.02.2026'), null);
  assert.equal(parseDate('xx'), null);
  assert.equal(parseDate(undefined), null);
});
test('modesAt: stav k datu, neplatný záznam se ignoruje', () => {
  assert.deepEqual(modesAt(p, parseDate('20.05.2026')), { X: 'LT3' });
  assert.deepEqual(modesAt(p, parseDate('10.07.2026')), { X: 'HT3', Y: 'LT4' });
});
test('modesAt: před prvním záznamem prázdné', () => {
  assert.deepEqual(modesAt(p, parseDate('01.01.2026')), {});
});
test('modesAt: hráč bez historie → prázdné', () => {
  assert.deepEqual(modesAt({ username: 'b', modes: { X: 'HT1' } }, parseDate('01.01.2030')), {});
});
test('peakOf: nejlepší tier z historie i aktuálního stavu', () => {
  assert.deepEqual(peakOf({ modes: { X: 'LT3' }, history: { X: [{ date: '01.01.2026', tier: 'HT3' }, { date: '02.01.2026', tier: 'LT3' }] } }), { X: 'HT3' });
  assert.deepEqual(peakOf({ modes: { X: 'HT2' }, history: {} }), { X: 'HT2' });
});
test('minDate: nejstarší platné datum, bez dat null', () => {
  assert.equal(minDate([p]).toISOString().slice(0, 10), '2026-05-16');
  assert.equal(minDate([]), null);
  assert.equal(minDate([{ username: 'b', modes: {}, history: {} }]), null);
});
test('pointsSeries: běžící součet bodů přes kity, vzestupně', () => {
  const s = pointsSeries(p);
  assert.deepEqual(s.map(x => x.points), [10, 13, 19]);
  assert.ok(s.every((x, i) => i === 0 || s[i - 1].date <= x.date));
});
test('pointsSeries: prázdná historie → []', () => {
  assert.deepEqual(pointsSeries({ username: 'b', modes: {}, history: {} }), []);
});
