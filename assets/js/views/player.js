import { esc } from '../escape.js';
import { playerPoints, tierPoints, normalizeTier } from '../tiers.js';
import { peakOf, pointsSeries, parseDate } from '../history.js';
import { badgesFor, testsCount } from '../stats.js';
import { accent, kitLogo, tierBadge, head, fmtDate } from '../ui.js';

const LABELS = {
  'first-point': 'Získal první bod na tierlistu',
  ht1: 'Dosáhl HT1 v některém kitu',
  'all-kits': 'Testován ve všech kitech',
  'tests-50': 'Absolvoval 50 nebo více testů',
  'tests-100': 'Absolvoval 100 nebo více testů',
  'tests-200': 'Absolvoval 200 nebo více testů',
};

export function chartSvg(series) {
  if (series.length < 2) return '<p class="empty">Zatím málo dat pro graf.</p>';
  const W = 600, H = 200, L = 40, R = 12, T = 12, B = 28;
  const t0 = series[0].date.getTime();
  const t1 = series[series.length - 1].date.getTime();
  const max = Math.max(1, ...series.map(s => s.points));
  const x = d => L + ((d.getTime() - t0) / Math.max(1, t1 - t0)) * (W - L - R);
  const y = v => T + (1 - v / max) * (H - T - B);
  const pts = series.map(s => `${x(s.date).toFixed(1)},${y(s.points).toFixed(1)}`).join(' ');
  const dots = series.map(s => `<circle class="dot" cx="${x(s.date).toFixed(1)}" cy="${y(s.points).toFixed(1)}" r="3"><title>${fmtDate(s.date)}: ${s.points} bodů</title></circle>`).join('');
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Vývoj bodů v čase">
    <line class="grid" x1="${L}" y1="${y(0)}" x2="${W - R}" y2="${y(0)}"/>
    <line class="grid" x1="${L}" y1="${y(max)}" x2="${W - R}" y2="${y(max)}"/>
    <text x="${L - 6}" y="${y(max) + 4}" text-anchor="end">${max}</text>
    <text x="${L - 6}" y="${y(0) + 4}" text-anchor="end">0</text>
    <text x="${L}" y="${H - 8}">${fmtDate(series[0].date)}</text>
    <text x="${W - R}" y="${H - 8}" text-anchor="end">${fmtDate(series[series.length - 1].date)}</text>
    <polyline class="line" points="${pts}"/>${dots}</svg>`;
}

export function render(root, ctx, params) {
  const p = ctx.players.find(x => x.username === params.nick);
  if (!p) {
    root.innerHTML = '<div class="empty"><p>Hráč nenalezen.</p><a class="btn" href="#/">Zpět na úvod</a></div>';
    return;
  }
  const peak = peakOf(p);
  const kits = Object.keys(p.modes);
  const ids = badgesFor(p, ctx.kits);
  const peakRows = kits.map(k => `<tr><td>${kitLogo(k)} ${esc(k)}</td><td>${tierBadge(peak[k] ?? p.modes[k])}</td><td>${tierBadge(p.modes[k])}</td></tr>`).join('');
  const timeline = Object.entries(p.history).filter(([, h]) => Array.isArray(h) && h.length).map(([k, h]) => {
    const items = h.map((e, i) => {
      const d = parseDate(e?.date);
      const prev = i ? normalizeTier(h[i - 1]?.tier) : null;
      return `<li><span>${d ? fmtDate(d) : '—'}</span>${prev && prev !== normalizeTier(e?.tier) ? `${tierBadge(prev)}<span class="arrow">→</span>` : ''}${tierBadge(e?.tier)}</li>`;
    }).join('');
    return `<h4 class="timeline-kit-name" style="color:${accent(k)}">${kitLogo(k)}${esc(k)}</h4><ul class="timeline">${items}</ul>`;
  }).join('');

  root.innerHTML = `
    <div class="player-head">
      <span id="ph"></span>
      <div>
        <h1>${esc(p.username)}</h1>
        <div class="player-meta"><strong>${playerPoints(p.modes)}</strong> bodů · ${testsCount(p)} testů · ${kits.length} kitů</div>
      </div>
    </div>
    <div class="achievements">${ids.map(id => `<span class="chip">${LABELS[id]}</span>`).join('')}</div>
    <div class="grid-2">
      <div class="card"><h3>Peak tiery</h3>
        <table class="info-table"><thead><tr><th>Kit</th><th>Peak</th><th>Nyní</th></tr></thead><tbody>${peakRows}</tbody></table></div>
      <div class="card"><h3>Vývoj bodů</h3>${chartSvg(pointsSeries(p))}</div>
    </div>
    <div class="card"><h3>Historie testů</h3>${timeline || '<p class="empty">Bez historie.</p>'}</div>
    <p><a href="#/">← Zpět na žebříček</a></p>`;
  root.querySelector('#ph').replaceWith(head(p.username, 96));
}
