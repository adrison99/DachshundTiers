import { tierPoints, playerPoints, normalizeTier } from './tiers.js';

export function compare(a, b) {
  const kits = [...new Set([...Object.keys(a.modes ?? {}), ...Object.keys(b.modes ?? {})])].sort();
  const rows = kits.map(kit => {
    const ta = a.modes?.[kit] ? normalizeTier(a.modes[kit]) : null;
    const tb = b.modes?.[kit] ? normalizeTier(b.modes[kit]) : null;
    const pa = tierPoints(ta);
    const pb = tierPoints(tb);
    return { kit, a: ta, b: tb, winner: pa > pb ? 'a' : pb > pa ? 'b' : 'tie' };
  });
  return { rows, totalA: playerPoints(a.modes), totalB: playerPoints(b.modes) };
}
