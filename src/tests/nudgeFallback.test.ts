import type { KairosCycle, Profile } from '@/types';
import { buildLocalFallbackNudge } from '@/utils/nudgeFallback';
import { describe, expect, it } from 'vitest';

describe('local nudge fallback', () => {
  const profile: Profile = {
    id: 'user-1',
    displayName: 'Liam',
    identityAnchorId: 'builder',
    tier: 'free' as const,
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
  };

  const currentCycle: KairosCycle = {
    id: 'cycle-1',
    userId: 'user-1',
    startDate: '2026-08-01',
    endDate: null,
    status: 'active' as const,
    totalXpEarned: 0,
    completionPercentage: 0,
    createdAt: '2026-08-01T00:00:00.000Z',
  };

  it('builds a grounded Improve card from local app state', () => {
    const nudge = buildLocalFallbackNudge({
      now: new Date('2026-08-05T09:00:00.000Z'),
      email: 'liam@example.com',
      profile,
      currentCycle,
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

    expect(nudge.id).toBe('local-fallback-nudge:user-1:cycle-1:2026-08-05');
    expect(nudge.cycleId).toBe('cycle-1');
    expect(nudge.title).toBe('Day 5. Close one loop.');
    expect(nudge.body).toContain('Kickoff');
    expect(nudge.body).toContain('Fuel');
    expect(nudge.body).toContain('Drink water before caffeine');
    expect(nudge.domainType).toBe('FUEL');
    expect(nudge.cta).toBe('check_in_now');
    expect(nudge.status).toBe('new');
  });

  it('does not echo adult-only user text in local fallback nudges', () => {
    const nudge = buildLocalFallbackNudge({
      now: new Date('2026-08-05T09:00:00.000Z'),
      email: 'liam@example.com',
      profile,
      currentCycle,
      domainFocuses: [],
      customRoutes: [
        {
          id: 'route-1',
          userId: 'user-1',
          cycleId: 'cycle-1',
          parentDomainType: 'USTIME',
          label: 'Sexual route',
          description: 'Private',
          focusDescription: 'Intimacy plan',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
          archivedAt: null,
        },
      ],
      todayCheckIns: {},
    });

    expect(nudge.body).toContain('Personal route');
    expect(nudge.body).toContain('Pick one useful action');
    expect(nudge.body).not.toMatch(/sex|sexual|intimacy|intimate/i);
  });
});
