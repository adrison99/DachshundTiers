# Živá data ze Supabase + redesign webu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web čte tiery živě ze Supabase přes zamčený read-only view a má nový vzhled ve stylu czsktiers.eu.

**Architecture:** Migrace zapne RLS na všech tabulkách `public`, odebere `anon` všechna práva a vystaví jediný view `public_players` (tvar dnešního `players.json`). Statický web (vanilla ES moduly, bez buildu) ho načte přes PostgREST s anon klíčem a při chybě spadne na `players.json`.

**Tech Stack:** Supabase (PostgreSQL 17, PostgREST), vanilla JS (ES moduly), CSS proměnné, `node --test` pro testy logiky, bash + curl pro kontrolu view.

**Spec:** `docs/superpowers/specs/2026-09-30-live-supabase-redesign-design.md`

## Global Constraints

- Supabase projekt: `tfrvbuuuwlvfzwxgrhmd` (region eu-central-1).
- Web zůstává statický (GitHub Pages), bez build kroku; žádný převzatý kód ani obrázky z czsktiers.eu.
- Paleta: pozadí `#080d16`, karty `#121a27` / `#1a2332`, akcent `#5fb6ff`, zlatá `#e8c14a`; fonty Space Grotesk (nadpisy), Inter (text).
- Datum v historii ve formátu `DD.MM.YYYY`; bodový systém a řazení jako dnes (`tierConfig`).
- `LT3E` se počítá jako `LT3`; neznámý tier = 0 bodů, nesmí rozbít vykreslení.
- Všechen text z DB se escapuje; view nesmí vracet Discord ID, UUID ani interní ID.
- Produkční migraci spustit JEN po výslovném souhlasu uživatele (Task 2).
- Bez změn v kódu bota. `players.json` zůstává jako záloha.
- Žádné `git commit`/`push` bez výslovné žádosti uživatele (globální pravidlo) — plán proto neobsahuje commit kroky.
- Responzivita od 360 px, bez horizontálního scrollu.

## Review Focus

- Hráč bez jediného tieru: nesmí se objevit ve view ani na webu.
- Kit v DB, který nemá PNG ikonu (např. `MolePVP`): musí se zobrazit s náhradní ikonou, ne rozbitým obrázkem.
- IGN s HTML znaky (`<img onerror=…>`): musí se zobrazit jako text.
- Supabase vrátí 401/500 nebo timeout: web ukáže záložní data + upozornění; bez záložních dat chybu a "Zkusit znovu".
- Prázdné pole hráčů / `modes: {}`: prázdný stav, ne výjimka.

---

## File Structure

- `supabase/migrations/20260930_public_players_view.sql` — migrace (RLS, revoke, view)
- `tools/check_public_view.sh` — kontrola co anon vidí / nevidí
- `assets/js/config.js` — URL Supabase, anon klíč, timeout
- `assets/js/tiers.js` — body, řazení, normalizace tieru
- `assets/js/data.js` — načtení dat (live → fallback), normalizace řádků
- `assets/js/app.js` — vykreslení UI, filtry, modal
- `assets/css/style.css` — design
- `index.html` — kostra stránky (přepsat)
- `tests/tiers.test.mjs`, `tests/data.test.mjs` — testy logiky

---

### Task 1: Ověření stavu databáze a role bota (jen čtení)

**Files:** žádné (výstup poznamenat do `docs/superpowers/plans/notes-db-check.md`)

**Interfaces:** Produces: rozhodnutí, zda migrace potřebuje policy pro roli bota.

- [ ] **Step 1: Zjistit vlastníka tabulek a atributy rolí**

Přes MCP `execute_sql` (projekt `tfrvbuuuwlvfzwxgrhmd`):

```sql
select tableowner, count(*) from pg_tables where schemaname='public' group by 1;
select rolname, rolbypassrls, rolsuper from pg_roles
 where rolname in ('postgres','anon','authenticated','service_role');
select has_table_privilege('anon','public.players','select') as anon_reads_players;
```

Expected: vlastník tabulek je jedna role (zapiš jméno); `anon_reads_players` = `true` (potvrzuje problém).

- [ ] **Step 2: Zjistit, jakou roli používá bot**

