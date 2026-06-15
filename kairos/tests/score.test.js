import { describe, expect, it } from 'vitest';
import {
  ALCOHOL_FREE_POINTS,
  STREAK_THRESHOLD,
  alcoholFreeStreak,
  clamp,
  computeScore,
  computeStreak,
  daysBetween,
  incomingStreakFor,
  isTrendingDown,
  personalBests,
  recentTrend,
  streakBonus,
} from '../score.js';

// Build a contiguous run of daily entries ending on `lastDate`, oldest first.
function days(lastDate, scores, dry = []) {
  const [y, m, d] = lastDate.split('-').map(Number);
  const end = Date.UTC(y, m - 1, d);
  return scores.map((score, i) => {
    const ts = end - (scores.length - 1 - i) * 86_400_000;
    const date = new Date(ts).toISOString().slice(0, 10);
    return { date, score, alcoholFree: dry[i] ?? false };
  });
}

describe('clamp', () => {
  it('bounds within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('streakBonus', () => {
  it('is one point per day up to the cap', () => {
    expect(streakBonus(0)).toBe(0);
    expect(streakBonus(4)).toBe(4);
    expect(streakBonus(10)).toBe(10);
  });
  it('caps at 10', () => {
    expect(streakBonus(25)).toBe(10);
  });
  it('never goes negative', () => {
    expect(streakBonus(-3)).toBe(0);
  });
});

describe('computeScore', () => {
  it('is 0 with nothing going right', () => {
    expect(computeScore({ training: 0, recovery: 0, alcoholFree: false, incomingStreak: 0 })).toBe(0);
  });

  it('maxes at 100 with a perfect day on a long streak', () => {
    expect(
      computeScore({ training: 100, recovery: 100, alcoholFree: true, incomingStreak: 10 }),
    ).toBe(100);
  });

  it('weights training at 40%', () => {
    expect(computeScore({ training: 50, recovery: 0, alcoholFree: false, incomingStreak: 0 })).toBe(
      20,
    );
  });

  it('weights recovery at 30%', () => {
    expect(computeScore({ training: 0, recovery: 50, alcoholFree: false, incomingStreak: 0 })).toBe(
      15,
    );
  });

  it('lets a wrecked recovery day drag the score down even with hard training', () => {
    // Heavy training (90 -> 36) but no recovery, no alcohol bonus, no streak.
    expect(computeScore({ training: 90, recovery: 0, alcoholFree: false, incomingStreak: 0 })).toBe(
      36,
    );
  });

  it('adds 20 for an alcohol-free day', () => {
    expect(computeScore({ training: 0, recovery: 0, alcoholFree: true, incomingStreak: 0 })).toBe(
      ALCOHOL_FREE_POINTS,
    );
  });

  it('adds the streak bonus on top', () => {
    // training 40 -> 16, recovery 40 -> 12, +20 dry, +7 streak = 55
    expect(computeScore({ training: 40, recovery: 40, alcoholFree: true, incomingStreak: 7 })).toBe(
      55,
    );
  });

  it('clamps wild inputs', () => {
    expect(
      computeScore({ training: 9000, recovery: 9000, alcoholFree: false, incomingStreak: 0 }),
    ).toBe(70);
  });

  it('treats a missing streak as zero', () => {
    expect(computeScore({ training: 100, recovery: 100, alcoholFree: false })).toBe(70);
  });
});

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween('2026-06-14', '2026-06-07')).toBe(7);
    expect(daysBetween('2026-06-07', '2026-06-14')).toBe(-7);
    expect(daysBetween('2026-06-14', '2026-06-14')).toBe(0);
  });
  it('crosses month boundaries', () => {
    expect(daysBetween('2026-07-01', '2026-06-30')).toBe(1);
  });
});

