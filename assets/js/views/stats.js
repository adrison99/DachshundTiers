import { esc } from '../escape.js';
import { tierDistribution, kitPopularity, topTested, testsPerMonth } from '../stats.js';
import { accent, kitLogo, tierBadge, link } from '../ui.js';

const bar = (label, value, max, color) => `
  <div class="statbar">
    <span class="statbar-label">${label}</span>
    <span class="statbar-track"><span class="statbar-fill" style="width:${Math.round((value / Math.max(1, max)) * 100)}%;--k:${color}"></span></span>
    <span class="statbar-value">${value}</span>
  </div>`;

const none = '<p class="empty">Zatím žádná data.</p>';

export function render(root, ctx) {
  const { players } = ctx;
  const dist = tierDistribution(players);
  const kits = kitPopularity(players);
  const top = topTested(players, 10);
  const months = testsPerMonth(players);
  const mMax = Math.max(1, ...months.map(m => m.count));
  const dMax = Math.max(1, ...dist.map(d => d.count));

  root.innerHTML = `
    <h1 class="page-title">Statistiky</h1>
    <p class="page-sub">Rozložení tierů, nejhranější kity, nejčastěji testovaní hráči a testy po měsících.</p>
    <div class="stats-grid">
      <div class="card"><h3>Rozložení tierů</h3>${dist.length ? dist.map(d => bar(tierBadge(d.tier), d.count, dMax, '#e8c14a')).join('') : none}</div>
      <div class="card"><h3>Nejhranější kity</h3>${kits.length ? kits.map(k => bar(`${kitLogo(k.kit)} ${esc(k.kit)}`, k.count, kits[0].count, accent(k.kit))).join('') : none}</div>
      <div class="card"><h3>Nejčastěji testovaní</h3>${top.length ? top.map(t => bar(link(t.username, 'hrac', t.username), t.tests, top[0].tests, '#e8c14a')).join('') : none}</div>
      <div class="card"><h3>Testy po měsících</h3>${months.length
        ? `<div class="bars">${months.map(m => `<div title="${esc(m.month)}: ${m.count}"><span style="height:${Math.round((m.count / mMax) * 100)}%"></span>${esc(m.month.slice(5))}/${esc(m.month.slice(2, 4))}</div>`).join('')}</div>`
        : none}</div>
    </div>`;
}