Zeptat se uživatele, jaký uživatel je v `DATABASE_URL` bota (jen jméno, ne heslo). Pokud je to vlastník tabulek nebo `postgres`, RLS bota neomezí (vlastník RLS obchází, dokud není `FORCE`). Ověřit:

```sql
select relname, relforcerowsecurity from pg_class
 where relnamespace='public'::regnamespace and relkind='r' and relforcerowsecurity;
```

Expected: žádné řádky.

- [ ] **Step 3: Ověřit názvy kitů a tierů**

```sql
select name, key, active from kits order by id;
select code, kind from tier_definitions order by rank nulls last, code;
```

Expected: `kits.name` odpovídá klíčům v `players.json` (`NetheriteSword`, `IronAxe`, …). Pokud ne, upravit SQL v Task 2 na správný sloupec.

---

### Task 2: Migrace — RLS, revoke, view `public_players`

**Files:**
- Create: `supabase/migrations/20260930_public_players_view.sql`
- Create: `tools/check_public_view.sh`

**Interfaces:** Produces: `public.public_players(username text, modes jsonb, history jsonb, peak jsonb)`, čitelné rolí `anon`.

- [ ] **Step 1: Napsat migraci**

```sql
-- 1) zamknout všechny tabulky ve public
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- 2) veřejný view
create or replace view public.public_players
with (security_invoker = false) as
select
  p.ign as username,
  (select coalesce(jsonb_object_agg(k.name, t.code), '{}'::jsonb)
     from player_current_tiers c
     join kits k on k.id = c.kit_id
     join tier_definitions t on t.id = c.tier_id
    where c.player_id = p.id) as modes,
  (select coalesce(jsonb_object_agg(s.kit_name, s.entries), '{}'::jsonb)
     from (select k.name as kit_name,
                  jsonb_agg(jsonb_build_object(
                    'date', to_char(h.changed_at at time zone 'Europe/Prague', 'DD.MM.YYYY'),
                    'tier', t.code) order by h.changed_at, h.id) as entries
             from tier_history h
             join kits k on k.id = h.kit_id
             join tier_definitions t on t.id = h.tier_id
            where h.player_id = p.id
            group by k.name) s) as history,
  (select coalesce(jsonb_object_agg(k.name, t.code), '{}'::jsonb)
     from player_peak_tiers pp
     join kits k on k.id = pp.kit_id
     join tier_definitions t on t.id = pp.tier_id
    where pp.player_id = p.id) as peak
from players p
where exists (select 1 from player_current_tiers c where c.player_id = p.id);

revoke all on public.public_players from public, anon, authenticated;
grant select on public.public_players to anon;
```

- [ ] **Step 2: Napsat kontrolní skript**

`tools/check_public_view.sh`:

```bash
#!/usr/bin/env bash
set -u
: "${SUPABASE_URL:?}"; : "${SUPABASE_ANON_KEY:?}"
H=(-H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY")
fail=0
code() { curl -s -o /dev/null -w '%{http_code}' "${H[@]}" "$SUPABASE_URL/rest/v1/$1"; }
body() { curl -s "${H[@]}" "$SUPABASE_URL/rest/v1/$1"; }

[ "$(code 'public_players?select=username&limit=1')" = 200 ] || { echo "FAIL: view nečitelný"; fail=1; }
body 'public_players?select=*&limit=1' | grep -q discord && { echo "FAIL: view obsahuje discord"; fail=1; }

for t in players tickets audit_logs bot_config outbox_events player_current_tiers tier_history; do
  out=$(body "$t?select=*&limit=1")
  if [ "$out" != "[]" ] && ! echo "$out" | grep -q '"code"'; then
    echo "FAIL: anon čte $t"; fail=1
  fi
done
[ $fail = 0 ] && echo "OK: anon vidí jen public_players"
exit $fail
```

Run: `chmod +x tools/check_public_view.sh`

- [ ] **Step 3: PŘED migrací spustit skript (očekávaný FAIL)**

Získat URL a anon klíč přes MCP `get_project_url` a `get_publishable_keys`, pak:
`SUPABASE_URL=… SUPABASE_ANON_KEY=… tools/check_public_view.sh`
Expected: `FAIL: view nečitelný` a `FAIL: anon čte players` (potvrzuje aktuální díru).