describe('computeStreak', () => {
  it('is 0 with no entries', () => {
    expect(computeStreak([])).toBe(0);
  });

  it('counts trailing days at or above the threshold', () => {
    const entries = days('2026-06-14', [70, 80, 65, 90]);
    expect(computeStreak(entries)).toBe(4);
  });

  it('stops at the first day below the threshold', () => {
    const entries = days('2026-06-14', [70, 40, 65, 90]);
    expect(computeStreak(entries)).toBe(2);
  });

  it('is 0 when the most recent day is below the threshold', () => {
    const entries = days('2026-06-14', [90, 90, 59]);
    expect(computeStreak(entries)).toBe(0);
  });

  it('treats exactly the threshold as a hit', () => {
    const entries = days('2026-06-14', [STREAK_THRESHOLD]);
    expect(computeStreak(entries)).toBe(1);
  });

  it('breaks on a missed calendar day', () => {
    const entries = [
      { date: '2026-06-10', score: 90 },
      { date: '2026-06-11', score: 90 },
      // 12th missing entirely
      { date: '2026-06-13', score: 90 },
      { date: '2026-06-14', score: 90 },
    ];
    expect(computeStreak(entries)).toBe(2);
  });

  it('ignores entry order', () => {
    const entries = days('2026-06-14', [70, 80, 65, 90]).reverse();
    expect(computeStreak(entries)).toBe(4);
  });
});

describe('incomingStreakFor', () => {
  it('uses only days before the given date', () => {
    const entries = days('2026-06-14', [70, 80, 65, 30]); // last day (14th) is 30
    // Incoming streak for the 14th ignores the 14th and counts the three before.
    expect(incomingStreakFor(entries, '2026-06-14')).toBe(3);
  });

  it('is 0 when nothing precedes the date', () => {
    const entries = days('2026-06-14', [90]);
    expect(incomingStreakFor(entries, '2026-06-14')).toBe(0);
  });
});

describe('alcoholFreeStreak', () => {
  it('counts trailing dry days', () => {
    const entries = days('2026-06-14', [50, 50, 50, 50], [false, true, true, true]);
    expect(alcoholFreeStreak(entries)).toBe(3);
  });

  it('is 0 if today was not confirmed dry', () => {
    const entries = days('2026-06-14', [50, 50], [true, false]);
    expect(alcoholFreeStreak(entries)).toBe(0);
  });

  it('breaks on a missed day', () => {
    const entries = [
      { date: '2026-06-12', alcoholFree: true, score: 0 },
      { date: '2026-06-14', alcoholFree: true, score: 0 },
    ];
    expect(alcoholFreeStreak(entries)).toBe(1);
  });
});

describe('personalBests', () => {
  it('returns zeros for empty history', () => {
    expect(personalBests([])).toEqual({
      bestScore: 0,
      longestStreak: 0,
      longestAlcoholFree: 0,
    });
  });

  it('finds the highest score and longest runs, including past ones', () => {
    // A 3 day streak early, broken, then a 2 day streak now. Best score 88.
    const entries = days(
      '2026-06-14',
      [70, 75, 88, 20, 65, 65],
      [true, true, false, false, true, true],
    );
    const pb = personalBests(entries);
    expect(pb.bestScore).toBe(88);
    expect(pb.longestStreak).toBe(3);
    expect(pb.longestAlcoholFree).toBe(2);
  });
});

describe('recentTrend', () => {
  it('returns the last N scores oldest-first', () => {
    const entries = days('2026-06-14', [10, 20, 30, 40, 50, 60, 70, 80]);
    const trend = recentTrend(entries, 7);
    expect(trend).toHaveLength(7);
    expect(trend.map((t) => t.score)).toEqual([20, 30, 40, 50, 60, 70, 80]);
  });

  it('returns everything when fewer than N entries exist', () => {
    const entries = days('2026-06-14', [40, 50]);
    expect(recentTrend(entries, 7)).toHaveLength(2);
  });
});

describe('isTrendingDown', () => {
  it('is true for three strictly falling days', () => {
    const entries = days('2026-06-14', [80, 70, 60]);
    expect(isTrendingDown(entries, 3)).toBe(true);
  });

  it('is false if a day held or rose', () => {
    const entries = days('2026-06-14', [80, 70, 70]);
    expect(isTrendingDown(entries, 3)).toBe(false);
  });

  it('is false without enough history', () => {
    const entries = days('2026-06-14', [80, 70]);
    expect(isTrendingDown(entries, 3)).toBe(false);
  });
});
