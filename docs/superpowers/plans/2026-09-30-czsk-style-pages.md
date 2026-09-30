# Stránky a design ve stylu czsktiers.eu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vícestránkový web (Domů se stroje času, Kity, Hráč, Statistiky, Porovnání, Kalkulačka, Info, Soukromí) v černo-zlatém stylu czsktiers.eu nad stávajícím view `public_players`.

**Architecture:** Čistá logika (datum, historie, feed, statistiky, porovnání, kalkulačka, router) v samostatných ES modulech bez DOM, pokrytá `node --test`. Tenký shell `app.js` načte data jednou, hash router vybere zobrazení z `assets/js/views/`, každé zobrazení je funkce `render(root, ctx)`.

**Tech Stack:** vanilla ES moduly, CSS proměnné, inline SVG pro grafy, `node --test`, headless Brave pro screenshoty.

**Spec:** `docs/superpowers/specs/2026-09-30-czsk-style-pages-design.md` (navazuje na `2026-09-30-live-supabase-redesign-design.md`)

## Global Constraints

- Web zůstává statický (GitHub Pages), bez build kroku a bez externích JS knihoven; hash routing.
- Paleta: pozadí `#0a0b0f`, karty `#14161c` / `#1c1f27`, akcent zlatá `#e8c14a`, text `#e6e8ee`, tlumený text `#8b93a4`; fonty Space Grotesk (nadpisy, čísla) a Inter (text).
- Žádný kód, logo ani fotografie z czsktiers.eu se nekopíruje.
- Bez změn v databázi a v botu; data jen z `public_players` (`username`, `modes`, `history`, `peak`).
- Datum v historii `DD.MM.YYYY`; `LT3E` / `LT3 EVAL` se počítá jako LT3 (`normalizeTier`).
- Všechen text z dat přes `esc()`; hráč i kit v URL přes `encodeURIComponent` / `decodeURIComponent`.
- Počet testů = počet záznamů v `history` (odhad). Peak tiery se odvozují z historie.
- Responzivita od 360 px, viditelný focus, `prefers-reduced-motion` respektován, bez horizontálního scrollu.
- Žádné `git commit`/`push` bez výslovné žádosti uživatele (globální pravidlo) — plán neobsahuje commit kroky.
- Vynechat: Live testy, přihlášení, profil/bio, Tier Tagger mód, Subtiers, region CZ/SK, Podmínky, Kontakt.

## Review Focus

- Neexistující hráč nebo kit v URL (i se znaky `%`, `/`, `<`): stránka "nenalezeno" s odkazem domů, žádná výjimka, žádný XSS.
- Neplatné nebo chybějící datum v historii: ignoruje se jen ten záznam; stroj času, feed i statistiky nespadnou.
- Stroj času na datum před prvním záznamem hráče: hráč se nezobrazí; na dnešek se použije aktuální `modes`.
- Prázdná data / jeden hráč / kit bez hráčů / hráč bez historie: prázdné stavy, žádné dělení nulou ani `NaN` v grafech.
- Porovnání hráče se sebou samým a hráče s kitem, který druhý nemá: remíza, respektive výhra za kit, který má jen jeden.
- Falešný přechod mezi stránkami: starý `#/hrac/x` po obnovení dat (Zkusit znovu) stále funguje.

---

## File Structure

- `assets/js/router.js` — `parseHash`
- `assets/js/history.js` — `parseDate`, `modesAt`, `peakOf`, `minDate`, `pointsSeries`
- `assets/js/feed.js` — `recentChanges`
- `assets/js/stats.js` — `testsCount`, `badgesFor`, `tierDistribution`, `kitPopularity`, `topTested`, `testsPerMonth`
- `assets/js/compare.js` — `compare`
- `assets/js/calc.js` — `score`, `rankFor`
- `assets/js/views/{home,kits,player,stats,compare,calc,info,privacy}.js` — zobrazení
- `assets/js/ui.js` — sdílené HTML helpery (`kitLogo`, `head`, `badges`, `accent`, `KIT_ACCENTS`, `PNG_KITS`)
- `assets/js/app.js` — shell (přepsat), `assets/css/style.css` (přepsat), `index.html` (upravit)
- `tests/*.test.mjs` — testy modulů