- [ ] **Step 4: ZASTAVIT a získat výslovný souhlas uživatele**

Ukázat uživateli výstup Task 1, SQL migrace a výsledek Step 3. Migraci nespouštět bez "ano".

- [ ] **Step 5: Aplikovat migraci**

MCP `apply_migration` (name `public_players_view`, query = obsah souboru).

- [ ] **Step 6: Skript znovu**

Expected: `OK: anon vidí jen public_players`.

- [ ] **Step 7: Porovnat počty**

```sql
select count(*) from public.public_players;
```

Expected: počet hráčů s alespoň jedním tierem (řádově ~80, dnešní `players.json` má 80).

- [ ] **Step 8: Ověřit bota a advisor**

Požádat uživatele o `/dbstatus` a `/sync check` v Discordu; expected bez nových chyb. Pak MCP `get_advisors` (security): `rls_disabled_in_public` musí zmizet. Při selhání bota okamžitě rollback: `alter table … disable row level security` pro tabulky, které bot čte, a ohlásit uživateli.

---

### Task 3: Logika tierů (TDD)

**Files:**
- Create: `assets/js/tiers.js`
- Test: `tests/tiers.test.mjs`

**Interfaces:**
- Produces: `normalizeTier(code: string): string`, `tierPoints(code: string): number`, `playerPoints(modes: Record<string,string>): number`, `sortPlayers(players: Player[]): Player[]` (podle bodů sestupně, pak jména), `TIER_ORDER: string[]`.

- [ ] **Step 1: Napsat testy**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTier, tierPoints, playerPoints, sortPlayers } from '../assets/js/tiers.js';

