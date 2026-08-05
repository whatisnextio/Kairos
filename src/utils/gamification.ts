import {
  type CheckInStatus,
  type EarnedBadge,
  PUBLIC_DOMAIN_TYPES,
  type Profile,
  type XpLevel,
} from '@/types';

const LEVELS: XpLevel[] = [
  { level: 1, label: 'Starter', minXp: 0, maxXp: 199 },
  { level: 2, label: 'Committed', minXp: 200, maxXp: 499 },
  { level: 3, label: 'Consistent', minXp: 500, maxXp: 999 },
  { level: 4, label: 'Disciplined', minXp: 1000, maxXp: 1999 },
  { level: 5, label: 'Builder', minXp: 2000, maxXp: 3499 },
  { level: 6, label: 'Anchor', minXp: 3500, maxXp: 5499 },
  { level: 7, label: 'Operator', minXp: 5500, maxXp: 7999 },
  { level: 8, label: 'Elite', minXp: 8000, maxXp: 11999 },
  { level: 9, label: 'Forged', minXp: 12000, maxXp: 17999 },
  { level: 10, label: 'Kairos', minXp: 18000, maxXp: Number.POSITIVE_INFINITY },
];

export const POINTS_SHORT_LABEL = 'KP';
export const POINTS_FULL_LABEL = 'Kairos Points';

export function formatKairosPoints(points: number): string {
  return `${points.toLocaleString()} ${POINTS_SHORT_LABEL}`;
}

export function getLevelForXp(xp: number): XpLevel {
  return LEVELS.find((l) => xp >= l.minXp && xp <= l.maxXp) ?? LEVELS[0];
}

export function getXpProgressInLevel(xp: number): number {
  const level = getLevelForXp(xp);
  if (level.maxXp === Number.POSITIVE_INFINITY) return 100;
  const range = level.maxXp - level.minXp;
  const progress = xp - level.minXp;
  return Math.round((progress / range) * 100);
}

export function getXpForCheckInStatus(status: CheckInStatus | undefined, active: boolean): number {
  if (!active) return 0;
  if (status === 'Done') return 25;
  if (status === 'Partial') return 10;
  return 0;
}

export function getFortnightBlockKey(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00`);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - yearStart.getTime()) / 86_400_000) + 1;
  const block = Math.ceil(dayOfYear / 14);
  return `${date.getFullYear()}-${String(block).padStart(2, '0')}`;
}

export function getWeekKey(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function shouldAwardWeeklyBonus({
  weekDates,
  history,
  active,
  alreadyAwarded,
}: {
  weekDates: string[];
  history: Record<string, Partial<Record<string, CheckInStatus>>>;
  active: boolean;
  alreadyAwarded: boolean;
}): boolean {
  if (!active || alreadyAwarded || weekDates.length !== 7) return false;
  return weekDates.every((date) =>
    PUBLIC_DOMAIN_TYPES.every((domain) => {
      const status = history[date]?.[domain];
      return status === 'Done' || status === 'Partial' || status === 'Protected';
    }),
  );
}

export function deriveEarnedBadges({
  profile: _profile,
  checkInHistory,
  todayCheckIns,
  rewardedImproveCards,
  streakProtectionHistory,
  awardedWeeklyBonuses = {},
  dayInCycle,
}: {
  profile: Profile;
  checkInHistory: Record<string, Partial<Record<string, CheckInStatus>>>;
  todayCheckIns: Partial<Record<string, { status: CheckInStatus }>>;
  rewardedImproveCards: Record<string, true>;
  streakProtectionHistory: Record<string, true>;
  awardedWeeklyBonuses?: Record<string, true>;
  dayInCycle: number;
}): EarnedBadge[] {
  const allStatuses = [
    ...Object.values(checkInHistory).flatMap((day) => Object.values(day)),
    ...Object.values(todayCheckIns).map((checkIn) => checkIn?.status),
  ];
  const todayStatuses = PUBLIC_DOMAIN_TYPES.map((domain) => todayCheckIns[domain]?.status);
  const hasTodayFullHouse = todayStatuses.every(
    (status) => status === 'Done' || status === 'Partial' || status === 'Protected',
  );
  const hasProtectedDay =
    Object.keys(streakProtectionHistory).length > 0 || allStatuses.includes('Protected');

  const badges: EarnedBadge[] = [
    {
      id: 'first-proof',
      label: 'First Proof',
      description: 'Logged the first useful action.',
      trigger: 'Complete one Done check-in.',
      earned: allStatuses.includes('Done'),
    },
    {
      id: 'full-house',
      label: 'Full House',
      description: 'Closed all four core domains in one day.',
      trigger: 'Check in Body, Fuel, Self, and Connection today.',
      earned: hasTodayFullHouse,
    },
    {
      id: 'seven-day-flywheel',
      label: '7-Day Flywheel',
      description: 'Kept every core domain live across a full week.',
      trigger: 'Close all four core domains for a full week.',
      earned: Object.keys(awardedWeeklyBonuses).length > 0,
    },
    {
      id: 'protected-rhythm',
      label: 'Life Happens',
      description: 'Used protection without breaking the rhythm.',
      trigger: 'Use streak protection on a disrupted day.',
      earned: hasProtectedDay,
    },
    {
      id: 'challenge-closed',
      label: 'Challenge Closed',
      description: 'Completed an Improve challenge.',
      trigger: 'Accept and complete one Improve card.',
      earned: Object.keys(rewardedImproveCards).length > 0,
    },
    {
      id: 'cycle-finisher',
      label: 'Round Finisher',
      description: 'Reached the end of an 84-day round.',
      trigger: 'Reach Day 84 and close the round.',
      earned: dayInCycle >= 84,
    },
  ];

  return badges;
}
