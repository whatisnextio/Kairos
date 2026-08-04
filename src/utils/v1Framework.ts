import type { CheckInStatus, DailyCheckIn, DomainConfig, DomainType } from '@/types';
import { getAvailableDomains, isOwnerAccount } from '@/types';

export interface EarlyWakeProtocol {
  title: string;
  body: string;
  steps: string[];
}

export interface CatchUpPath {
  title: string;
  body: string;
  domainType: DomainType;
  domainLabel: string;
  steps: string[];
}

export interface AccountabilityPrompt {
  level: 1 | 2 | 3;
  title: string;
  body: string;
  steps: string[];
}

export interface FlywheelEntry {
  domainType: DomainType;
  label: string;
  done: number;
  partial: number;
  missed: number;
  total: number;
  score: number;
  state: 'steady' | 'thin' | 'needs_attention';
}

export interface FlywheelSummary {
  title: string;
  entries: FlywheelEntry[];
}

export const OWNER_FLYWHEEL: Array<{ domainType: DomainType; label: string }> = [
  { domainType: 'BODY', label: 'Body' },
  { domainType: 'USTIME', label: 'Marriage' },
  { domainType: 'NEST', label: 'Family' },
  { domainType: 'ROOTS', label: 'Money' },
  { domainType: 'SHOT', label: 'SHOT' },
  { domainType: 'LENS', label: 'Photography' },
];

const OWNER_DISCREET_LABELS: Partial<Record<DomainType, string>> = {
  METIME: 'MT',
  USTIME: 'UT',
  SHOT: 'S1',
  LENS: 'L1',
  NEST: 'N1',
  ROOTS: 'R1',
};

export const CONNECTION_SUPPORT_OPTIONS = [
  'Low-energy day: make warmth easier and ask less of them.',
  'Body-care day: comfort, tea, heat, chores, no pressure.',
  'No-mood day: affection stays available without an agenda.',
  'Pain day: reduce load first, then offer closeness if it helps.',
];

export function getDiscreetDomainLabel(domain: DomainConfig, email?: string | null): string {
  if (!isOwnerAccount(email)) return domain.label;
  return OWNER_DISCREET_LABELS[domain.type] ?? domain.label;
}

export function getEarlyWakeProtocol(now = new Date()): EarlyWakeProtocol | null {
  const hour = now.getHours();
  if (hour < 4 || hour >= 7) return null;

  return {
    title: 'Early-wake protocol',
    body: 'Do the floor, then decide whether the day starts now or you recover more sleep.',
    steps: [
      'Water first.',
      'No scrolling for the first ten minutes.',
      'Pick one tiny body or fuel action.',
      'If you are still tired, return to bed without guilt.',
    ],
  };
}

function statusPriority(status?: CheckInStatus): number {
  if (status === 'Missed') return 0;
  if (status === 'Pending' || !status) return 1;
  if (status === 'Partial') return 2;
  return 3;
}

export function buildCatchUpPath(
  domains: DomainConfig[],
  todayCheckIns: Partial<Record<DomainType, DailyCheckIn>>,
): CatchUpPath | null {
  const target = [...domains].sort(
    (a, b) =>
      statusPriority(todayCheckIns[a.type]?.status) - statusPriority(todayCheckIns[b.type]?.status),
  )[0];
  const status = target ? todayCheckIns[target.type]?.status : undefined;
  if (!target || (status !== 'Missed' && status !== 'Pending' && status !== undefined)) return null;

  return {
    title: status === 'Missed' ? 'Catch-up path' : 'Close the loop',
    body:
      status === 'Missed'
        ? 'The day is not failed. Salvage one useful version and mark the honest result.'
        : 'One small check-in is enough to stop the drift.',
    domainType: target.type,
    domainLabel: target.label,
    steps: [
      target.prepOptions[0],
      `Do the smallest useful version of ${target.focusOptions[0].toLowerCase()}.`,
      'Mark Partial if that is the honest score.',
    ],
  };
}

export function buildAccountabilityPrompt(ignoredCount: number): AccountabilityPrompt {
  if (ignoredCount >= 2) {
    return {
      level: 3,
      title: 'Accountability check',
      body: 'Stop negotiating. Report one honest status and choose the next visible action.',
      steps: [
        'Name what slipped.',
        'Mark Done, Partial, or Missed.',
        'Set the next 10-minute action.',
      ],
    };
  }

  if (ignoredCount === 1) {
    return {
      level: 2,
      title: 'Second prompt',
      body: 'You ignored the first cue. Shrink the task and close one loop now.',
      steps: ['Open Today.', 'Pick one domain.', 'Do two minutes or log the truth.'],
    };
  }

  return {
    level: 1,
    title: 'First prompt',
    body: 'Choose the next action before the day chooses for you.',
    steps: ['Open the app.', 'Pick the easiest domain.', 'Make the first mark.'],
  };
}

function last7Dates(today = new Date()): string[] {
  const dates: string[] = [];
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(start.getDate() - i);
    dates.push(toLocalIsoDate(d));
  }
  return dates;
}

export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function scoreStatus(status?: CheckInStatus): number {
  if (status === 'Done') return 1;
  if (status === 'Partial' || status === 'Protected') return 0.5;
  return 0;
}

export function buildWeeklyFlywheel({
  email,
  checkInHistory,
  todayCheckIns,
  today = new Date(),
}: {
  email?: string | null;
  checkInHistory: Record<string, Partial<Record<DomainType, CheckInStatus>>>;
  todayCheckIns: Partial<Record<DomainType, DailyCheckIn>>;
  today?: Date;
}): FlywheelSummary {
  const availableDomains = getAvailableDomains(email);
  const domainMap = new Map(availableDomains.map((domain) => [domain.type, domain]));
  const rows = isOwnerAccount(email)
    ? OWNER_FLYWHEEL.filter((item) => domainMap.has(item.domainType))
    : availableDomains.map((domain) => ({ domainType: domain.type, label: domain.label }));
  const dates = last7Dates(today);
  const todayIso = toLocalIsoDate(today);

  return {
    title: isOwnerAccount(email) ? 'Six-part flywheel' : 'Core flywheel',
    entries: rows.map((row) => {
      let done = 0;
      let partial = 0;
      let missed = 0;
      let score = 0;

      for (const date of dates) {
        const status =
          date === todayIso
            ? (todayCheckIns[row.domainType]?.status ?? checkInHistory[date]?.[row.domainType])
            : checkInHistory[date]?.[row.domainType];
        if (status === 'Done') done += 1;
        if (status === 'Partial' || status === 'Protected') partial += 1;
        if (status === 'Missed') missed += 1;
        score += scoreStatus(status);
      }

      const pct = Math.round((score / dates.length) * 100);
      const state = pct >= 70 ? 'steady' : pct >= 40 ? 'thin' : 'needs_attention';

      return {
        domainType: row.domainType,
        label: row.label,
        done,
        partial,
        missed,
        total: dates.length,
        score: pct,
        state,
      };
    }),
  };
}