Sdílené typy: `Player = {username, modes: Record<kit,tier>, history: Record<kit,{date:string,tier:string}[]>, peak}`; `ctx = {players: Player[], kits: string[]}`.

---

### Task 1: Datum a historie (TDD)

**Files:** Create `assets/js/history.js`; Test `tests/history.test.mjs`

**Interfaces:** Consumes `tierPoints`, `normalizeTier` z `tiers.js`. Produces:
`parseDate(s: string): Date|null` (UTC půlnoc), `modesAt(player, date: Date): Record<string,string>`,
`peakOf(player): Record<string,string>`, `minDate(players): Date|null`,
`pointsSeries(player): {date: Date, points: number}[]` (vzestupně).

- [ ] **Step 1: Napsat testy**

```js
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
```

- [ ] **Step 2: Spustit, musí selhat** — `node --test tests/history.test.mjs` → ERR_MODULE_NOT_FOUND.

- [ ] **Step 3: Implementace**

```js
import { tierPoints, normalizeTier } from './tiers.js';

export function parseDate(s) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(s ?? '').trim());
  if (!m) return null;
  const [d, mo, y] = [+m[1], +m[2], +m[3]];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d ? date : null;
}

const entriesOf = h => (Array.isArray(h) ? h : []);

export function modesAt(player, date) {
  const out = {};
  for (const [kit, entries] of Object.entries(player.history ?? {})) {
    let last = null;
    for (const e of entriesOf(entries)) {
      const d = parseDate(e?.date);
      if (d && d <= date) last = e.tier;
    }
    if (last) out[kit] = last;
  }
  return out;
}

export function peakOf(player) {
  const best = {};
  const consider = (kit, tier) => {
    if (!tier) return;
    if (!(kit in best) || tierPoints(tier) > tierPoints(best[kit])) best[kit] = normalizeTier(tier);
  };
  for (const [kit, entries] of Object.entries(player.history ?? {})) entriesOf(entries).forEach(e => consider(kit, e?.tier));
  for (const [kit, tier] of Object.entries(player.modes ?? {})) consider(kit, tier);
  return best;
}

export function minDate(players) {
  let min = null;
  for (const p of players) for (const entries of Object.values(p.history ?? {})) for (const e of entriesOf(entries)) {
    const d = parseDate(e?.date);
    if (d && (!min || d < min)) min = d;
  }
  return min;
}

export function pointsSeries(player) {
  const events = [];
  for (const [kit, entries] of Object.entries(player.history ?? {})) entriesOf(entries).forEach((e, i) => {
    const date = parseDate(e?.date);
    if (date) events.push({ kit, tier: e.tier, date, i });
  });
  events.sort((a, b) => a.date - b.date || a.i - b.i);
  const current = {};
  return events.map(ev => {
    current[ev.kit] = tierPoints(ev.tier);
    return { date: ev.date, points: Object.values(current).reduce((s, n) => s + n, 0) };
  });
}
```

- [ ] **Step 4: Spustit, musí projít** — `node --test tests/history.test.mjs` → 8/8 PASS.

---

### Task 2: Feed a statistiky (TDD)

**Files:** Create `assets/js/feed.js`, `assets/js/stats.js`; Test `tests/feed.test.mjs`, `tests/stats.test.mjs`

**Interfaces:** Consumes `parseDate`, `peakOf` (Task 1), `tierPoints`, `normalizeTier`, `playerPoints`, `TIER_ORDER` (tiers.js). Produces:
`recentChanges(players, limit): {username, kit, from: string|null, to: string, date: Date}[]` (nejnovější první),
`testsCount(player): number`, `badgesFor(player, allKits: string[]): string[]` (ids `first-point`, `ht1`, `all-kits`, `tests-50`, `tests-100`, `tests-200`),
`tierDistribution(players): {tier, count}[]`, `kitPopularity(players): {kit, count}[]`, `topTested(players, n): {username, tests}[]`, `testsPerMonth(players): {month: 'YYYY-MM', count}[]`.

