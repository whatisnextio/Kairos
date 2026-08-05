import type { KairosCycle, Profile } from '@/types';
import { XP_PER_CHECK_IN_DONE, XP_PER_WEEK_COMPLETE } from '@/types';
import { DEV_CYCLE_ID } from '@/utils/localDevSession';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const appProfile: Profile = {
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

describe('gamification store contract', () => {
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('awards XP to legacy free profiles in the single app tier', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-04T09:00:00Z'));
    const { useAppStore } = await import('@/store/useAppStore');

    useAppStore.getState().reset();
    useAppStore.setState({ profile: { ...appProfile, tier: 'free' }, currentCycle: cycle });

    await useAppStore.getState().setDailyCheckIn('BODY', 'Done');

    expect(useAppStore.getState().profile?.xp).toBe(XP_PER_CHECK_IN_DONE);
    expect(useAppStore.getState().todayCheckIns.BODY?.xpAwarded).toBe(XP_PER_CHECK_IN_DONE);
  });

  it('awards the Done XP once through status deltaing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-04T09:00:00Z'));
    const { useAppStore } = await import('@/store/useAppStore');

    useAppStore.getState().reset();
    useAppStore.setState({ profile: appProfile, currentCycle: cycle });

    await useAppStore.getState().setDailyCheckIn('BODY', 'Done');
    await useAppStore.getState().setDailyCheckIn('BODY', 'Done');

    expect(useAppStore.getState().profile?.xp).toBe(XP_PER_CHECK_IN_DONE);
  });

  it('protects one missed check-in per 14-day block', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-04T09:00:00Z'));
    const { useAppStore } = await import('@/store/useAppStore');

    useAppStore.getState().reset();
    useAppStore.setState({ profile: appProfile, currentCycle: cycle });

    await useAppStore.getState().setDailyCheckIn('BODY', 'Missed');
    await useAppStore.getState().setDailyCheckIn('BODY', 'Missed');

    expect(useAppStore.getState().todayCheckIns.BODY?.status).toBe('Missed');
    expect(Object.keys(useAppStore.getState().streakProtectionHistory)).toHaveLength(1);
  });

  it('awards the weekly completion bonus once', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T09:00:00Z'));
    const { useAppStore } = await import('@/store/useAppStore');

    const weekHistory = Object.fromEntries(
      ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08'].map(
        (date) => [date, { BODY: 'Done', FUEL: 'Done', METIME: 'Done', USTIME: 'Done' }],
      ),
    );

    useAppStore.getState().reset();
    useAppStore.setState({
      profile: appProfile,
      currentCycle: cycle,
      checkInHistory: {
        ...weekHistory,
        '2026-08-09': { BODY: 'Done', FUEL: 'Done', METIME: 'Done' },
      },
      todayCheckIns: {
        BODY: {
          id: 'body',
          userId: 'user-1',
          cycleId: DEV_CYCLE_ID,
          date: '2026-08-09',
          domainType: 'BODY',
          status: 'Done',
          notes: null,
          xpAwarded: 25,
          createdAt: '2026-08-09T00:00:00Z',
          updatedAt: '2026-08-09T00:00:00Z',
        },
        FUEL: {
          id: 'fuel',
          userId: 'user-1',
          cycleId: DEV_CYCLE_ID,
          date: '2026-08-09',
          domainType: 'FUEL',
          status: 'Done',
          notes: null,
          xpAwarded: 25,
          createdAt: '2026-08-09T00:00:00Z',
          updatedAt: '2026-08-09T00:00:00Z',
        },
        METIME: {
          id: 'self',
          userId: 'user-1',
          cycleId: DEV_CYCLE_ID,
          date: '2026-08-09',
          domainType: 'METIME',
          status: 'Done',
          notes: null,
          xpAwarded: 25,
          createdAt: '2026-08-09T00:00:00Z',
          updatedAt: '2026-08-09T00:00:00Z',
        },
      },
    });

    await useAppStore.getState().setDailyCheckIn('USTIME', 'Done');
    await useAppStore.getState().setDailyCheckIn('USTIME', 'Done');

    expect(useAppStore.getState().profile?.xp).toBe(XP_PER_CHECK_IN_DONE + XP_PER_WEEK_COMPLETE);
    expect(Object.keys(useAppStore.getState().awardedWeeklyBonuses)).toHaveLength(1);
  });
});
