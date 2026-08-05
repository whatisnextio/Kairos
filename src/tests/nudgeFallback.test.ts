import { buildLocalFallbackNudge } from '@/utils/nudgeFallback';
import { describe, expect, it } from 'vitest';

describe('local nudge fallback', () => {
  it('builds a grounded Improve card from local app state', () => {
    const nudge = buildLocalFallbackNudge({
      now: new Date('2026-08-05T09:00:00.000Z'),
      email: 'liam@example.com',
      profile: {
        id: 'user-1',
        displayName: 'Liam',
        identityAnchorId: 'builder',
        tier: 'free',
        xp: 0,
        currentKairosCycleId: 'cycle-1',
        dateOfBirth: '1984-01-01',
        squadId: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
      currentCycle: {
        id: 'cycle-1',
        userId: 'user-1',
        startDate: '2026-08-01',
        endDate: null,
        status: 'active',
        totalXpEarned: 0,
        completionPercentage: 0,
        createdAt: '2026-08-01T00:00:00.000Z',
      },
      domainFocuses: [
        {
          id: 'focus-1',
          userId: 'user-1',
          cycleId: 'cycle-1',
          domainType: 'FUEL',
          focusDescription: 'Drink water before caffeine',
          setAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      customRoutes: [],
      todayCheckIns: {},
    });

    expect(nudge.id).toBe('local-fallback-nudge:user-1:2026-08-05');
    expect(nudge.title).toBe('Day 5. Close one loop.');
    expect(nudge.body).toContain('Kickoff');
    expect(nudge.body).toContain('Fuel');
    expect(nudge.body).toContain('Drink water before caffeine');
    expect(nudge.domainType).toBe('FUEL');
    expect(nudge.cta).toBe('check_in_now');
    expect(nudge.status).toBe('new');
  });
});
