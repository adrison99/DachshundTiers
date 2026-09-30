import { TIER_ORDER, tierPoints } from '../tiers.js';
import { tierBadge } from '../ui.js';

export function render(root) {
  const rows = TIER_ORDER.filter(t => !t.startsWith('R')).map(t => `<tr><td>${tierBadge(t)}</td><td>${tierPoints(t)}</td></tr>`).join('');
  root.innerHTML = `
    <div class="prose">
      <h1 class="page-title">Informace</h1>
      <p class="page-sub">Odkud data jsou a jak se počítá skóre.</p>
      <h2>Odkud data jsou</h2>
      <p>Tiery, historie testů i nicky se čtou živě z databáze, do které je zapisuje Discord bot DACHSHUNDTIERS. Web nic nezapisuje a o tierech nerozhoduje, jen je ukazuje přehledněji.</p>
      <h2>Jak fungují tiery a body</h2>
      <p>Každý tier má pevný počet bodů. Skóre hráče je součet bodů za jeho aktuální tier v každém kitu. Retired tiery (například RLT2) mají o něco méně bodů než jejich aktivní varianta.</p>
      <div class="card"><table class="info-table"><thead><tr><th>Tier</th><th>Body</th></tr></thead><tbody>${rows}</tbody></table></div>
      <h2>Počet testů</h2>
      <p>Počet testů se odhaduje jako počet záznamů v historii hráče, protože web nemá jiný zdroj.</p>
    </div>`;
}
