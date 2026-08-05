import { readFileSync } from 'node:fs';
import type { DailyCheckIn, KairosCycle, Profile } from '@/types';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const profileA: Profile = {
  id: 'user-a',
  displayName: 'User A',
  identityAnchorId: 'builder',
  tier: 'brotherhood',
  xp: 25,
  currentKairosCycleId: 'cycle-a',
  dateOfBirth: '1984-01-01',
  squadId: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  subscriptionStatus: 'active',
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  createdAt: '2026-08-05T00:00:00Z',
  updatedAt: '2026-08-05T00:00:00Z',
};

const cycleA: KairosCycle = {
  id: 'cycle-a',
  userId: 'user-a',
  startDate: '2026-08-05',
  endDate: null,
  status: 'active',
  totalXpEarned: 25,
  completionPercentage: 0,
  createdAt: '2026-08-05T00:00:00Z',
};

const checkInA: DailyCheckIn = {
  id: 'check-in-a',
  userId: 'user-a',
  cycleId: 'cycle-a',
  date: '2026-08-05',
  domainType: 'BODY',
  status: 'Done',
  notes: null,
  xpAwarded: 10,
  createdAt: '2026-08-05T00:00:00Z',
  updatedAt: '2026-08-05T00:00:00Z',
};

describe('user and journey siloing', () => {
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

  beforeEach(async () => {
    const { useAppStore } = await import('@/store/useAppStore');
    useAppStore.getState().reset();
  });

  it('adds database checks that tie user-owned records to their owner and cycle', () => {
    const migration = readFileSync(
      'supabase/migrations/031_harden_user_record_siloing.sql',
      'utf8',
    );

    expect(migration).toContain('profiles_current_cycle_owner_fk');
    expect(migration).toContain('foreign key (current_kairos_cycle_id, id)');
    expect(migration).toContain('foreign key (cycle_id, user_id)');
    expect(migration).toContain('custom_route_check_ins_route_owner_fk');
    expect(migration).toContain('foreign key (route_id, user_id, cycle_id)');
    expect(migration).toContain('with check (auth.uid() = user_id)');
    expect(migration).toContain(
      'revoke all on function public.increment_squad_member_count(uuid, integer)',
    );
    expect(migration).toContain('revoke all on function public.decrement_squad_member_count(uuid)');
  });

  it('clears persisted account state before bootstrapping a different auth user', async () => {
    const { useAppStore } = await import('@/store/useAppStore');

    useAppStore.setState({
      authUser: { id: 'user-a', email: 'a@example.com' },
      profile: profileA,
      currentCycle: cycleA,
      onboardingComplete: true,
      todayCheckIns: { BODY: checkInA },
      checkInHistory: { '2026-08-05': { BODY: 'Done' } },
      profileImageDataUrl: 'data:image/png;base64,user-a',
      isBootstrapLoading: false,
    });

    useAppStore.getState().setAuthUser({ id: 'user-b', email: 'b@example.com' });

    const state = useAppStore.getState();
    expect(state.authUser).toEqual({ id: 'user-b', email: 'b@example.com' });
    expect(state.profile).toBeNull();
    expect(state.currentCycle).toBeNull();
    expect(state.onboardingComplete).toBe(false);
    expect(state.todayCheckIns).toEqual({});
    expect(state.checkInHistory).toEqual({});
    expect(state.profileImageDataUrl).toBeNull();
    expect(state.isBootstrapLoading).toBe(true);
  });
});