- [ ] **Step 1: Napsat testy**

`tests/feed.test.mjs`:
```js
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
```

`tests/stats.test.mjs`:
```js
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
```

- [ ] **Step 2: Spustit, musí selhat** — `node --test tests/feed.test.mjs tests/stats.test.mjs` → ERR_MODULE_NOT_FOUND.

- [ ] **Step 3: Implementace**

`assets/js/feed.js`:
```js
import { parseDate } from './history.js';
import { normalizeTier } from './tiers.js';

export function recentChanges(players, limit) {
  const out = [];
  let seq = 0;
  for (const p of players) for (const [kit, entries] of Object.entries(p.history ?? {})) {
    if (!Array.isArray(entries)) continue;
    let prev = null;
    for (const e of entries) {
      const date = parseDate(e?.date);
      const to = normalizeTier(e?.tier);
      if (date) out.push({ username: p.username, kit, from: prev, to, date, seq: seq++ });
      prev = to;
    }
  }
  out.sort((a, b) => b.date - a.date || b.seq - a.seq);
  return out.slice(0, limit).map(({ seq, ...rest }) => rest);
}
```

`assets/js/stats.js`:
```js
import { parseDate, peakOf } from './history.js';
import { normalizeTier, playerPoints, TIER_ORDER } from './tiers.js';

export function testsCount(player) {
  return Object.values(player.history ?? {}).reduce((n, h) => n + (Array.isArray(h) ? h.length : 0), 0);
}

export function badgesFor(player, allKits) {
  const ids = [];
  if (playerPoints(player.modes) > 0) ids.push('first-point');
  if (Object.values(peakOf(player)).some(t => normalizeTier(t) === 'HT1')) ids.push('ht1');
  if (allKits.length && allKits.every(k => player.modes?.[k])) ids.push('all-kits');
  const n = testsCount(player);
  for (const t of [50, 100, 200]) if (n >= t) ids.push(`tests-${t}`);
  return ids;
}

export function tierDistribution(players) {
  const counts = {};
  for (const p of players) for (const t of Object.values(p.modes ?? {})) {
    const c = normalizeTier(t);
    counts[c] = (counts[c] ?? 0) + 1;
  }
  const known = TIER_ORDER.filter(t => counts[t]).map(tier => ({ tier, count: counts[tier] }));
  const unknown = Object.keys(counts).filter(t => !TIER_ORDER.includes(t)).sort().map(tier => ({ tier, count: counts[tier] }));
  return [...known, ...unknown];
}

export function kitPopularity(players) {
  const counts = {};
  for (const p of players) for (const k of Object.keys(p.modes ?? {})) counts[k] = (counts[k] ?? 0) + 1;
  return Object.entries(counts).map(([kit, count]) => ({ kit, count })).sort((a, b) => b.count - a.count || a.kit.localeCompare(b.kit));
}

export function topTested(players, n) {
  return players.map(p => ({ username: p.username, tests: testsCount(p) }))
    .sort((a, b) => b.tests - a.tests || a.username.localeCompare(b.username)).slice(0, n);
}

export function testsPerMonth(players) {
  const counts = {};
  for (const p of players) for (const entries of Object.values(p.history ?? {})) {
    if (!Array.isArray(entries)) continue;
    for (const e of entries) {
      const d = parseDate(e?.date);
      if (d) { const m = d.toISOString().slice(0, 7); counts[m] = (counts[m] ?? 0) + 1; }
    }
  }
  return Object.keys(counts).sort().map(month => ({ month, count: counts[month] }));
}
```

- [ ] **Step 4: Spustit, musí projít** — `node --test tests/` → vše PASS.

---

### Task 3: Porovnání, kalkulačka a router (TDD)

**Files:** Create `assets/js/compare.js`, `assets/js/calc.js`, `assets/js/router.js`; Test `tests/compare.test.mjs`, `tests/calc.test.mjs`, `tests/router.test.mjs`

