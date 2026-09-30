import { esc } from '../escape.js';
import { compare } from '../compare.js';
import { kitLogo, tierBadge, href, head } from '../ui.js';

export function render(root, ctx, params) {
  const { players } = ctx;
  const find = name => players.find(p => p.username.toLowerCase() === String(name ?? '').trim().toLowerCase()) ?? null;

  root.innerHTML = `
    <h1 class="page-title">Porovnání hráčů</h1>
    <p class="page-sub">Dva hráči kit po kitu — kdo v čem vede a o kolik bodů.</p>
    <div class="compare-pick">
      <div><input class="input" id="pa" list="plist" placeholder="První hráč" aria-label="První hráč" autocomplete="off" value="${esc(params.a ?? '')}"><p class="field-msg" id="ma" hidden></p></div>
      <div><input class="input" id="pb" list="plist" placeholder="Druhý hráč" aria-label="Druhý hráč" autocomplete="off" value="${esc(params.b ?? '')}"><p class="field-msg" id="mb" hidden></p></div>
    </div>
    <datalist id="plist">${players.map(p => `<option value="${esc(p.username)}"></option>`).join('')}</datalist>
    <div class="compare-grid" id="result"></div>`;

  const $ = s => root.querySelector(s);

  function update() {
    const va = $('#pa').value, vb = $('#pb').value;
    const a = find(va), b = find(vb);
    for (const [id, v, found] of [['#ma', va, a], ['#mb', vb, b]]) {
      const msg = $(id);
      msg.hidden = !v.trim() || !!found;
      msg.textContent = 'Hráč nenalezen.';
    }
    const out = $('#result');
    if (!a || !b) {
      out.innerHTML = '<p class="empty">Vyber dva hráče, které chceš porovnat.</p>';
      return;
    }
    history.replaceState(null, '', href('porovnani', a.username, b.username));
    const r = compare(a, b);
    const cell = (tier, win, right) => `<div class="compare-cell${right ? ' right' : ''}${win ? ' win' : ''}">${tier ? tierBadge(tier) : '<span class="dash">—</span>'}</div>`;
    out.innerHTML = `
      <div class="card compare-card">
        <div class="compare-nick"><span data-h="a"></span>${esc(a.username)}</div>
        <div class="compare-vs">vs</div>
        <div class="compare-nick right">${esc(b.username)}<span data-h="b"></span></div>
      </div>
      ${r.rows.map(row => `
        <div class="compare-row">
          ${cell(row.a, row.winner === 'a', false)}
          <div class="compare-kit">${kitLogo(row.kit)}${esc(row.kit)}</div>
          ${cell(row.b, row.winner === 'b', true)}
        </div>`).join('')}
      <div class="compare-row compare-total">
        <div class="${r.totalA > r.totalB ? 'win' : ''}">${r.totalA} b.</div><div>Celkem</div><div class="${r.totalB > r.totalA ? 'win' : ''}">${r.totalB} b.</div>
      </div>`;
    out.querySelector('[data-h="a"]').replaceWith(head(a.username, 48));
    out.querySelector('[data-h="b"]').replaceWith(head(b.username, 48));
  }

  $('#pa').addEventListener('input', update);
  $('#pb').addEventListener('input', update);
  update();
}
