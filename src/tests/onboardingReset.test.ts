import { readFileSync } from 'node:fs';
import type { KairosCycle, Profile, UserDomainFocus } from '@/types';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const profile: Profile = {
  id: 'user-1',
  displayName: 'Liam',
  identityAnchorId: 'provider',
  tier: 'brotherhood',
  xp: 120,
  currentKairosCycleId: 'cycle-1',
  dateOfBirth: '1984-01-01',
  squadId: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  subscriptionStatus: 'active',
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};

const cycle: KairosCycle = {
  id: 'cycle-1',
  userId: 'user-1',
  startDate: '2026-08-01',
  endDate: null,
  status: 'active',
  totalXpEarned: 80,
  completionPercentage: 0,
  createdAt: '2026-08-01T00:00:00Z',
};

const focus: UserDomainFocus = {
  id: 'focus-1',
  userId: 'user-1',
  cycleId: 'cycle-1',
  domainType: 'BODY',
  focusDescription: 'Walk for 20 minutes',
  setAt: '2026-08-01T00:00:00Z',
};

describe('onboarding and reset contract', () => {
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

  it('keeps onboarding to three primary screens', () => {
    const source = readFileSync('src/pages/onboarding/OnboardingFlow.tsx', 'utf8');

    expect(source).toContain("type Step = 'identity' | 'focus' | 'commit';");
    expect(source).toContain("const ONBOARDING_STEPS: Step[] = ['identity', 'focus', 'commit'];");
    expect(source).toContain('{stepNumber} of 3');
    expect(source).not.toContain("'notifications'");
  });

  it('archives the active journey before cycle reset clears current state', async () => {
    const { useAppStore } = await import('@/store/useAppStore');

    useAppStore.getState().reset();
    useAppStore.setState({
      profile,
      currentCycle: cycle,
      domainFocuses: [focus],
      checkInHistory: { '2026-08-04': { BODY: 'Done' } },
      todayCheckIns: {},
      todayCustomRouteCheckIns: {},
      customRoutes: [],
      journeyArchive: [],
      onboardingComplete: true,
    });

    useAppStore.getState().archiveCurrentJourney('abandoned');
    useAppStore.getState().resetCycleLocalState();
    useAppStore.getState().setCurrentCycle(null);
    useAppStore.getState().setOnboardingComplete(false);

    const state = useAppStore.getState();
    expect(state.currentCycle).toBeNull();
    expect(state.onboardingComplete).toBe(false);
    expect(state.domainFocuses).toEqual([]);
    expect(state.checkInHistory).toEqual({});
    expect(state.journeyArchive).toHaveLength(1);
    expect(state.journeyArchive[0]).toMatchObject({
      reason: 'abandoned',
      cycleId: 'cycle-1',
      xp: 80,
      domainFocuses: [{ domainType: 'BODY', focusDescription: 'Walk for 20 minutes' }],
    });
  });
});
