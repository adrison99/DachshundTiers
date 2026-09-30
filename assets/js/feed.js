import { parseDate } from './history.js';
import { normalizeTier } from './tiers.js';

export function recentChanges(players, limit) {
  const out = [];
  let seq = 0;
  for (const p of players) for (const [kit, entries] of Object.entries(p.history ?? {})) {
    if (!Array.isArray(entries)) continue;
    let prev = null;
    for (const e of entries) {
      const date = parseDate(e?.date);
      const to = normalizeTier(e?.tier);
      if (date) out.push({ username: p.username, kit, from: prev, to, date, seq: seq++ });
      prev = to;
    }
  }
  out.sort((a, b) => b.date - a.date || b.seq - a.seq);
  return out.slice(0, limit).map(({ seq: _seq, ...rest }) => rest);
}
