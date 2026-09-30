# Živá data ze Supabase + redesign webu DachshundTiers

Datum: 2026-09-30 · Stav: **čeká na schválení uživatelem**

## Cíl

Web čte tiery přímo ze Supabase (PostgreSQL bota `dachshundtiers-bot`) místo
souboru `players.json`, který bot exportuje přes GitHub (`/sync web`).
Změna po `/result`, `/edituser` atd. se na webu projeví bez ručního syncu a bez
commitu. Vzhled webu se přiblíží referenčnímu czsktiers.eu.

Úspěch: (1) web ukazuje stejná data jako DB bez zásahu admina, (2) přes anon
klíč nejde přečíst ani zapsat nic mimo veřejný view, (3) bot funguje beze změny,
(4) web je použitelný na mobilu a při výpadku Supabase nezmizí.

## Mimo rozsah

- Podstránky statistik a porovnání hráčů (případně později).
- Změny v kódu bota. `/sync web` a GitHub export zůstanou funkční jako záloha.
- Zápis z webu do databáze.

## 1. Databáze (Supabase projekt `tfrvbuuuwlvfzwxgrhmd`)

Zjištění: 29 tabulek ve `public` nemá RLS (Discord ID, tickety, audit, bot_config…),
takže jsou přes PostgREST dostupné s veřejným anon klíčem. Před zveřejněním
klíče na webu je nutné je zamknout.

Migrace (jedna, reverzibilní):

1. Pro každou tabulku ve `public`: `ENABLE ROW LEVEL SECURITY` a
   `REVOKE ALL ... FROM anon, authenticated`.
2. View `public.public_players` (vlastník `postgres`, `security_invoker = false`),
   `GRANT SELECT` jen pro `anon`. Jeden řádek na hráče, sloupce:
   - `username` (`players.ign`)
   - `modes` jsonb: `{kit.name: tier.code}` z `player_current_tiers`
   - `history` jsonb: `{kit.name: [{date, tier}]}` z `tier_history`, seřazeno
     podle `changed_at`; `date` ve formátu `DD.MM.YYYY` jako dnes
   - `peak` jsonb z `player_peak_tiers` (dnes prázdné)
3. Do view se dostanou jen hráči s alespoň jedním tierem. Discord ID, UUID
   a interní ID se nevracejí.

Ověření před migrací: role, kterou bot používá v `DATABASE_URL` (musí být
vlastník tabulek nebo mít `BYPASSRLS`, jinak bot po zapnutí RLS přestane číst).
Ověření po migraci: anon přes REST načte `public_players`, `players` vrací
prázdno/403, `/dbstatus` a `/sync check` v botu projdou.

Produkční migraci spustí až po výslovném souhlasu uživatele.

## 2. Web

Zůstává statický (GitHub Pages), bez build kroku: `index.html` + `assets/`
(CSS, JS). Tailwind CDN se nahradí vlastním CSS s proměnnými.

**Načítání dat:** `fetch` na `…/rest/v1/public_players?select=*` s hlavičkami
`apikey` a `Authorization: Bearer <anon>`. Při chybě nebo timeoutu (8 s) se
použije `players.json`; ve stránce se ukáže nenápadné upozornění "záložní data".
Bez dat vůbec: chybový stav s tlačítkem "Zkusit znovu".

**Vzhled (inspirace czsktiers.eu, žádný převzatý kód ani obrázky):**
- paleta: pozadí `#080d16`, karty `#121a27`/`#1a2332`, akcent `#5fb6ff`,
  zlatá `#e8c14a`; fonty Space Grotesk (nadpisy) a Inter (text)
- hero s logem a počtem hráčů, pod ním přepínač kitů (ikony `*.png`,
  dnešní akcentní barvy) a vyhledávání
- žebříček: pořadí, hlava hráče (`visage.surgeplay.com`, s fallbackem na
  iniciály), jméno, tier odznaky po kitech, body
- detail hráče (modal): tiery po kitech a historie změn
- responzivní od 360 px, bez horizontálního posunu

**Zachované chování:** bodový systém (`tierConfig`) a řazení zůstanou jako dnes.
Opravy při přepisu: tier `LT3E` (v datech existuje, v `tierConfig` chybí) se
bude počítat jako LT3; neznámý tier nesmí rozbít vykreslení (0 bodů, šedý odznak).
Retired tiery (`RLT2`…) se zobrazí stejně jako dnes. Všechen text z DB se
escapuje.

## 3. Ověření

- Skript `tools/check_public_view.sh` (curl s anon klíčem): view vrací data,
  `players`, `tickets`, `audit_logs` vrací prázdno/chybu.
- Porovnání: počet hráčů a tierů ve view vs. `players.json`.
- Ruční kontrola v prohlížeči (desktop + 375 px) a výpadek sítě (záloha).
- Kontrola `get_advisors` po migraci: zmizí `rls_disabled_in_public`.

## Pořadí prací

1. Schválení tohoto specu.
2. Ověření role bota a návrh migrace ke schválení (nic se nespouští).
3. Po souhlasu: migrace + kontrola bota.
4. Nový web + napojení na view.
5. Ověření a nasazení.
