const STATIC = { kity: 'kits', statistiky: 'stats', kalkulacka: 'calc', info: 'info', soukromi: 'privacy', porovnani: 'compare' };
const HOME = { name: 'home', params: {} };

export function parseHash(hash) {
  const path = String(hash ?? '').replace(/^#\/?/, '');
  if (!path) return HOME;
  let parts;
  try { parts = path.split('/').map(decodeURIComponent); } catch { return HOME; }
  const [head, p1, p2] = parts;
  if (parts.length === 1 && STATIC[head]) return { name: STATIC[head], params: {} };
  if (head === 'kity' && parts.length === 2) return { name: 'kit', params: { kit: p1 } };
  if (head === 'hrac' && parts.length === 2) return { name: 'player', params: { nick: p1 } };
  if (head === 'porovnani' && parts.length === 3) return { name: 'compare', params: { a: p1, b: p2 } };
  return HOME;
}
