import type { CheckInStatus, DomainType } from '@/types';
import { computeLocalStreak } from '@/utils/streak';
import { describe, expect, it } from 'vitest';

type History = Record<string, Partial<Record<DomainType, CheckInStatus>>>;

function dayBefore(isoDate: string, n = 1): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split('T')[0];
}

const TODAY = '2024-06-15';
const DOMAIN: DomainType = 'BODY';

describe('computeLocalStreak', () => {
  it('returns zeros for empty history', () => {
    expect(computeLocalStreak({}, DOMAIN, TODAY)).toEqual({ currentStreak: 0, longestStreak: 0 });
  });

  it('returns 1 when only today is Done', () => {
    const history: History = { [TODAY]: { BODY: 'Done' } };
    expect(computeLocalStreak(history, DOMAIN, TODAY)).toEqual({
      currentStreak: 1,
      longestStreak: 1,
    });
  });

  it('returns 1 when only today is Partial', () => {
    const history: History = { [TODAY]: { BODY: 'Partial' } };
    expect(computeLocalStreak(history, DOMAIN, TODAY)).toEqual({
      currentStreak: 1,
      longestStreak: 1,
    });
  });

  it('returns 0 current streak when today is Missed', () => {
    const history: History = {
      [TODAY]: { BODY: 'Missed' },
      [dayBefore(TODAY, 1)]: { BODY: 'Done' },
      [dayBefore(TODAY, 2)]: { BODY: 'Done' },
    };
    const result = computeLocalStreak(history, DOMAIN, TODAY);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(2);
  });

  it('counts consecutive Done days correctly', () => {
    const history: History = {
      [TODAY]: { BODY: 'Done' },
      [dayBefore(TODAY, 1)]: { BODY: 'Done' },
      [dayBefore(TODAY, 2)]: { BODY: 'Done' },
    };
    expect(computeLocalStreak(history, DOMAIN, TODAY)).toEqual({
      currentStreak: 3,
      longestStreak: 3,
    });
  });

  it('stops currentStreak at a gap', () => {
    const history: History = {
      [TODAY]: { BODY: 'Done' },
      [dayBefore(TODAY, 1)]: { BODY: 'Done' },
      // day -2 is missing (gap)
      [dayBefore(TODAY, 3)]: { BODY: 'Done' },
      [dayBefore(TODAY, 4)]: { BODY: 'Done' },
      [dayBefore(TODAY, 5)]: { BODY: 'Done' },
    };
    const result = computeLocalStreak(history, DOMAIN, TODAY);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(3);
  });

  it('finds longest streak in history even when not current', () => {
    const history: History = {
      [TODAY]: { BODY: 'Done' },
      // gap at day -1
      [dayBefore(TODAY, 2)]: { BODY: 'Done' },
      [dayBefore(TODAY, 3)]: { BODY: 'Done' },
      [dayBefore(TODAY, 4)]: { BODY: 'Done' },
      [dayBefore(TODAY, 5)]: { BODY: 'Done' },
    };
    const result = computeLocalStreak(history, DOMAIN, TODAY);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(4);
  });

  it('treats Partial as qualifying for streak', () => {
    const history: History = {
      [TODAY]: { BODY: 'Partial' },
      [dayBefore(TODAY, 1)]: { BODY: 'Done' },
      [dayBefore(TODAY, 2)]: { BODY: 'Partial' },
    };
    expect(computeLocalStreak(history, DOMAIN, TODAY)).toEqual({
      currentStreak: 3,
      longestStreak: 3,
    });
  });

  it('ignores Missed days (does not count them in streak)', () => {
    const history: History = {
      [TODAY]: { BODY: 'Done' },
      [dayBefore(TODAY, 1)]: { BODY: 'Missed' },
      [dayBefore(TODAY, 2)]: { BODY: 'Done' },
    };
    const result = computeLocalStreak(history, DOMAIN, TODAY);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });

  it('does not bleed across domains', () => {
    const history: History = {
      [TODAY]: { LOVE: 'Done' }, // BODY is absent
    };
    expect(computeLocalStreak(history, 'BODY', TODAY)).toEqual({
      currentStreak: 0,
      longestStreak: 0,
    });
    expect(computeLocalStreak(history, 'LOVE', TODAY)).toEqual({
      currentStreak: 1,
      longestStreak: 1,
    });
  });

  it('returns 0 longest when all days are empty', () => {
    const history: History = {
      [TODAY]: { LOVE: 'Done' }, // BODY absent
      [dayBefore(TODAY, 1)]: { LOVE: 'Done' },
    };
    expect(computeLocalStreak(history, 'BODY', TODAY)).toEqual({
      currentStreak: 0,
      longestStreak: 0,
    });
  });

  it('handles a 7-day streak with Partial mix', () => {
    const history: History = {};
    for (let i = 0; i < 7; i++) {
      const d = dayBefore(TODAY, i);
      history[d] = { BODY: i % 2 === 0 ? 'Done' : 'Partial' };
    }
    expect(computeLocalStreak(history, DOMAIN, TODAY)).toEqual({
      currentStreak: 7,
      longestStreak: 7,
    });
  });

  it('detects multiple separate streaks and returns the max as longest', () => {
    // Streak A: days 10-15 (6 days), streak B: days 0-2 (3 days)
    const history: History = {};
    for (let i = 0; i <= 2; i++) history[dayBefore(TODAY, i)] = { BODY: 'Done' };
    // gap at day 3
    for (let i = 4; i <= 9; i++) history[dayBefore(TODAY, i)] = { BODY: 'Done' };
    const result = computeLocalStreak(history, DOMAIN, TODAY);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(6);
  });

  it('cross-cycle pollution: resets to 0 when today is missing', () => {
    // Simulates a new cycle starting - checkInHistory was cleared by resetCycleLocalState
    // so today has no entry. Previous cycle entries should not count.
    const history: History = {};
    // Only yesterday from previous cycle
    history[dayBefore(TODAY, 1)] = { BODY: 'Done' };
    history[dayBefore(TODAY, 2)] = { BODY: 'Done' };
    // Today is missing (no check-in yet in new cycle)
    const result = computeLocalStreak(history, DOMAIN, TODAY);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(2);
  });
});
