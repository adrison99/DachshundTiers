import { esc } from '../escape.js';
import { score, rankFor } from '../calc.js';
import { kitLogo } from '../ui.js';

const OPTIONS = ['HT1', 'LT1', 'HT2', 'LT2', 'HT3', 'LT3', 'HT4', 'LT4', 'HT5', 'LT5'];

export function render(root, ctx) {
  const { players, kits } = ctx;
  root.innerHTML = `
    <h1 class="page-title">Kalkulačka skóre</h1>
    <p class="page-sub">Spočítej si, kolik bodů dají tiery v jednotlivých kitech a kam tě to posune v žebříčku.</p>
    <div class="calc-layout">
      <div class="card calc-rows">${kits.length ? kits.map(k => `
        <label class="calc-row">
          <span class="calc-kit-name">${kitLogo(k)}${esc(k)}</span>
          <select class="input" data-kit="${esc(k)}" aria-label="Tier v kitu ${esc(k)}">
            <option value="">–</option>${OPTIONS.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </label>`).join('') : '<p class="empty">Zatím tu nejsou žádné kity.</p>'}
      </div>
      <div class="card calc-result">
        <div class="calc-score" id="score">0</div>
        <div class="calc-result-label">bodů</div>
        <p id="rank" class="calc-result-label"></p>
      </div>
    </div>`;

  const update = () => {
    const selection = {};
    root.querySelectorAll('select[data-kit]').forEach(s => { if (s.value) selection[s.dataset.kit] = s.value; });
    const value = score(selection);
    root.querySelector('#score').textContent = value;
    const { rank, total } = rankFor(value, players);
    root.querySelector('#rank').textContent = total && value ? `${rank}. místo z ${total}` : '';
  };
  root.querySelectorAll('select[data-kit]').forEach(s => s.addEventListener('change', update));
  update();
}
