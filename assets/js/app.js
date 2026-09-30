import { loadPlayers } from './data.js';
import { parseHash, createGuard } from './router.js';
import { allKits } from './ui.js';

const loaders = {
  home: () => import('./views/home.js'),
  kits: () => import('./views/kits.js'),
  kit: () => import('./views/kits.js'),
  player: () => import('./views/player.js'),
  stats: () => import('./views/stats.js'),
  compare: () => import('./views/compare.js'),
  calc: () => import('./views/calc.js'),
  info: () => import('./views/info.js'),
  privacy: () => import('./views/privacy.js'),
};

const $ = s => document.querySelector(s);
let ctx = null;
const guard = createGuard();

async function route() {
  if (!ctx) return;
  const id = guard.next();
  const { name, params } = parseHash(location.hash);
  const active = name === 'kit' ? 'kits' : name;
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.route === active));
  const root = $('#view');
  try {
    const mod = await loaders[name]();
    if (!guard.isCurrent(id)) return;
    root.replaceChildren();
    mod.render(root, ctx, params);
  } catch {
    if (!guard.isCurrent(id)) return;
    root.innerHTML = '<div class="empty"><p>Stránku se nepodařilo zobrazit.</p><a class="btn" href="#/">Zpět na úvod</a></div>';
  }
  window.scrollTo(0, 0);
}

async function init() {
  const gate = $('#gate');
  gate.hidden = false;
  try {
    const { players, source } = await loadPlayers();
    ctx = { players, kits: allKits(players) };
    const banner = $('#banner');
    banner.hidden = source === 'live';
    if (source !== 'live') banner.textContent = 'Živá data jsou dočasně nedostupná. Zobrazuji poslední uložený stav.';
    await route();
  } catch {
    $('#view').innerHTML = '<div class="empty"><p>Data se nepodařilo načíst.</p><button id="retry" type="button">Zkusit znovu</button></div>';
    $('#retry').addEventListener('click', init);
  } finally {
    gate.hidden = true;
  }
}

addEventListener('hashchange', route);
init();
