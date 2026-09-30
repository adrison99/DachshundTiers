import test from 'node:test';
import assert from 'node:assert/strict';
import { compare } from '../assets/js/compare.js';

const a = { username: 'a', modes: { X: 'HT3', Y: 'LT3' } };
const b = { username: 'b', modes: { X: 'LT3', Z: 'LT4' } };
test('compare: vítěz po kitech a součty', () => {
  const r = compare(a, b);
  assert.deepEqual(r.rows.map(x => [x.kit, x.winner]), [['X', 'a'], ['Y', 'a'], ['Z', 'b']]);
  assert.equal(r.totalA, 26);
  assert.equal(r.totalB, 13);
});
test('compare: kit jen u jednoho → druhý null', () => {
  const y = compare(a, b).rows.find(x => x.kit === 'Y');
  assert.equal(y.b, null);
  assert.equal(y.a, 'LT3');
});
test('compare: hráč sám se sebou → samé remízy', () => {
  assert.ok(compare(a, a).rows.every(x => x.winner === 'tie'));
});