**Interfaces:** Consumes `tierPoints`, `playerPoints`. Produces:
`compare(a, b): {rows: {kit, a: string|null, b: string|null, winner: 'a'|'b'|'tie'}[], totalA: number, totalB: number}`,
`score(selection: Record<string,string>): number`, `rankFor(score, players): {rank: number, total: number}`,
`parseHash(hash: string): {name: 'home'|'kits'|'kit'|'player'|'stats'|'compare'|'calc'|'info'|'privacy', params: object}`.

- [ ] **Step 1: Napsat testy**

`tests/compare.test.mjs`:
```js
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
test('compare: kit jen u jednoho → a/b null, vyhrává ten, kdo ho má', () => {
  const y = compare(a, b).rows.find(x => x.kit === 'Y');
  assert.equal(y.b, null);
});
test('compare: hráč sám se sebou → samé remízy', () => {
  assert.ok(compare(a, a).rows.every(x => x.winner === 'tie'));
});
```

`tests/calc.test.mjs`:
```js
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
  assert.deepEqual(rankFor(10, players), { rank: 2, total: 2 });
  assert.deepEqual(rankFor(0, []), { rank: 1, total: 0 });
});
```

`tests/router.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHash } from '../assets/js/router.js';

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
```

- [ ] **Step 2: Spustit, musí selhat** — `node --test tests/compare.test.mjs tests/calc.test.mjs tests/router.test.mjs` → ERR_MODULE_NOT_FOUND.

- [ ] **Step 3: Implementace**

`assets/js/compare.js`:
```js
import { tierPoints, playerPoints, normalizeTier } from './tiers.js';

export function compare(a, b) {
  const kits = [...new Set([...Object.keys(a.modes ?? {}), ...Object.keys(b.modes ?? {})])].sort();
  const rows = kits.map(kit => {
    const ta = a.modes?.[kit] ? normalizeTier(a.modes[kit]) : null;
    const tb = b.modes?.[kit] ? normalizeTier(b.modes[kit]) : null;
    const pa = tierPoints(ta), pb = tierPoints(tb);
    return { kit, a: ta, b: tb, winner: pa > pb ? 'a' : pb > pa ? 'b' : 'tie' };
  });
  return { rows, totalA: playerPoints(a.modes), totalB: playerPoints(b.modes) };
}
```

`assets/js/calc.js`:
```js
import { tierPoints, playerPoints } from './tiers.js';

export const score = selection => Object.values(selection ?? {}).reduce((s, t) => s + tierPoints(t), 0);

export function rankFor(value, players) {
  return { rank: 1 + players.filter(p => playerPoints(p.modes) > value).length, total: players.length };
}
```

`assets/js/router.js`:
```js
const STATIC = { kity: 'kits', statistiky: 'stats', kalkulacka: 'calc', info: 'info', soukromi: 'privacy', porovnani: 'compare' };
const HOME = { name: 'home', params: {} };

export function parseHash(hash) {
  const path = String(hash ?? '').replace(/^#\/?/, '');
  if (!path) return HOME;
  let parts;
  try { parts = path.split('/').map(decodeURIComponent); } catch { return HOME; }
  const [head, p1, p2] = parts;
  if (parts.length === 1 && STATIC[head]) return { name: STATIC[head], params: {} };
  if (head === 'kity' && parts.length === 2) return { name: 'kit', params: { kit: p1 } };
  if (head === 'hrac' && parts.length === 2) return { name: 'player', params: { nick: p1 } };
  if (head === 'porovnani' && parts.length === 3) return { name: 'compare', params: { a: p1, b: p2 } };
  return HOME;
}
```

- [ ] **Step 4: Spustit, musí projít** — `node --test tests/` → vše PASS.

---

### Task 4: Téma, shell a sdílené UI

**Files:** Modify `index.html`, `assets/css/style.css` (přepsat); Create `assets/js/ui.js`; Modify `assets/js/app.js` (přepsat na shell)

**Interfaces:** Consumes `parseHash` (Task 3), `loadPlayers`, `esc`. Produces `ui.js`: `KIT_ACCENTS`, `PNG_KITS`, `accent(kit): string`, `kitLogo(kit, cls): string`, `head(name): HTMLImageElement|HTMLSpanElement`, `badges(player): string`, `allKits(players): string[]`, `link(hash, text): string`. Každé zobrazení exportuje `render(root: HTMLElement, ctx: {players, kits}, params: object): void`.

