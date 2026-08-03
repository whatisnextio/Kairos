import { describe, expect, it } from 'vitest';
import {
  isMilestone,
  milestoneMessage,
  morningBrief,
  reminderMessage,
  streakBrokenMessage,
  trendingDownMessage,
} from '../notifications.js';

describe('morningBrief', () => {
  it('states yesterday score and streak', () => {
    expect(morningBrief(47, 12)).toBe('Yesterday: 47. Streak: 12 days. Floor holds today.');
  });
  it('handles a missing yesterday score', () => {
    expect(morningBrief(null, 0)).toBe('Yesterday: not logged. Streak: 0 days. Floor holds today.');
  });
});

describe('reminderMessage', () => {
  it('always returns the morning brief', () => {
    expect(reminderMessage('morning', { yesterdayScore: 30, streak: 2 })).toContain('30');
  });

  it('returns earlybird message', () => {
    expect(reminderMessage('earlybird', {})).toBe('5am. Water. Supplements. Move. Back to bed after.');
  });

  it('always nags at midday regardless of logged state', () => {
    expect(reminderMessage('midday', { loggedToday: false })).toBe('Midday check. Floor holding? Log it.');
    expect(reminderMessage('midday', { loggedToday: true })).toBe('Midday check. Floor holding? Log it.');
  });

  it('always nags in the evening regardless of alcohol state', () => {
    expect(reminderMessage('evening', { alcoholConfirmedToday: false })).toBe(
      'Evening floor. Affection. Lockbox at 9. Log the day.',
    );
    expect(reminderMessage('evening', { alcoholConfirmedToday: true })).toBe(
      'Evening floor. Affection. Lockbox at 9. Log the day.',
    );
  });

  it('returns afternoon message', () => {
    expect(reminderMessage('afternoon', {})).toBe('Three hours left. What still needs doing today?');
  });
});

describe('milestones', () => {
  it('recognises milestone streaks', () => {
    expect(isMilestone(7)).toBe(true);
    expect(isMilestone(30)).toBe(true);
    expect(isMilestone(8)).toBe(false);
  });
  it('recognises extended milestones', () => {
    expect(isMilestone(21)).toBe(true);
    expect(isMilestone(90)).toBe(true);
    expect(isMilestone(180)).toBe(true);
    expect(isMilestone(365)).toBe(true);
  });
  it('builds milestone copy', () => {
    expect(milestoneMessage(14)).toBe('14 days straight. The campaign is real.');
  });
});

describe('event copy', () => {
  it('builds the streak-broken message', () => {
    expect(streakBrokenMessage(22)).toBe('Bad day. Score: 22. Campaign intact. Back to zero tomorrow.');
  });
  it('builds the trending-down message', () => {
    expect(trendingDownMessage()).toBe(
      "Three days slipping. This is where it turns around or doesn't.",
    );
  });
});
