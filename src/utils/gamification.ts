import type { XpLevel } from '@/types';

const LEVELS: XpLevel[] = [
  { level: 1,  label: 'Starter',     minXp: 0,    maxXp: 199 },
  { level: 2,  label: 'Committed',   minXp: 200,  maxXp: 499 },
  { level: 3,  label: 'Consistent',  minXp: 500,  maxXp: 999 },
  { level: 4,  label: 'Disciplined', minXp: 1000, maxXp: 1999 },
  { level: 5,  label: 'Builder',     minXp: 2000, maxXp: 3499 },
  { level: 6,  label: 'Anchor',      minXp: 3500, maxXp: 5499 },
  { level: 7,  label: 'Operator',    minXp: 5500, maxXp: 7999 },
  { level: 8,  label: 'Elite',       minXp: 8000, maxXp: 11999 },
  { level: 9,  label: 'Forged',      minXp: 12000, maxXp: 17999 },
  { level: 10, label: 'Kairos',      minXp: 18000, maxXp: Infinity },
];

export function getLevelForXp(xp: number): XpLevel {
  return LEVELS.find((l) => xp >= l.minXp && xp <= l.maxXp) ?? LEVELS[0];
}

export function getXpProgressInLevel(xp: number): number {
  const level = getLevelForXp(xp);
  if (level.maxXp === Infinity) return 100;
  const range = level.maxXp - level.minXp;
  const progress = xp - level.minXp;
  return Math.round((progress / range) * 100);
}