- [ ] **Step 1: `ui.js`** — přesunout z dosavadního `app.js` `PNG_KITS`, `KIT_ACCENTS`, `accent` (přes `Object.hasOwn`), `kitLogo`, `head`, `badges`; přidat `allKits(players)` (PNG kity nejdřív, pak ostatní abecedně) a `link(hash, text) → '<a href="#/…">'` s `esc`.
- [ ] **Step 2: `index.html`** — hlavička s logem a navigací (`Domů`, `Kity`, `Statistiky`, `Porovnání`, `Kalkulačka`), `<div id="banner">`, `<main id="view">`, patička (`Informace`, `Ochrana soukromí`), `<dialog>` nepotřebné (detail je stránka). Načítací panel `#gate` s kroky "Stahuji tiery a historii testů" a "Sestavuji žebříček".
- [ ] **Step 3: `style.css`** — proměnné z Global Constraints; třídy `.site-header`, `.nav-link(.active)`, `.board`, `.board-row`, `.board-layout` (2 sloupce, panel `.rail` vpravo, pod 900 px pod seznamem), `.kit-grid`, `.kit-col`, `.kit-hero`, `.timemachine`, `.timeline`, `.statbar`, `.compare-*`, `.calc-*`, `.site-footer`, `.gate`; šikmé zlaté pruhy hero přes `repeating-linear-gradient`; `:focus-visible`; `@media (prefers-reduced-motion: reduce)` bez animací; `overflow-x` ošetřený.
- [ ] **Step 4: `app.js` shell**

```js
import { loadPlayers } from './data.js';
import { parseHash } from './router.js';
import { allKits } from './ui.js';

const views = {
  home: () => import('./views/home.js'), kits: () => import('./views/kits.js'), kit: () => import('./views/kits.js'),
  player: () => import('./views/player.js'), stats: () => import('./views/stats.js'),
  compare: () => import('./views/compare.js'), calc: () => import('./views/calc.js'),
  info: () => import('./views/info.js'), privacy: () => import('./views/privacy.js'),
};
let ctx = null;

async function route() {
  if (!ctx) return;
  const { name, params } = parseHash(location.hash);
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.route === name || (name === 'kit' && a.dataset.route === 'kits')));
  const root = document.getElementById('view');
  const mod = await views[name]();
  root.replaceChildren();
  mod.render(root, ctx, params);
  window.scrollTo(0, 0);
}

async function init() {
  const view = document.getElementById('view');
  try {
    const { players, source } = await loadPlayers();
    ctx = { players, kits: allKits(players) };
    const banner = document.getElementById('banner');
    banner.hidden = source === 'live';
    if (source !== 'live') banner.textContent = 'Živá data jsou dočasně nedostupná. Zobrazuji poslední uložený stav.';
    document.getElementById('gate').hidden = true;
    await route();
  } catch {
    document.getElementById('gate').hidden = true;
    view.innerHTML = '<div class="empty"><p>Data se nepodařilo načíst.</p><button id="retry" type="button">Zkusit znovu</button></div>';
    document.getElementById('retry').addEventListener('click', () => { document.getElementById('gate').hidden = false; init(); });
  }
}

addEventListener('hashchange', route);
init();
```

- [ ] **Step 5: Ověřit** — `node --check assets/js/app.js assets/js/ui.js`; `node --test tests/` zelené; lokální server (port 8911, na pozadí) a screenshot `#/` v Bravu: hlavička, navigace a prázdné `view` se načtou bez chyb v konzoli (`--enable-logging=stderr`).

---

### Task 5: Domů — žebříček, panel změn, stroj času

**Files:** Create `assets/js/views/home.js`

**Interfaces:** Consumes `sortPlayers`, `playerPoints`, `tierPoints` (tiers.js), `modesAt`, `minDate` (history.js), `recentChanges` (feed.js), `ui.js` helpery. Produces `render(root, ctx, params)`.

