import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlayers, loadPlayers } from '../assets/js/data.js';

const ok = body => async () => ({ ok: true, json: async () => body });
const bad = async () => ({ ok: false, status: 500, json: async () => ({}) });
const good = [{ username: 'a', modes: { X: 'HT3' } }];

test('normalizePlayers zahodí neplatné řádky a doplní prázdné objekty', () => {
  const r = normalizePlayers([{ username: 'a', modes: { X: 'LT3' } }, null, { modes: {} }, { username: '' }]);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0], { username: 'a', modes: { X: 'LT3' }, history: {}, peak: {} });
});
test('normalizePlayers: ne-pole → []', () => {
  assert.deepEqual(normalizePlayers(undefined), []);
  assert.deepEqual(normalizePlayers({}), []);
});
test('hráč s prázdným modes se vyřadí', () => {
  assert.deepEqual(normalizePlayers([{ username: 'a', modes: {} }]), []);
});
test('live OK → source live', async () => {
  const r = await loadPlayers({ fetchImpl: ok(good) });
  assert.equal(r.source, 'live');
  assert.equal(r.players.length, 1);
});
test('live posílá jen hlavičku apikey', async () => {
  let seen;
  await loadPlayers({ fetchImpl: async (url, o) => { seen = o.headers; return ok(good)(); } });
  assert.ok(seen.apikey);
  assert.equal(seen.Authorization, undefined);
});
test('live 500 → fallback', async () => {
  const f = async url => String(url).includes('supabase') ? bad() : ok(good)();
  const r = await loadPlayers({ fetchImpl: f });
  assert.equal(r.source, 'fallback');
});
test('live timeout → fallback', async () => {
  const f = (url, o) => String(url).includes('supabase')
    ? new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(new Error('abort'))))
    : ok(good)();
  const r = await loadPlayers({ fetchImpl: f, timeoutMs: 20 });
  assert.equal(r.source, 'fallback');
});
test('oba zdroje selžou → výjimka', async () => {
  await assert.rejects(loadPlayers({ fetchImpl: bad }));
});

test('live vrátí řádky, ale žádný platný (změna tvaru) → fallback', async () => {
  const f = async url => String(url).includes('supabase') ? ok([{ foo: 1 }, { bar: 2 }])() : ok(good)();
  const r = await loadPlayers({ fetchImpl: f });
  assert.equal(r.source, 'fallback');
  assert.equal(r.players.length, 1);
});
test('live vrátí prázdné pole → platný prázdný stav, ne záloha', async () => {
  const f = async url => String(url).includes('supabase') ? ok([])() : ok(good)();
  const r = await loadPlayers({ fetchImpl: f });
  assert.equal(r.source, 'live');
  assert.deepEqual(r.players, []);
});