test('LT3E se počítá jako LT3', () => {
  assert.equal(normalizeTier('LT3E'), 'LT3');
  assert.equal(tierPoints('LT3E'), 10);
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
```

- [ ] **Step 2: Spustit — musí selhat**

Run: `node --test tests/tiers.test.mjs`
Expected: FAIL (modul neexistuje).

- [ ] **Step 3: Implementace**

```js
const POINTS = {
  HT1: 60, LT1: 48, RHT1: 54, RLT1: 44,
  HT2: 32, LT2: 24, RHT2: 29, RLT2: 22,
  HT3: 16, LT3: 10, RHT3: 14, RLT3: 8,
  HT4: 5, LT4: 3, RHT4: 4, RLT4: 2,
  HT5: 2, LT5: 1, RHT5: 1, RLT5: 1,
};

export const TIER_ORDER = Object.keys(POINTS);

export function normalizeTier(code) {
  const c = String(code ?? '').trim().toUpperCase();
  return c === 'LT3E' ? 'LT3' : c;
}

export function tierPoints(code) {
  return POINTS[normalizeTier(code)] ?? 0;
}

export function playerPoints(modes) {
  return Object.values(modes ?? {}).reduce((sum, t) => sum + tierPoints(t), 0);
}

export function sortPlayers(players) {
  return [...players].sort((a, b) =>
    playerPoints(b.modes) - playerPoints(a.modes) ||
    a.username.localeCompare(b.username));
}
```

- [ ] **Step 4: Spustit — musí projít**

Run: `node --test tests/tiers.test.mjs`
Expected: PASS (5 testů).

---

### Task 4: Načítání dat s fallbackem (TDD)

**Files:**
- Create: `assets/js/config.js`, `assets/js/data.js`
- Test: `tests/data.test.mjs`

**Interfaces:**
- Consumes: nic z Task 3.
- Produces: `normalizePlayers(rows: unknown): Player[]`, `loadPlayers(opts?: {fetchImpl?, timeoutMs?}): Promise<{players: Player[], source: 'live'|'fallback'}>` (vyhodí `Error`, když selžou oba zdroje). `Player = {username: string, modes: object, history: object, peak: object}`.

- [ ] **Step 1: `config.js`** (anon klíč doplnit z `get_publishable_keys`; je veřejný z definice)

```js
export const SUPABASE_URL = 'https://tfrvbuuuwlvfzwxgrhmd.supabase.co';
export const SUPABASE_ANON_KEY = '<publishable/anon key z get_publishable_keys>';
export const LIVE_TIMEOUT_MS = 8000;
export const FALLBACK_URL = 'players.json';
```

- [ ] **Step 2: Napsat testy**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlayers, loadPlayers } from '../assets/js/data.js';

const ok = body => async () => ({ ok: true, json: async () => body });
const bad = async () => ({ ok: false, status: 500, json: async () => ({}) });

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
  const r = await loadPlayers({ fetchImpl: ok([{ username: 'a', modes: { X: 'HT3' } }]) });
  assert.equal(r.source, 'live');
});
test('live 500 → fallback', async () => {
  const f = async url => String(url).includes('supabase') ? bad() : ok([{ username: 'a', modes: { X: 'HT3' } }])();
  const r = await loadPlayers({ fetchImpl: f });
  assert.equal(r.source, 'fallback');
});
test('live timeout → fallback', async () => {
  const f = (url, o) => String(url).includes('supabase')
    ? new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(new Error('abort'))))
    : ok([{ username: 'a', modes: { X: 'HT3' } }])();
  const r = await loadPlayers({ fetchImpl: f, timeoutMs: 20 });
  assert.equal(r.source, 'fallback');
});
test('oba zdroje selžou → výjimka', async () => {
  await assert.rejects(loadPlayers({ fetchImpl: bad }));
});
```

- [ ] **Step 3: Spustit — musí selhat**

Run: `node --test tests/data.test.mjs` → FAIL.

- [ ] **Step 4: Implementace `data.js`**

```js
import { SUPABASE_URL, SUPABASE_ANON_KEY, LIVE_TIMEOUT_MS, FALLBACK_URL } from './config.js';

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

export function normalizePlayers(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter(r => isObj(r) && typeof r.username === 'string' && r.username.trim() && isObj(r.modes) && Object.keys(r.modes).length)
    .map(r => ({
      username: r.username,
      modes: r.modes,
      history: isObj(r.history) ? r.history : {},
      peak: isObj(r.peak) ? r.peak : {},
    }));
}

async function fetchJson(fetchImpl, url, options, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { ...options, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function loadPlayers({ fetchImpl = globalThis.fetch, timeoutMs = LIVE_TIMEOUT_MS } = {}) {
  try {
    const rows = await fetchJson(
      fetchImpl,
      `${SUPABASE_URL}/rest/v1/public_players?select=*`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
      timeoutMs,
    );
    return { players: normalizePlayers(rows), source: 'live' };
  } catch (liveErr) {
    const rows = await fetchJson(fetchImpl, `${FALLBACK_URL}?v=${Date.now()}`, {}, timeoutMs);
    return { players: normalizePlayers(rows), source: 'fallback' };
  }
}
```

- [ ] **Step 5: Spustit — musí projít**

Run: `node --test tests/` → PASS (všechny testy z Task 3 i 4).

---

### Task 5: Nový vzhled a vykreslení (`index.html`, CSS, `app.js`)

**Files:**
- Modify (přepsat): `index.html`
- Create: `assets/css/style.css`, `assets/js/app.js`

**Interfaces:**
- Consumes: `loadPlayers` (Task 4), `sortPlayers`, `playerPoints`, `tierPoints`, `normalizeTier` (Task 3).
- Produces: hotová stránka.

Nejdřív načíst skill `frontend-design:frontend-design` a držet se Global Constraints (paleta, fonty). Ze stávajícího `index.html` zachovat: `KIT_ACCENTS`, `PNG_KITS`, `kitLogo()`, `esc()` (přenést do `app.js`), a meta/title.

- [ ] **Step 1: Kostra `index.html`**

`<html lang="cs">`, preconnect na `fonts.googleapis.com`, `fonts.gstatic.com`, `visage.surgeplay.com`; Google Fonts (Space Grotesk 500/700, Inter 400/600); `<link rel="stylesheet" href="assets/css/style.css">`; `<script type="module" src="assets/js/app.js">`. Body: `<header class="hero">` (logo `logo.png`, nadpis, `#player-count`), `<nav id="kit-tabs">`, `<input id="search" type="search" placeholder="Hledat hráče…">`, `<div id="banner" hidden>` (záložní data), `<main id="board">`, `<dialog id="player-modal">`.

- [ ] **Step 2: `style.css`**

`:root { --bg:#080d16; --card:#121a27; --surface:#1a2332; --accent:#5fb6ff; --gold:#e8c14a; --text:#e6ecf5; --muted:#8b93a4; --radius:12px; }`, `body{background:var(--bg);color:var(--text);font-family:Inter,system-ui,sans-serif;margin:0}`, nadpisy `Space Grotesk`. Hero: tmavý gradient překryv (`linear-gradient(rgba(8,13,22,.6), var(--bg))`). Řádek žebříčku = karta (`grid-template-columns: 48px 40px 1fr auto`), pod 640 px odznaky pod jménem. `@media (max-width:640px)` kit-tabs `overflow-x:auto`. `body{overflow-x:hidden}` jen jako pojistka, layout bez přetékání ověřit na 360 px.

- [ ] **Step 3: `app.js`**

```js
import { loadPlayers } from './data.js';
import { sortPlayers, playerPoints, tierPoints, normalizeTier } from './tiers.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PNG_KITS = ['GoldSMP', 'NetheriteSword', 'IronAxe', 'UHCMace', 'AnchorPvP', 'RandomPot', 'ShieldlessSMP'];
const KIT_ACCENTS = { Overall: '#f59e0b', GoldSMP: '#eab308', NetheriteSword: '#9aa7bd', IronAxe: '#fb923c', UHCMace: '#f43f5e', AnchorPvP: '#22d3ee', RandomPot: '#c084fc', ShieldlessSMP: '#34d399', MolePVP: '#a3e635' };

const state = { players: [], kit: 'Overall', query: '' };

const kitLogo = (kit, cls) => PNG_KITS.includes(kit)
  ? `<img class="${cls}" src="${esc(kit)}.png" alt="${esc(kit)}" loading="lazy">`
  : `<span class="${cls} kit-fallback" title="${esc(kit)}" aria-hidden="true">⛏️</span>`;

const head = name =>
  `<img class="head" src="https://visage.surgeplay.com/face/64/${encodeURIComponent(name)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'head head-fallback',textContent:this.dataset.i}))" data-i="${esc(name.slice(0, 2).toUpperCase())}">`;

function kitsOf(players) {
  const found = new Set(players.flatMap(p => Object.keys(p.modes)));
  return [...PNG_KITS.filter(k => found.has(k)), ...[...found].filter(k => !PNG_KITS.includes(k)).sort()];
}

function visible() {
  const q = state.query.trim().toLowerCase();
  let list = state.players.filter(p => !q || p.username.toLowerCase().includes(q));
  if (state.kit !== 'Overall') {
    list = list.filter(p => p.modes[state.kit]);
    return list.sort((a, b) => tierPoints(b.modes[state.kit]) - tierPoints(a.modes[state.kit]) || a.username.localeCompare(b.username));
  }
  return sortPlayers(list);
}

function badges(p) {
  return Object.entries(p.modes).map(([k, t]) =>
    `<span class="badge" style="--k:${KIT_ACCENTS[k] || '#5fb6ff'}">${kitLogo(k, 'kit-ico')}${esc(normalizeTier(t))}</span>`).join('');
}

function render() {
  const list = visible();
  $('#player-count').textContent = `${state.players.length} hráčů`;
  $('#board').innerHTML = list.length
    ? list.map((p, i) => `<button class="row" data-u="${esc(p.username)}"><span class="rank">${i + 1}</span>${head(p.username)}<span class="name">${esc(p.username)}</span><span class="badges">${badges(p)}</span><span class="pts">${playerPoints(p.modes)}</span></button>`).join('')
    : '<p class="empty">Žádní hráči k zobrazení.</p>';
}

function renderTabs() {
  const kits = ['Overall', ...kitsOf(state.players)];
  $('#kit-tabs').innerHTML = kits.map(k =>
    `<button class="tab${k === state.kit ? ' active' : ''}" data-k="${esc(k)}" style="--k:${KIT_ACCENTS[k] || '#5fb6ff'}">${k === 'Overall' ? '' : kitLogo(k, 'kit-ico')}${esc(k)}</button>`).join('');
}

function openPlayer(name) {
  const p = state.players.find(x => x.username === name);
  if (!p) return;
  const hist = Object.entries(p.history).map(([k, h]) =>
    `<h4>${kitLogo(k, 'kit-ico')} ${esc(k)}</h4><ul>${h.map(e => `<li><span>${esc(e.date)}</span><b>${esc(normalizeTier(e.tier))}</b></li>`).join('')}</ul>`).join('');
  $('#player-modal').innerHTML = `<form method="dialog"><button class="close" aria-label="Zavřít">×</button></form>${head(p.username)}<h3>${esc(p.username)}</h3><p class="pts">${playerPoints(p.modes)} bodů</p><div class="badges">${badges(p)}</div>${hist || '<p class="empty">Bez historie.</p>'}`;
  $('#player-modal').showModal();
}

async function init() {
  $('#board').innerHTML = '<p class="empty">Načítám…</p>';
  try {
    const { players, source } = await loadPlayers();
    state.players = players;
    $('#banner').hidden = source === 'live';
    if (source !== 'live') $('#banner').textContent = 'Živá data jsou dočasně nedostupná, zobrazuji poslední uložený stav.';
    renderTabs();
    render();
  } catch {
    $('#board').innerHTML = '<div class="empty"><p>Data se nepodařilo načíst.</p><button id="retry">Zkusit znovu</button></div>';
    $('#retry').addEventListener('click', init);
  }
}

$('#kit-tabs').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { state.kit = b.dataset.k; renderTabs(); render(); } });
$('#search').addEventListener('input', e => { state.query = e.target.value; render(); });
$('#board').addEventListener('click', e => { const r = e.target.closest('[data-u]'); if (r) openPlayer(r.dataset.u); });
init();
```

Pozn.: `data-u` i `data-i` se zapisují přes `esc()`, takže IGN s HTML znaky zůstane textem.

- [ ] **Step 4: Spustit lokálně**

Run: `python3 -m http.server 8000` (ve složce repa) a otevřít `http://localhost:8000`.
Expected: žebříček se vykreslí, přepínač kitů filtruje, hledání funguje, klik otevře modal.

- [ ] **Step 5: Ověřit Review Focus ručně**

V DevTools: (a) zablokovat request na `supabase.co` → zobrazí se banner a data z `players.json`; (b) zablokovat i `players.json` → "Zkusit znovu"; (c) v `app.js` dočasně přidat hráče `{username:'<img src=x onerror=alert(1)>', modes:{MolePVP:'LT3'}, history:{}, peak:{}}` → žádný alert, text je vidět, kit má ⛏️; (d) šířka 360 px bez horizontálního scrollu. Dočasný hráč smazat.

---

### Task 6: Závěrečné ověření

**Files:** žádné

- [ ] **Step 1: Všechny testy**

Run: `node --test tests/` → PASS.

- [ ] **Step 2: Kontrola view**

Run: `tools/check_public_view.sh` (s env proměnnými z Task 2) → `OK`.

- [ ] **Step 3: Porovnání dat**

Porovnat počet hráčů na webu s `select count(*) from public.public_players` a stichprobou 3 hráčů (tiery, poslední datum historie) proti DB.

- [ ] **Step 4: Živá změna**

Požádat uživatele o testovací `/result` v botu; po obnovení webu se tier změní bez `/sync web`.

- [ ] **Step 5: Nasazení**

Až uživatel řekne, commit a push (GitHub Pages). Do té doby jen lokální změny.

---

## Self-review proti specu

- Sekce 1 (DB): Task 1–2 (RLS, revoke, view, ověření role bota, advisor, rollback).
- Sekce 2 (web): Task 3–5 (načítání + fallback, `LT3E`, neznámý tier, escapování, vzhled, modal, responzivita).
- Sekce 3 (ověření): Task 2 (skript), Task 6 (porovnání, advisory, ruční kontrola).
- Mimo rozsah (statistiky, bot, zápis): nezahrnuto.
- Názvy: `loadPlayers`, `normalizePlayers`, `sortPlayers`, `playerPoints`, `tierPoints`, `normalizeTier` jsou použity konzistentně ve všech úkolech.