- [ ] **Step 1:** Zobrazení sestaví `.board-layout`: vlevo `.timemachine` (range input od `minDate(players)` po dnešek v dnech, štítek `stav k DD.MM.YYYY`, tlačítko „Dnes“), záložky kitů, hledání, `.board` (řádek = pořadí, hlava, jméno jako odkaz `#/hrac/<nick>`, odznaky, body) a tlačítko `.board-more` „Zobrazit další“ (po 25); vpravo `.rail` s kartou „Poslední změny“ (`recentChanges(players, 8)`, každá položka: hlava, nick, kit, `from → to`, datum).
- [ ] **Step 2:** Stav `{kit, query, shown: 25, at: null}`. Seznam hráčů pro zobrazení: `at === null` → `player.modes`; jinak `modesAt(player, at)`; hráči s prázdnými módy se vynechají. Když `minDate` vrátí `null`, stroj času se skryje. Posuvník na maximu = `at = null`.
- [ ] **Step 3:** Prázdné stavy: „Zatím tu nejsou žádní hráči.“ / „Žádný hráč neodpovídá hledání.“ / „K tomuto datu ještě nikdo nebyl testován.“
- [ ] **Step 4: Ověřit** — screenshot `#/` desktop 1440 a mobil 390; posuň stroj času přes `--virtual-time-budget` je těžké, proto logiku kryjí testy z Task 1; vizuálně ověřit výchozí stav a stav s dotazem `#/` bez dat (záložní režim).

---

### Task 6: Kity

**Files:** Create `assets/js/views/kits.js`

**Interfaces:** Produces `render(root, ctx, params)`; bez `params.kit` = mřížka kitů, s ním = detail kitu.

- [ ] **Step 1:** Mřížka `.kit-grid`: dlaždice `.kit-tile` (ikona, název, počet hráčů z `kitPopularity`) s odkazem `#/kity/<kit>`.
- [ ] **Step 2:** Detail: `.kit-hero` (ikona, název, nejlepší hráč = nejvyšší `tierPoints` v kitu, počet hráčů) a `.kit-grid` se sloupci `.kit-col` pro tiery `HT1…LT5` (jen neprázdné + prázdné s poznámkou „nikdo“); v každém sloupci hráči jako odkazy.
- [ ] **Step 3:** Neznámý kit (`!ctx.kits.includes(params.kit)`) → blok „Kit nenalezen“ s odkazem `#/kity`; název vždy přes `esc`.
- [ ] **Step 4: Ověřit** — screenshot `#/kity`, `#/kity/IronAxe`, `#/kity/Neexistuje`.

---

### Task 7: Hráč

**Files:** Create `assets/js/views/player.js`

**Interfaces:** Consumes `peakOf`, `pointsSeries`, `badgesFor`, `testsCount`, `playerPoints`. Produces `render(root, ctx, params)`.

- [ ] **Step 1:** Najít hráče `ctx.players.find(p => p.username === params.nick)`; nenalezen → „Hráč nenalezen“ s odkazem domů.
- [ ] **Step 2:** Hlavička (hlava 96 px, jméno, body, počet testů), odznaky z `badgesFor` s českými popisky (`first-point` „Získal první bod na tierlistu“, `ht1` „Dosáhl HT1 v některém kitu“, `all-kits` „Testován ve všech kitech“, `tests-50|100|200` „Absolvoval N nebo více testů“), tabulka peak tierů (`peakOf`, vedle aktuálního tieru), `.timeline` po kitech (datum, tier, šipka při změně).
- [ ] **Step 3:** Graf vývoje bodů: inline SVG `viewBox="0 0 600 200"`; `pointsSeries` < 2 bodů → text „Zatím málo dat pro graf“; jinak `polyline` se škálováním, dělení nulou ošetřeno (`max(1, max-min)`), tooltip přes `<title>` u `circle`.
- [ ] **Step 4: Ověřit** — screenshot hráče s dlouhou historií a hráče s jedním záznamem; `#/hrac/%3Cimg%20src%3Dx%3E` → „nenalezen“ bez vykonání kódu.

---

### Task 8: Statistiky

**Files:** Create `assets/js/views/stats.js`

