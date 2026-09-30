const POINTS = {
  HT1: 60, LT1: 48, RHT1: 54, RLT1: 44,
  HT2: 32, LT2: 24, RHT2: 29, RLT2: 22,
  HT3: 16, LT3: 10, RHT3: 14, RLT3: 8,
  HT4: 5, LT4: 3, RHT4: 4, RLT4: 2,
  HT5: 2, LT5: 1, RHT5: 1, RLT5: 1,
};

export const TIER_ORDER = Object.keys(POINTS);

const LT3_ALIASES = new Set(['LT3E', 'LT3 EVAL']);

export function normalizeTier(code) {
  const c = String(code ?? '').trim().toUpperCase();
  return LT3_ALIASES.has(c) ? 'LT3' : c;
}

export function tierPoints(code) {
  return POINTS[normalizeTier(code)] ?? 0;
}

export function playerPoints(modes) {
  return Object.values(modes ?? {}).reduce((sum, t) => sum + tierPoints(t), 0);
}

export function sortPlayers(players) {
  return [...players].sort((a, b) =>
    playerPoints(b.modes) - playerPoints(a.modes) ||
    a.username.localeCompare(b.username));
}
