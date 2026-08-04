import type { Profile } from '@/types';
import {
  deriveEarnedBadges,
  formatKairosPoints,
  getLevelForXp,
  getXpProgressInLevel,
} from '@/utils/gamification';
import { describe, expect, it } from 'vitest';

const paidProfile: Profile = {
  id: 'user-1',
  displayName: 'Test User',
  identityAnchorId: 'builder',
  tier: 'brotherhood',
  xp: 0,
  currentKairosCycleId: 'cycle-1',
  dateOfBirth: '1984-01-01',
  squadId: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  subscriptionStatus: 'active',
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  createdAt: '2026-08-04T00:00:00Z',
  updatedAt: '2026-08-04T00:00:00Z',
};

describe('getLevelForXp', () => {
  it('returns level 1 (Starter) for 0 XP', () => {
    const level = getLevelForXp(0);
    expect(level.level).toBe(1);
    expect(level.label).toBe('Starter');
  });

  it('returns level 1 for 199 XP', () => {
    expect(getLevelForXp(199).level).toBe(1);
  });

  it('returns level 2 (Committed) for 200 XP', () => {
    const level = getLevelForXp(200);
    expect(level.level).toBe(2);
    expect(level.label).toBe('Committed');
  });

  it('returns level 3 (Consistent) for 500 XP', () => {
    expect(getLevelForXp(500).level).toBe(3);
  });

  it('returns level 4 (Disciplined) for 1000 XP', () => {
    expect(getLevelForXp(1000).level).toBe(4);
  });

  it('returns level 5 (Builder) for 2000 XP', () => {
    expect(getLevelForXp(2000).level).toBe(5);
  });

  it('returns level 6 (Anchor) for 3500 XP', () => {
    expect(getLevelForXp(3500).level).toBe(6);
  });

  it('returns level 7 (Operator) for 5500 XP', () => {
    expect(getLevelForXp(5500).level).toBe(7);
  });

  it('returns level 8 (Elite) for 8000 XP', () => {
    expect(getLevelForXp(8000).level).toBe(8);
  });

  it('returns level 9 (Forged) for 12000 XP', () => {
    expect(getLevelForXp(12000).level).toBe(9);
  });

  it('returns level 10 (Kairos) for 18000 XP', () => {
    const level = getLevelForXp(18000);
    expect(level.level).toBe(10);
    expect(level.label).toBe('Kairos');
  });

  it('returns level 10 for very high XP', () => {
    expect(getLevelForXp(999999).level).toBe(10);
  });

  it('returns level 1 for negative XP (edge case)', () => {
    expect(getLevelForXp(-1).level).toBe(1);
  });

  it('returns level at exact boundary transitions', () => {
    expect(getLevelForXp(499).level).toBe(2);
    expect(getLevelForXp(500).level).toBe(3);
    expect(getLevelForXp(999).level).toBe(3);
    expect(getLevelForXp(1000).level).toBe(4);
  });
});

describe('getXpProgressInLevel', () => {
  it('returns 0 at the start of a level', () => {
    expect(getXpProgressInLevel(0)).toBe(0);
    expect(getXpProgressInLevel(200)).toBe(0);
    expect(getXpProgressInLevel(500)).toBe(0);
  });

  it('returns 100 at the top of level 10 (Infinity max)', () => {
    expect(getXpProgressInLevel(18000)).toBe(100);
    expect(getXpProgressInLevel(50000)).toBe(100);
  });

  it('returns 50 at the midpoint of level 1 (0-199, mid = 100)', () => {
    expect(getXpProgressInLevel(100)).toBe(50);
  });

  it('returns 50 at the midpoint of level 2 (200-499, mid = 350)', () => {
    expect(getXpProgressInLevel(350)).toBe(50);
  });

  it('returns a value between 0 and 100 for in-progress XP', () => {
    const pct = getXpProgressInLevel(750);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
  });

  it('returns 99 or 100 near level max', () => {
    const pct = getXpProgressInLevel(198);
    expect(pct).toBeGreaterThanOrEqual(99);
  });
});

describe('Kairos Points rewards', () => {
  it('formats public points as KP', () => {
    expect(formatKairosPoints(18_000)).toBe('18,000 KP');
  });

  it('explains how every badge is earned', () => {
    const badges = deriveEarnedBadges({
      profile: paidProfile,
      checkInHistory: {},
      todayCheckIns: {},
      rewardedImproveCards: {},
      streakProtectionHistory: {},
      awardedWeeklyBonuses: {},
      dayInCycle: 1,
    });

    expect(badges.length).toBeGreaterThan(0);
    expect(badges.every((badge) => badge.trigger.trim().length > 0)).toBe(true);
  });
});