- [ ] **Step 1:** Čtyři karty: rozložení tierů (`tierDistribution`, `.statbar` s šířkou podle `count / max`), nejhranější kity (`kitPopularity`), nejčastěji testovaní (`topTested(players, 10)` jako odkazy), testy po měsících (`testsPerMonth`, sloupcový SVG graf, `max(1, …)`).
- [ ] **Step 2:** Prázdná data → v každé kartě „Zatím žádná data.“
- [ ] **Step 3: Ověřit** — screenshot `#/statistiky` desktop a mobil.

---

### Task 9: Porovnání a kalkulačka

**Files:** Create `assets/js/views/compare.js`, `assets/js/views/calc.js`

- [ ] **Step 1 (porovnání):** Dva výběry hráče (`input` + `datalist` z `ctx.players`), výsledek z `compare(a, b)`: `.compare-grid` s hlavami, součty a řádky `.compare-row` po kitech (vítěz zvýrazněn zlatě, kit chybějící u jednoho zobrazen „—“). Při `params.a`/`params.b` se předvyplní a při změně se aktualizuje hash `#/porovnani/<a>/<b>`. Neznámý nick → hláška „Hráč nenalezen“ u daného pole.
- [ ] **Step 2 (kalkulačka):** Pro každý kit z `ctx.kits` `<select>` (– , HT1…LT5), výsledek `score(selection)` a `rankFor(score, players)` jako „X bodů · Y. místo z Z“; bez výběru 0 bodů. Nic se neukládá.
- [ ] **Step 3: Ověřit** — screenshoty `#/porovnani/SievT/DroWnerT` (hráči z dat) a `#/kalkulacka`.

---

### Task 10: Info, Soukromí a načítací obrazovka

**Files:** Create `assets/js/views/info.js`, `assets/js/views/privacy.js`

- [ ] **Step 1:** `info`: odkud jsou data (živě ze Supabase, bot DACHSHUNDTIERS zapisuje tiery), tabulka bodů z `TIER_ORDER` a `tierPoints`, poznámka, že web tiery neurčuje a výsledky nezapisuje.
- [ ] **Step 2:** `privacy`: web nesbírá osobní údaje, nepoužívá cookies ani analytiku, čte jen veřejná data (jméno ve hře, tiery, historie), hlavy hráčů se načítají z visage.surgeplay.com, písma z Google Fonts. Bez právních formulací nad rámec faktů.
- [ ] **Step 3: Ověřit** — screenshoty `#/info` a `#/soukromi`.

---

### Task 11: Závěrečné ověření

- [ ] **Step 1:** `node --test tests/` → vše PASS.
- [ ] **Step 2:** Screenshoty všech tras v Bravu, desktop 1440 a mobil 390; kontrola horizontálního přetékání (`document.documentElement.scrollWidth <= innerWidth` přes `--dump-dom` skript nebo vizuálně).
- [ ] **Step 3:** Záložní režim: blokovat Supabase (špatný klíč v `config.js` jen dočasně) → banner a data z `players.json` na všech stránkách; klíč vrátit.
- [ ] **Step 4:** Nezávislá závěrečná kontrola celého výsledku (Review Focus výše).

---

## Self-review proti specu

- Design/paleta/fonty: Global Constraints + Task 4. Routing a struktura: Task 3 (router) + Task 4 (shell).
- Domů, stroj času, panel změn: Task 1, 2, 5. Kity: Task 6. Hráč, odznaky, graf, peak: Task 1, 2, 7. Statistiky: Task 2, 8. Porovnání: Task 3, 9. Kalkulačka: Task 3, 9. Info/Soukromí/načítání: Task 4, 10.
- Okrajové případy ze specu (neexistující hráč/kit, neplatné datum, stroj času před prvním záznamem, prázdná data, porovnání se sebou): testy v Task 1–3 a ošetření v Task 5–9.
- Názvy (`parseDate`, `modesAt`, `peakOf`, `minDate`, `pointsSeries`, `recentChanges`, `testsCount`, `badgesFor`, `tierDistribution`, `kitPopularity`, `topTested`, `testsPerMonth`, `compare`, `score`, `rankFor`, `parseHash`) jsou v plánu použity konzistentně.
