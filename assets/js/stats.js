import { parseDate, peakOf } from './history.js';
import { normalizeTier, playerPoints, TIER_ORDER } from './tiers.js';

export function testsCount(player) {
  return Object.values(player.history ?? {}).reduce((n, h) => n + (Array.isArray(h) ? h.length : 0), 0);
}

export function badgesFor(player, allKits) {
  const ids = [];
  if (playerPoints(player.modes) > 0) ids.push('first-point');
  if (Object.values(peakOf(player)).some(t => normalizeTier(t) === 'HT1')) ids.push('ht1');
  if (allKits.length && allKits.every(k => player.modes?.[k])) ids.push('all-kits');
  const n = testsCount(player);
  for (const t of [50, 100, 200]) if (n >= t) ids.push(`tests-${t}`);
  return ids;
}

export function tierDistribution(players) {
  const counts = {};
  for (const p of players) for (const t of Object.values(p.modes ?? {})) {
    const c = normalizeTier(t);
    counts[c] = (counts[c] ?? 0) + 1;
  }
  const known = TIER_ORDER.filter(t => counts[t]).map(tier => ({ tier, count: counts[tier] }));
  const unknown = Object.keys(counts).filter(t => !TIER_ORDER.includes(t)).sort().map(tier => ({ tier, count: counts[tier] }));
  return [...known, ...unknown];
}

export function kitPopularity(players) {
  const counts = {};
  for (const p of players) for (const k of Object.keys(p.modes ?? {})) counts[k] = (counts[k] ?? 0) + 1;
  return Object.entries(counts).map(([kit, count]) => ({ kit, count })).sort((a, b) => b.count - a.count || a.kit.localeCompare(b.kit));
}

export function topTested(players, n) {
  return players.map(p => ({ username: p.username, tests: testsCount(p) }))
    .sort((a, b) => b.tests - a.tests || a.username.localeCompare(b.username)).slice(0, n);
}

export function testsPerMonth(players) {
  const counts = {};
  for (const p of players) for (const entries of Object.values(p.history ?? {})) {
    if (!Array.isArray(entries)) continue;
    for (const e of entries) {
      const d = parseDate(e?.date);
      if (d) { const m = d.toISOString().slice(0, 7); counts[m] = (counts[m] ?? 0) + 1; }
    }
  }
  return Object.keys(counts).sort().map(month => ({ month, count: counts[month] }));
}
