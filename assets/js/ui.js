import { esc } from './escape.js';
import { normalizeTier } from './tiers.js';

export const PNG_KITS = ['GoldSMP', 'NetheriteSword', 'IronAxe', 'UHCMace', 'AnchorPvP', 'RandomPot', 'ShieldlessSMP'];
export const KIT_ACCENTS = {
  GoldSMP: '#eab308', NetheriteSword: '#9aa7bd', IronAxe: '#fb923c', UHCMace: '#f43f5e',
  AnchorPvP: '#22d3ee', RandomPot: '#c084fc', ShieldlessSMP: '#34d399', MolePVP: '#a3e635',
};

export const accent = kit => (Object.hasOwn(KIT_ACCENTS, kit) ? KIT_ACCENTS[kit] : '#e8c14a');

export const href = (...parts) => '#/' + parts.map(encodeURIComponent).join('/');
export const link = (text, ...parts) => `<a href="${esc(href(...parts))}">${esc(text)}</a>`;

export const kitLogo = (kit, cls = 'kit-ico') => PNG_KITS.includes(kit)
  ? `<img class="${cls}" src="${esc(kit)}.png" alt="" loading="lazy">`
  : `<span class="${cls} kit-fallback" aria-hidden="true">⛏️</span>`;

export function tierBadge(tier) {
  const t = normalizeTier(tier);
  const group = /([1-5])$/.exec(t)?.[1] ?? '0';
  return `<span class="tier-badge" data-g="${group}" data-h="${t.includes('HT') ? 1 : 0}">${esc(t)}</span>`;
}

export function head(name, size = 40) {
  const img = document.createElement('img');
  img.className = 'head';
  img.width = size;
  img.height = size;
  img.alt = '';
  img.loading = 'lazy';
  img.src = `https://visage.surgeplay.com/face/${size * 2}/${encodeURIComponent(name)}`;
  img.addEventListener('error', () => {
    const span = document.createElement('span');
    span.className = 'head head-fallback';
    span.style.width = span.style.height = `${size}px`;
    span.textContent = name.slice(0, 2).toUpperCase();
    img.replaceWith(span);
  }, { once: true });
  return img;
}

export function badges(player) {
  return Object.entries(player.modes).map(([kit, tier]) =>
    `<span class="badge" style="--k:${accent(kit)}" title="${esc(kit)}">${kitLogo(kit)}<span class="sr-only">${esc(kit)} </span>${esc(normalizeTier(tier))}</span>`).join('');
}

export function allKits(players) {
  const found = new Set(players.flatMap(p => Object.keys(p.modes)));
  return [...PNG_KITS.filter(k => found.has(k)), ...[...found].filter(k => !PNG_KITS.includes(k)).sort()];
}

export const fragment = markup => {
  const t = document.createElement('template');
  t.innerHTML = markup;
  return t.content;
};

export const fillHeads = root => {
  root.querySelectorAll('[data-head]').forEach(slot => {
    slot.replaceWith(head(slot.dataset.head, Number(slot.dataset.size) || 40));
  });
};

export const fmtDate = d => `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
