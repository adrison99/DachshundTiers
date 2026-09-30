import { esc } from '../escape.js';
import { sortPlayers, playerPoints, tierPoints, normalizeTier } from '../tiers.js';
import { modesAt, minDate } from '../history.js';
import { recentChanges } from '../feed.js';
import { accent, kitLogo, badges, tierBadge, link, href, fragment, fillHeads, fmtDate } from '../ui.js';

const PAGE = 25;
const DAY = 86400000;

export function render(root, ctx) {
  const { players, kits } = ctx;
  const state = { kit: 'Overall', query: '', shown: PAGE, at: null };
  const first = minDate(players);
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const span = first ? Math.max(0, Math.round((todayUtc - first) / DAY)) : 0;

  root.innerHTML = `
    <section class="hero">
      <h1>DachshundTiers</h1>
      <p>${players.length} hráčů · ${kits.length} kitů</p>
    </section>
    <div class="board-layout">
      <div>
        ${first && span > 0 ? `
        <div class="card timemachine">
          <div class="timemachine-head">
            <span class="timemachine-label">Stroj času</span>
            <span class="timemachine-date" id="tm-date">dnes</span>
            <button class="btn ghost timemachine-reset" id="tm-reset" type="button">Dnes</button>
          </div>
          <input class="timemachine-range" id="tm-range" type="range" min="0" max="${span}" value="${span}" aria-label="Datum stavu žebříčku">
        </div>` : ''}
        <div class="controls">
          <nav class="tabs" id="tabs" aria-label="Kit"></nav>
          <input class="input" id="search" type="search" placeholder="Hledat hráče" aria-label="Hledat hráče" autocomplete="off">
        </div>
        <div class="board" id="board"></div>
        <button class="btn ghost board-more" id="more" type="button" hidden>Zobrazit další</button>
      </div>
      <aside class="rail">
        <div class="card">
          <h3>Poslední změny</h3>
          <ul class="rail-list" id="feed"></ul>
        </div>
      </aside>
    </div>`;

  const $ = s => root.querySelector(s);

  const modesFor = p => (state.at ? modesAt(p, state.at) : p.modes);

  function visible() {
    const q = state.query.trim().toLowerCase();
    const list = players
      .map(p => ({ ...p, modes: modesFor(p) }))
      .filter(p => Object.keys(p.modes).length && (!q || p.username.toLowerCase().includes(q)));
    if (state.kit === 'Overall') return sortPlayers(list);
    return list
      .filter(p => p.modes[state.kit])
      .sort((a, b) => tierPoints(b.modes[state.kit]) - tierPoints(a.modes[state.kit]) || a.username.localeCompare(b.username));
  }

  function renderTabs() {
    $('#tabs').innerHTML = ['Overall', ...kits].map(k =>
      `<button type="button" class="tab${k === state.kit ? ' active' : ''}" aria-pressed="${k === state.kit}" data-k="${esc(k)}" style="--k:${accent(k)}">${k === 'Overall' ? '' : kitLogo(k)}${esc(k)}</button>`).join('');
  }

  function markTab() {
    $('#tabs').querySelectorAll('[data-k]').forEach(b => {
      const on = b.dataset.k === state.kit;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  function renderBoard() {
    const list = visible();
    const board = $('#board');
    if (!list.length) {
      board.innerHTML = `<p class="empty">${
        state.at ? 'K tomuto datu ještě nikdo nebyl testován.'
          : players.length ? 'Žádný hráč neodpovídá hledání.' : 'Zatím tu nejsou žádní hráči.'}</p>`;
      $('#more').hidden = true;
      return;
    }
    const rows = list.slice(0, state.shown).map((p, i) => `
      <a class="board-row" style="--k:${accent(state.kit)}" href="${esc(href('hrac', p.username))}">
        <span class="rank">${i + 1}</span>
        <span data-head="${esc(p.username)}" data-size="40"></span>
        <span class="name">${esc(p.username)}</span>
        <span class="badges">${state.kit === 'Overall' ? badges(p) : tierBadge(p.modes[state.kit])}</span>
        <span class="pts">${state.kit === 'Overall' ? playerPoints(p.modes) : tierPoints(p.modes[state.kit])}</span>
      </a>`).join('');
    board.replaceChildren(fragment(rows));
    fillHeads(board);
    $('#more').hidden = list.length <= state.shown;
  }

  function renderFeed() {
    const items = recentChanges(players, 8);
    $('#feed').replaceChildren(fragment(items.length ? items.map(c => `
      <li class="rail-item">
        <span data-head="${esc(c.username)}" data-size="32"></span>
        <div>
          <div class="rail-item-title">${link(c.username, 'hrac', c.username)}</div>
          <div class="rail-item-note">${kitLogo(c.kit)}<span class="sr-only">${esc(c.kit)}</span>${c.from ? `${tierBadge(c.from)}<span class="arrow">→</span>` : ''}${tierBadge(c.to)}<span>${fmtDate(c.date)}</span></div>
        </div>
      </li>`).join('') : '<li class="empty">Zatím žádné změny.</li>'));
    fillHeads($('#feed'));
  }

  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    state.kit = b.dataset.k;
    state.shown = PAGE;
    markTab();
    renderBoard();
  });
  $('#search').addEventListener('input', e => { state.query = e.target.value; state.shown = PAGE; renderBoard(); });
  $('#more').addEventListener('click', () => { state.shown += PAGE; renderBoard(); });

  const range = $('#tm-range');
  if (range) {
    const setAt = v => {
      state.at = v >= span ? null : new Date(first.getTime() + v * DAY);
      $('#tm-date').textContent = state.at ? `stav k ${fmtDate(state.at)}` : 'dnes';
      state.shown = PAGE;
      renderBoard();
    };
    range.addEventListener('input', () => setAt(Number(range.value)));
    $('#tm-reset').addEventListener('click', () => { range.value = span; setAt(span); });
  }

  renderTabs();
  renderBoard();
  renderFeed();
}
