import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, createGuard } from '../assets/js/router.js';

test('základní trasy', () => {
  assert.deepEqual(parseHash(''), { name: 'home', params: {} });
  assert.deepEqual(parseHash('#/'), { name: 'home', params: {} });
  assert.deepEqual(parseHash('#/kity'), { name: 'kits', params: {} });
  assert.deepEqual(parseHash('#/statistiky'), { name: 'stats', params: {} });
  assert.deepEqual(parseHash('#/kalkulacka'), { name: 'calc', params: {} });
  assert.deepEqual(parseHash('#/info'), { name: 'info', params: {} });
  assert.deepEqual(parseHash('#/soukromi'), { name: 'privacy', params: {} });
});
test('parametry se dekódují', () => {
  assert.deepEqual(parseHash('#/kity/Iron%20Axe'), { name: 'kit', params: { kit: 'Iron Axe' } });
  assert.deepEqual(parseHash('#/hrac/_Ondys'), { name: 'player', params: { nick: '_Ondys' } });
  assert.deepEqual(parseHash('#/porovnani/a/b'), { name: 'compare', params: { a: 'a', b: 'b' } });
  assert.deepEqual(parseHash('#/porovnani'), { name: 'compare', params: {} });
});
test('neznámá nebo poškozená cesta → domů', () => {
  assert.equal(parseHash('#/neexistuje').name, 'home');
  assert.equal(parseHash('#/hrac/%E0%A4%A').name, 'home');
  assert.equal(parseHash('#/kity/a/b/c').name, 'home');
});

test('názvy vlastností Object.prototype nejsou trasy → domů', () => {
  for (const h of ['#/constructor', '#/toString', '#/__proto__', '#/hasOwnProperty']) {
    assert.deepEqual(parseHash(h), { name: 'home', params: {} });
  }
});
test('createGuard: jen poslední navigace je aktuální', () => {
  const g = createGuard();
  const a = g.next();
  assert.ok(g.isCurrent(a));
  const b = g.next();
  assert.ok(!g.isCurrent(a));
  assert.ok(g.isCurrent(b));
});
