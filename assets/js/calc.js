import { tierPoints, playerPoints } from './tiers.js';

export const score = selection => Object.values(selection ?? {}).reduce((s, t) => s + tierPoints(t), 0);

export function rankFor(value, players) {
  return { rank: 1 + players.filter(p => playerPoints(p.modes) > value).length, total: players.length };
}
