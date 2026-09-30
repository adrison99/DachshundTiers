import { loadPlayers } from './data.js';
import { esc } from './escape.js';
import { sortPlayers, playerPoints, tierPoints, normalizeTier } from './tiers.js';

const $ = s => document.querySelector(s);
const PNG_KITS = ['GoldSMP', 'NetheriteSword', 'IronAxe', 'UHCMace', 'AnchorPvP', 'RandomPot', 'ShieldlessSMP'];
const KIT_ACCENTS = { Overall: '#f59e0b', GoldSMP: '#eab308', NetheriteSword: '#9aa7bd', IronAxe: '#fb923c', UHCMace: '#f43f5e', AnchorPvP: '#22d3ee', RandomPot: '#c084fc', ShieldlessSMP: '#34d399', MolePVP: '#a3e635' };
const accent = kit => KIT_ACCENTS[kit] || '#5fb6ff';

const state = { players: [], kit: 'Overall', query: '' };

const kitLogo = (kit, cls) => PNG_KITS.includes(kit)
  ? `<img class="${cls}" src="${esc(kit)}.png" alt="${esc(kit)}" loading="lazy">`
  : `<span class="${cls} kit-fallback" title="${esc(kit)}" aria-hidden="true">⛏️</span>`;

function head(name) {
  const img = document.createElement('img');
  img.className = 'head';
  img.alt = '';
  img.loading = 'lazy';
  img.src = `https://visage.surgeplay.com/face/64/${encodeURIComponent(name)}`;
  img.addEventListener('error', () => {
    const span = document.createElement('span');
    span.className = 'head head-fallback';
    span.textContent = name.slice(0, 2).toUpperCase();
    img.replaceWith(span);
  }, { once: true });
  return img;
}

function kitsOf(players) {
  const found = new Set(players.flatMap(p => Object.keys(p.modes)));
  return [...PNG_KITS.filter(k => found.has(k)), ...[...found].filter(k => !PNG_KITS.includes(k)).sort()];
}

function visible() {
  const q = state.query.trim().toLowerCase();
  const list = state.players.filter(p => !q || p.username.toLowerCase().includes(q));
  if (state.kit === 'Overall') return sortPlayers(list);
  return list
    .filter(p => p.modes[state.kit])
    .sort((a, b) => tierPoints(b.modes[state.kit]) - tierPoints(a.modes[state.kit]) || a.username.localeCompare(b.username));
}

function badges(p) {
  return Object.entries(p.modes).map(([k, t]) =>
    `<span class="badge" style="--k:${accent(k)}">${kitLogo(k, 'kit-ico')}${esc(normalizeTier(t))}</span>`).join('');
}

function row(p, i) {
  const btn = document.createElement('button');
  btn.className = 'row';
  btn.type = 'button';
  btn.style.setProperty('--k', accent(state.kit));
  btn.dataset.u = p.username;
  btn.innerHTML = `<span class="rank">${i + 1}</span><span class="slot"></span><span class="name">${esc(p.username)}</span><span class="badges">${badges(p)}</span><span class="pts">${state.kit === 'Overall' ? playerPoints(p.modes) : tierPoints(p.modes[state.kit])}</span>`;
  btn.querySelector('.slot').replaceWith(head(p.username));
  return btn;
}

function render() {
  const list = visible();
  $('#player-count').textContent = `${state.players.length} hráčů`;
  const board = $('#board');
  if (!list.length) {
    board.innerHTML = state.players.length
      ? '<p class="empty">Žádný hráč neodpovídá hledání.</p>'
      : '<p class="empty">Zatím tu nejsou žádní hráči.</p>';
    return;
  }
  board.replaceChildren(...list.map(row));
}

function renderTabs() {
  const kits = ['Overall', ...kitsOf(state.players)];
  $('#kit-tabs').innerHTML = kits.map(k =>
    `<button type="button" class="tab${k === state.kit ? ' active' : ''}" data-k="${esc(k)}" style="--k:${accent(k)}">${k === 'Overall' ? '' : kitLogo(k, 'kit-ico')}${esc(k)}</button>`).join('');
}

function openPlayer(name) {
  const p = state.players.find(x => x.username === name);
  if (!p) return;
  const hist = Object.entries(p.history).map(([k, h]) =>
    `<h4>${kitLogo(k, 'kit-ico')} ${esc(k)}</h4><ul>${h.map(e => `<li><span>${esc(e.date)}</span><b>${esc(normalizeTier(e.tier))}</b></li>`).join('')}</ul>`).join('');
  const modal = $('#player-modal');
  modal.innerHTML = `<form method="dialog"><button class="close" aria-label="Zavřít">×</button></form><span class="slot"></span><h3>${esc(p.username)}</h3><p class="pts">${playerPoints(p.modes)} bodů</p><div class="badges">${badges(p)}</div>${hist || '<p class="empty">Bez historie.</p>'}`;
  modal.querySelector('.slot').replaceWith(head(p.username));
  modal.showModal();
}

async function init() {
  $('#board').innerHTML = '<p class="empty">Načítám…</p>';
  try {
    const { players, source } = await loadPlayers();
    state.players = players;
    const banner = $('#banner');
    banner.hidden = source === 'live';
    if (source !== 'live') banner.textContent = 'Živá data jsou dočasně nedostupná. Zobrazuji poslední uložený stav.';
    renderTabs();
    render();
  } catch {
    $('#board').innerHTML = '<div class="empty"><p>Data se nepodařilo načíst.</p><button id="retry" type="button">Zkusit znovu</button></div>';
    $('#retry').addEventListener('click', init);
  }
}

$('#kit-tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-k]');
  if (b) { state.kit = b.dataset.k; renderTabs(); render(); }
});
$('#search').addEventListener('input', e => { state.query = e.target.value; render(); });
$('#board').addEventListener('click', e => {
  const r = e.target.closest('[data-u]');
  if (r) openPlayer(r.dataset.u);
});
$('#player-modal').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

init();
