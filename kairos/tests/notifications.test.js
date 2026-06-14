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
    expect(morningBrief(47, 12)).toBe('Kairos Score yesterday: 47. Streak: 12 days. Make today count.');
  });
  it('handles a missing yesterday score', () => {
    expect(morningBrief(null, 0)).toBe(
      'Kairos Score yesterday: not logged. Streak: 0 days. Make today count.',
    );
  });
});

describe('reminderMessage', () => {
  it('always returns the morning brief', () => {
    expect(reminderMessage('morning', { yesterdayScore: 30, streak: 2 })).toContain('30');
  });

  it('nags at midday only when nothing is logged', () => {
    expect(reminderMessage('midday', { loggedToday: false })).toBe(
      'Nothing logged yet. You know what to do.',
    );
    expect(reminderMessage('midday', { loggedToday: true })).toBeNull();
  });

  it('nags in the evening only when alcohol is unconfirmed', () => {
    expect(reminderMessage('evening', { alcoholConfirmedToday: false })).toBe(
      'One tap. Did you stay clean today?',
    );
    expect(reminderMessage('evening', { alcoholConfirmedToday: true })).toBeNull();
  });
});

describe('milestones', () => {
  it('recognises milestone streaks', () => {
    expect(isMilestone(7)).toBe(true);
    expect(isMilestone(30)).toBe(true);
    expect(isMilestone(8)).toBe(false);
  });
  it('builds milestone copy', () => {
    expect(milestoneMessage(14)).toBe("14 days. Don't stop now.");
  });
});

describe('event copy', () => {
  it('builds the streak-broken message', () => {
    expect(streakBrokenMessage(22)).toBe('Streak reset. Score: 22. Start again today. No drama.');
  });
  it('builds the trending-down message', () => {
    expect(trendingDownMessage()).toBe(
      "Three days dropping. This is where it turns around or doesn't.",
    );
  });
});
