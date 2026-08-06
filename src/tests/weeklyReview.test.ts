import { readFileSync } from 'node:fs';
import type { CheckInStatus, CustomRoute, DailyCheckIn, DomainType } from '@/types';
import { getCurrentPhaseConfig } from '@/utils/kairos';
import { buildWeeklyReview, toLocalIsoDate } from '@/utils/v1Framework';
import { describe, expect, it } from 'vitest';

const TODAY = new Date('2026-08-05T12:00:00');

function last7Dates(today = TODAY): string[] {
  const dates: string[] = [];
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const date = new Date(start);
    date.setDate(start.getDate() - i);
    dates.push(toLocalIsoDate(date));
  }
  return dates;
}

function checkIn(domainType: DomainType, status: CheckInStatus): DailyCheckIn {
  return {
    id: `${domainType}-${status}`,
    userId: 'user-1',
    cycleId: 'cycle-1',
    date: toLocalIsoDate(TODAY),
    domainType,
    status,
    notes: null,
    xpAwarded: status === 'Done' ? 25 : status === 'Partial' ? 10 : 0,
    createdAt: '2026-08-05T00:00:00Z',
    updatedAt: '2026-08-05T00:00:00Z',
  };
}

function history(
  statuses: Partial<Record<DomainType, CheckInStatus[]>>,
): Record<string, Partial<Record<DomainType, CheckInStatus>>> {
  const dates = last7Dates();
  return dates.reduce<Record<string, Partial<Record<DomainType, CheckInStatus>>>>(
    (acc, date, index) => {
      acc[date] = {
        BODY: statuses.BODY?.[index] ?? 'Done',
        FUEL: statuses.FUEL?.[index] ?? 'Done',
        METIME: statuses.METIME?.[index] ?? 'Done',
        USTIME: statuses.USTIME?.[index] ?? 'Done',
      };
      return acc;
    },
    {},
  );
}

function route(): CustomRoute {
  return {
    id: 'route-family',
    userId: 'user-1',
    cycleId: 'cycle-1',
    parentDomainType: 'USTIME',
    label: 'Family',
    description: 'Family presence',
    focusDescription: 'One present family action',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    archivedAt: null,
  };
}

describe('weekly mentor review', () => {
  it('recommends recovery when one core category is missed-heavy', () => {
    const review = buildWeeklyReview({
      checkInHistory: history({
        BODY: ['Missed', 'Missed', 'Done', 'Missed', 'Done', 'Missed', 'Done'],
      }),
      todayCheckIns: {},
      phase: getCurrentPhaseConfig(35),
      dayInCycle: 35,
      today: TODAY,
    });

    expect(review.recommendation.state).toBe('recover');
    expect(review.recommendation.targetLabel).toBe('Body');
    expect(review.recommendation.editableText).toContain('Lower Body action size');
  });

  it('recommends protection when the week is partial-heavy', () => {
    const review = buildWeeklyReview({
      checkInHistory: history({
        FUEL: ['Partial', 'Done', 'Partial', 'Done', 'Partial', 'Done', 'Partial'],
      }),
      todayCheckIns: {},
      phase: getCurrentPhaseConfig(21),
      dayInCycle: 21,
      today: TODAY,
    });

    expect(review.recommendation.state).toBe('protect');
    expect(review.recommendation.targetLabel).toBe('Fuel');
    expect(review.recommendation.editableText).toContain('making Part done clear');
  });

  it('uses the current phase to decide whether a strong week should increase or protect', () => {
    const increaseReview = buildWeeklyReview({
      checkInHistory: history({}),
      todayCheckIns: {},
      phase: getCurrentPhaseConfig(35),
      dayInCycle: 35,
      today: TODAY,
    });
    const kickoffReview = buildWeeklyReview({
      checkInHistory: history({}),
      todayCheckIns: {},
      phase: getCurrentPhaseConfig(7),
      dayInCycle: 7,
      today: TODAY,
    });

    expect(increaseReview.recommendation.state).toBe('increase');
    expect(increaseReview.recommendation.reason).toContain('Increase');
    expect(kickoffReview.recommendation.state).toBe('protect');
    expect(kickoffReview.recommendation.reason).toContain('Kickoff');
  });

  it('shows active extra actions under their parent categories', () => {
    const review = buildWeeklyReview({
      checkInHistory: history({}),
      todayCheckIns: { USTIME: checkIn('USTIME', 'Done') },
      customRoutes: [route()],
      customRouteCheckInHistory: Object.fromEntries(
        last7Dates().map((date) => [date, { 'route-family': 'Partial' }]),
      ),
      phase: getCurrentPhaseConfig(35),
      dayInCycle: 35,
      today: TODAY,
    });
    const connection = review.entries.find((entry) => entry.domainType === 'USTIME');

    expect(connection?.routes).toHaveLength(1);
    expect(connection?.routes[0]).toMatchObject({
      label: 'Family',
      parentDomainType: 'USTIME',
      score: 50,
    });
  });

  it('wires Progress to manual launch, automatic weekly prompt, editable save, and focus update', () => {
    const source = readFileSync('src/pages/ProgressScreen.tsx', 'utf8');

    expect(source).toContain('Weekly review due');
    expect(source).toContain('Open weekly review');
    expect(source).toContain("Save next week's action");
    expect(source).toContain("Saving next week's action...");
    expect(source).toContain("Next week's action saved.");
    expect(source).not.toContain('Save next-week focus');
    expect(source).not.toContain('next-week focus');
    expect(source).toContain('updateDomainFocus(weeklyReview.recommendation.targetDomainType');
    expect(source).toContain('dayInCycle % 7 === 0');
  });
});
