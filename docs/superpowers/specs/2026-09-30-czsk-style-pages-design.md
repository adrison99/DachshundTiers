# Rozšíření webu: stránky a design ve stylu czsktiers.eu

Datum: 2026-09-30 · Stav: **čeká na schválení uživatelem**
Navazuje na `2026-09-30-live-supabase-redesign-design.md` (živá data ze Supabase, hotovo).

## Cíl

Z jednostránkového žebříčku udělat vícestránkový web s funkcemi a vzhledem co
nejblíž czsktiers.eu, nad daty, která už máme (`public_players`: `username`,
`modes`, `history`, `peak`). Bez nové DB migrace.

Úspěch: všechny stránky níže fungují nad živými i záložními daty, logika je
pokryta testy, vzhled odpovídá černo-zlatému motivu referenčního webu
(pixelová shoda se nedá ověřit, referenční web je za Cloudflare kontrolou;
finální ladění proběhne podle screenshotů od uživatele).

## Mimo rozsah

Live testy, přihlášení přes Discord, profil s bio, Tier Tagger mód, přepínač
Subtiers, štítek regionu CZ/SK, stránky Podmínky a Kontakt (nemáme podklady),
jakákoli změna v botu nebo databázi.

## Design

- Paleta: pozadí `#0a0b0f`, karty `#14161c` / `#1c1f27`, akcent zlatá `#e8c14a`,
  text `#e6e8ee`, tlumený text `#8b93a4`. Kity si ponechají své akcentní barvy.
- Fonty: Space Grotesk (nadpisy, čísla), Inter (text). Hero s tmavým překryvem
  a jemným šikmým zlatým pruhováním (vlastní CSS, žádný převzatý obrázek).
- Názvy komponent blízké referenci: `board`, `board-row`, `kit-col`,
  `kit-hero`, `rail`, `timemachine`, `timeline`, `statbar`, `compare-*`, `calc-*`.
- Žádný kód, logo ani fotografie z czsktiers.eu se nekopíruje.

## Routing a struktura

Hash routing (`#/`, `#/kity`, `#/kity/<kit>`, `#/hrac/<nick>`, `#/statistiky`,
`#/porovnani`, `#/kalkulacka`, `#/info`, `#/soukromi`), protože GitHub Pages
nemá SPA fallback. Neznámá cesta → domů. Hlavička s navigací (Domů, Kity,
Statistiky, Porovnání, Kalkulačka), patička (Informace, Ochrana soukromí).

Moduly (`assets/js/`), čistá logika bez DOM, každá s testy:
- `router.js` — `parseHash(hash) → {name, params}`
- `history.js` — `parseDate('DD.MM.YYYY') → Date`, `modesAt(player, date) → modes`,
  `peakOf(player) → {kit: tier}` (nejlepší tier v historii dle bodů)
- `feed.js` — `recentChanges(players, limit) → [{username, kit, from, to, date}]`
- `stats.js` — `testsCount(player)`, `badgesFor(player)`, `tierDistribution(players)`,
  `kitPopularity(players)`, `topTested(players, n)`, `testsPerMonth(players)`
- `compare.js` — `compare(a, b) → {rows:[{kit, a, b, winner}], totalA, totalB}`
- `calc.js` — `score(selection)`, `rankFor(score, players)`
- `tiers.js`, `data.js`, `escape.js` — beze změny (plus případné rozšíření)

Zobrazení (`assets/js/views/`): `home`, `kits`, `player`, `stats`, `compare`,
`calc`, `info`, `privacy`; `app.js` = shell, router a načítání dat (jednou,
sdílené mezi stránkami).

## Stránky

- **Domů:** žebříček (Overall/kit), hledání, „zobrazit další“ po 25, panel
  vpravo s posledními změnami (`recentChanges`), **stroj času** (posuvník data
  od nejstaršího záznamu po dnešek; přepočte pořadí přes `modesAt`; tlačítko
  „Dnes“ vrátí stav, štítek „stav k <datum>“).
- **Kity:** mřížka kitů; detail kitu má hlavičku (ikona, nejlepší hráč) a sloupce
  podle tieru HT1…LT5 s hráči.
- **Hráč:** body, odznaky, peak tiery, časová osa po kitech, graf vývoje bodů
  v čase (SVG, bez knihovny, s tooltipem).
- **Statistiky:** rozložení tierů, nejhranější kity, nejčastěji testovaní hráči,
  testy po měsících (`statbar` a SVG graf).
- **Porovnání:** dva hráči (výběr hledáním), kit po kitu, vítěz řádku, součet.
- **Kalkulačka:** výběr tieru pro každý kit → skóre a umístění v žebříčku.
- **Info, Ochrana soukromí:** krátké věcné texty (odkud jsou data, jak se počítá
  skóre; web nesbírá osobní údaje a čte jen veřejná data).
- **Načítání:** obrazovka s kroky „Stahuji tiery a historii testů / Sestavuji
  žebříček“ (bez Cloudflare).

Odznaky (odvozené z dat): „HT1 v některém kitu“, „Testován ve všech kitech“,
„50+ / 100+ / 200+ testů“, „První bod na tierlistu“. Počet testů = počet záznamů
v `history` (odhad; web nemá jiný zdroj).

## Pravidla a okrajové případy

- Všechen text z dat přes `esc()`; hráč i kit se v URL kódují `encodeURIComponent`.
- Neexistující hráč/kit v URL → stránka „nenalezeno“ s odkazem domů.
- Hráč s neplatným datem v historii se ve stroji času ignoruje pro ten záznam,
  nerozbije vykreslení.
- Stroj času před prvním záznamem hráče: hráč se v daném dni nezobrazí.
- Prázdná data, jeden hráč, kit bez hráčů: prázdné stavy, žádná výjimka.
- Porovnání stejného hráče se sebou: povoleno, všechny řádky remíza.
- Responzivita od 360 px, viditelný focus, `prefers-reduced-motion` respektován.
- `LT3E` / `LT3 EVAL` se počítá jako LT3 (jako dosud).

## Ověření

- `node --test tests/` — testy všech čistých modulů (včetně okrajových případů výše).
- Headless Brave: screenshot každé stránky, desktop 1440 px a mobil 390 px.
- Záložní režim (bez Supabase) ověřen stejně jako dříve.

## Pořadí prací

1. Schválení specu.
2. Plán a provedení (native): téma + shell + router, pak čistá logika s testy,
   pak jednotlivé stránky, nakonec ověření a závěrečná kontrola.
3. Commit a nasazení až na pokyn uživatele.
