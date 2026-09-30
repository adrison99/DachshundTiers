import { SUPABASE_URL, SUPABASE_ANON_KEY, LIVE_TIMEOUT_MS, FALLBACK_URL } from './config.js';

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

export function normalizePlayers(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter(r => isObj(r) && typeof r.username === 'string' && r.username.trim() && isObj(r.modes) && Object.keys(r.modes).length)
    .map(r => ({
      username: r.username,
      modes: r.modes,
      history: isObj(r.history) ? r.history : {},
      peak: isObj(r.peak) ? r.peak : {},
    }));
}

async function fetchJson(fetchImpl, url, options, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { ...options, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function loadPlayers({ fetchImpl = globalThis.fetch, timeoutMs = LIVE_TIMEOUT_MS } = {}) {
  try {
    const rows = await fetchJson(
      fetchImpl,
      `${SUPABASE_URL}/rest/v1/public_players?select=*`,
      { headers: { apikey: SUPABASE_ANON_KEY } },
      timeoutMs,
    );
    const players = normalizePlayers(rows);
    if (Array.isArray(rows) && rows.length && !players.length) throw new Error('unexpected shape');
    return { players, source: 'live' };
  } catch {
    const rows = await fetchJson(fetchImpl, `${FALLBACK_URL}?v=${Date.now()}`, {}, timeoutMs);
    return { players: normalizePlayers(rows), source: 'fallback' };
  }
}
