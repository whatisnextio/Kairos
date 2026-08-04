import type { KairosCycle, Profile } from '@/types';
import { DEV_CYCLE_ID } from '@/utils/localDevSession';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const profile: Profile = {
  id: 'user-1',
  displayName: 'Test User',
  identityAnchorId: 'builder',
  tier: 'brotherhood',
  xp: 20,
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

describe('Improve challenge lifecycle', () => {
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

  it('keeps accepted challenges active and awards completion XP once', async () => {
    const { useAppStore } = await import('@/store/useAppStore');

    useAppStore.getState().reset();
    useAppStore.setState({ profile, currentCycle: cycle });

    await useAppStore.getState().setImproveCardStatus('card-1', 'accepted', 15);
    expect(useAppStore.getState().improveCardStatuses['card-1']).toBe('accepted');
    expect(useAppStore.getState().profile?.xp).toBe(20);

    await useAppStore.getState().setImproveCardStatus('card-1', 'completed', 15);
    await useAppStore.getState().setImproveCardStatus('card-1', 'completed', 15);

    expect(useAppStore.getState().improveCardStatuses['card-1']).toBe('completed');
    expect(useAppStore.getState().rewardedImproveCards['card-1']).toBe(true);
    expect(useAppStore.getState().profile?.xp).toBe(35);
  });

  it('clears challenge lifecycle when a new journey starts', async () => {
    const { useAppStore } = await import('@/store/useAppStore');

    useAppStore.getState().reset();
    useAppStore.setState({
      profile,
      currentCycle: cycle,
      improveCardStatuses: { 'card-1': 'accepted' },
      improveCardSnapshots: {
        'card-1': {
          id: 'card-1',
          lens: 'Prep',
          title: 'Prep Self',
          body: 'Choose the place',
          domainLabel: 'Self',
          phaseLabel: 'Kickoff',
          actionText: 'Take a 10-minute reset',
          xpReward: 15,
          cta: 'check_in_now',
          domainType: 'METIME',
        },
      },
      rewardedImproveCards: { 'card-2': true },
    });

    useAppStore.getState().resetCycleLocalState();

    expect(useAppStore.getState().improveCardStatuses).toEqual({});
    expect(useAppStore.getState().improveCardSnapshots).toEqual({});
    expect(useAppStore.getState().rewardedImproveCards).toEqual({});
  });
});
