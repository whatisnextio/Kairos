import type { CustomRoute, KairosCycle, Profile } from '@/types';
import { buildFrameworkRecommendations } from '@/utils/frameworkRecommendations';
import { DEV_CYCLE_ID } from '@/utils/localDevSession';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const baseProfile: Profile = {
  id: 'user-1',
  displayName: 'Test User',
  identityAnchorId: 'builder',
  tier: 'brotherhood',
  xp: 0,
  currentKairosCycleId: DEV_CYCLE_ID,
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

const cycle: KairosCycle = {
  id: DEV_CYCLE_ID,
  userId: 'user-1',
  startDate: '2026-08-04',
  endDate: null,
  status: 'active',
  totalXpEarned: 0,
  completionPercentage: 0,
  createdAt: '2026-08-04T00:00:00Z',
};

function route(overrides: Partial<CustomRoute> = {}): CustomRoute {
  return {
    id: 'route-1',
    userId: 'user-1',
    cycleId: DEV_CYCLE_ID,
    parentDomainType: 'METIME',
    label: 'Lens',
    description: '',
    focusDescription: 'Edit one keeper',
    createdAt: '2026-08-04T00:00:00Z',
    updatedAt: '2026-08-04T00:00:00Z',
    archivedAt: null,
    ...overrides,
  };
}

describe('custom routes', () => {
  beforeAll(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
      configurable: true,
    });
  });

  it('blocks free users from adding personal routes', async () => {
    const { useAppStore } = await import('@/store/useAppStore');

    useAppStore.getState().reset();
    useAppStore.setState({
      profile: { ...baseProfile, tier: 'free' },
      currentCycle: cycle,
      customRoutes: [],
    });

    const result = await useAppStore.getState().addCustomRoute({
      parentDomainType: 'METIME',
      label: 'Lens',
      focusDescription: 'Edit one keeper',
    });

    expect(result).toEqual({ ok: false, reason: 'upgrade' });
    expect(useAppStore.getState().customRoutes).toEqual([]);
  });

  it('tracks paid custom route check-ins in route history', async () => {
    const { useAppStore } = await import('@/store/useAppStore');

    useAppStore.getState().reset();
    useAppStore.setState({
      profile: baseProfile,
      currentCycle: cycle,
      customRoutes: [route()],
      todayCustomRouteCheckIns: {},
      customRouteCheckInHistory: {},
    });

    await useAppStore.getState().setCustomRouteCheckIn('route-1', 'Done');

    const state = useAppStore.getState();
    expect(state.todayCustomRouteCheckIns['route-1']?.status).toBe('Done');
    expect(Object.values(state.customRouteCheckInHistory)[0]?.['route-1']).toBe('Done');
    expect(state.profile?.xp).toBe(10);
  });

  it('keeps archived routes out of recommendations while active routes can be targeted', () => {
    const recommendations = buildFrameworkRecommendations({
      email: 'paid@example.com',
      domainFocuses: [],
      todayCheckIns: {
        BODY: {
          id: 'body',
          userId: 'user-1',
          cycleId: DEV_CYCLE_ID,
          date: '2026-08-04',
          domainType: 'BODY',
          status: 'Done',
          notes: null,
          xpAwarded: 10,
          createdAt: '2026-08-04T00:00:00Z',
          updatedAt: '2026-08-04T00:00:00Z',
        },
      },
      customRoutes: [
        route(),
        route({ id: 'route-2', label: 'Nest', archivedAt: '2026-08-04T12:00:00Z' }),
      ],
      todayCustomRouteCheckIns: {
        'route-1': {
          id: 'custom-check-in-1',
          userId: 'user-1',
          cycleId: DEV_CYCLE_ID,
          routeId: 'route-1',
          date: '2026-08-04',
          status: 'Missed',
          notes: null,
          xpAwarded: 0,
          createdAt: '2026-08-04T00:00:00Z',
          updatedAt: '2026-08-04T00:00:00Z',
        },
      },
    });

    expect(recommendations[0]).toMatchObject({
      title: 'Prep Lens',
      customRouteId: 'route-1',
      domainType: 'METIME',
    });
    expect(recommendations.map((item) => item.customRouteId)).not.toContain('route-2');
  });
});
