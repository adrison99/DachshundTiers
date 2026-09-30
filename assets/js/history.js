import { tierPoints, normalizeTier } from './tiers.js';

export function parseDate(s) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(s ?? '').trim());
  if (!m) return null;
  const [d, mo, y] = [+m[1], +m[2], +m[3]];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d ? date : null;
}

const entriesOf = h => (Array.isArray(h) ? h : []);

export function modesAt(player, date) {
  const out = {};
  for (const [kit, entries] of Object.entries(player.history ?? {})) {
    let last = null;
    for (const e of entriesOf(entries)) {
      const d = parseDate(e?.date);
      if (d && d <= date) last = e.tier;
    }
    if (last) out[kit] = last;
  }
  return out;
}

export function peakOf(player) {
  const best = {};
  const consider = (kit, tier) => {
    if (!tier) return;
    if (!(kit in best) || tierPoints(tier) > tierPoints(best[kit])) best[kit] = normalizeTier(tier);
  };
  for (const [kit, entries] of Object.entries(player.history ?? {})) entriesOf(entries).forEach(e => consider(kit, e?.tier));
  for (const [kit, tier] of Object.entries(player.modes ?? {})) consider(kit, tier);
  return best;
}

export function minDate(players) {
  let min = null;
  for (const p of players) for (const entries of Object.values(p.history ?? {})) for (const e of entriesOf(entries)) {
    const d = parseDate(e?.date);
    if (d && (!min || d < min)) min = d;
  }
  return min;
}

export function pointsSeries(player) {
  const events = [];
  for (const [kit, entries] of Object.entries(player.history ?? {})) entriesOf(entries).forEach((e, i) => {
    const date = parseDate(e?.date);
    if (date) events.push({ kit, tier: e.tier, date, i });
  });
  events.sort((a, b) => a.date - b.date || a.i - b.i);
  const current = {};
  return events.map(ev => {
    current[ev.kit] = tierPoints(ev.tier);
    return { date: ev.date, points: Object.values(current).reduce((s, n) => s + n, 0) };
  });
}
