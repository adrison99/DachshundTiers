import { esc } from '../escape.js';
import { tierPoints, normalizeTier, TIER_ORDER } from '../tiers.js';
import { kitPopularity } from '../stats.js';
import { accent, kitLogo, link, href, tierBadge, fragment, fillHeads } from '../ui.js';

const LADDER = ['HT1', 'LT1', 'HT2', 'LT2', 'HT3', 'LT3', 'HT4', 'LT4', 'HT5', 'LT5'];

export function render(root, ctx, params) {
  if (params.kit !== undefined) renderKit(root, ctx, params.kit);
  else renderList(root, ctx);
}

function renderList(root, ctx) {
  const tiles = kitPopularity(ctx.players).map(({ kit, count }) => `
    <a class="kit-tile" style="--k:${accent(kit)}" href="${esc(href('kity', kit))}">
      ${kitLogo(kit, 'kit-ico lg')}
      <div><div class="kit-tile-name">${esc(kit)}</div><div class="kit-tile-count">${count} hráčů</div></div>
    </a>`).join('');
  root.innerHTML = `
    <h1 class="page-title">Kity</h1>
    <p class="page-sub">Žebříček pro každý kit zvlášť.</p>
    ${tiles ? `<div class="kit-tiles">${tiles}</div>` : '<p class="empty">Zatím tu nejsou žádné kity.</p>'}`;
}

function renderKit(root, ctx, kit) {
  if (!ctx.kits.includes(kit)) {
    root.innerHTML = `<div class="empty"><p>Kit nenalezen.</p><a class="btn" href="#/kity">Zpět na kity</a></div>`;
    return;
  }
  const inKit = ctx.players.filter(p => p.modes[kit]);
  const best = [...inKit].sort((a, b) => tierPoints(b.modes[kit]) - tierPoints(a.modes[kit]) || a.username.localeCompare(b.username))[0];
  const byTier = {};
  for (const p of inKit) (byTier[normalizeTier(p.modes[kit])] ??= []).push(p);
  const extra = TIER_ORDER.filter(t => byTier[t] && !LADDER.includes(t));
  const other = Object.keys(byTier).filter(t => !TIER_ORDER.includes(t)).sort();
  const cols = [...LADDER, ...extra, ...other].map(t => {
    const list = (byTier[t] ?? []).sort((a, b) => a.username.localeCompare(b.username));
    return `
      <section class="kit-col">
        <div class="kit-col-head">${tierBadge(t)}<span class="kit-col-count">${list.length}</span></div>
        <div class="kit-col-body">${list.length
          ? list.map(p => `<a href="${esc(href('hrac', p.username))}"><span data-head="${esc(p.username)}" data-size="24"></span>${esc(p.username)}</a>`).join('')
          : '<span class="kit-col-empty">nikdo</span>'}</div>
      </section>`;
  }).join('');
  root.innerHTML = `
    <div class="card kit-hero" style="--k:${accent(kit)}">
      ${kitLogo(kit, 'kit-ico lg')}
      <div>
        <h1 class="page-title">${esc(kit)}</h1>
        <div class="kit-hero-best">${inKit.length} hráčů${best ? ` · nejlepší: ${link(best.username, 'hrac', best.username)} ${tierBadge(best.modes[kit])}` : ''}</div>
      </div>
    </div>
    <div class="kit-grid">${cols}</div>
    <p><a href="#/kity">← Všechny kity</a></p>`;
  fillHeads(root);
}
