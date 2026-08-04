import 'fake-indexeddb/auto';
import type { CustomRoute, DailyCheckIn, KairosCycle, Profile } from '@/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const DB_NAME = 'kairos-offline-v1';
const cycleId = 'cycle-offline-1';

const supabaseState = vi.hoisted(() => ({
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  upsertMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: supabaseState.fromMock,
    rpc: supabaseState.rpcMock,
  },
}));

const profile: Profile = {
  id: 'user-1',
  displayName: 'Test User',
  identityAnchorId: 'builder',
  tier: 'brotherhood',
  xp: 0,
  currentKairosCycleId: cycleId,
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
  id: cycleId,
  userId: 'user-1',
  startDate: '2026-08-04',
  endDate: null,
  status: 'active',
  totalXpEarned: 0,
  completionPercentage: 0,
  createdAt: '2026-08-04T00:00:00Z',
};

const route: CustomRoute = {
  id: 'route-1',
  userId: 'user-1',
  cycleId,
  parentDomainType: 'METIME',
  label: 'Lens',
  description: '',
  focusDescription: 'Edit one keeper',
  createdAt: '2026-08-04T00:00:00Z',
  updatedAt: '2026-08-04T00:00:00Z',
  archivedAt: null,
};

function deleteQueueDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to delete test DB.'));
    request.onblocked = () => reject(new Error('Test DB delete was blocked.'));
  });
}

function setOnlineState(online: boolean) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: online },
    configurable: true,
  });
}

function makeEqChain(result: { data: unknown; error: { message: string } | null }) {
  let eqCount = 0;
  const chain = {
    eq: vi.fn(() => {
      eqCount += 1;
      return eqCount >= 2 ? Promise.resolve(result) : chain;
    }),
  };
  return chain;
}

function installSupabaseSuccessMocks() {
  supabaseState.upsertMock.mockImplementation(() => ({
    data: { id: 'synced-row' },
    error: null,
    select: () => ({
      single: async () => ({ data: { id: 'synced-row' }, error: null }),
    }),
  }));
  supabaseState.updateMock.mockImplementation(() => makeEqChain({ data: null, error: null }));
  supabaseState.rpcMock.mockResolvedValue({ data: null, error: null });
  supabaseState.fromMock.mockImplementation(() => ({
    upsert: supabaseState.upsertMock,
    update: supabaseState.updateMock,
  }));
}

describe('offline sync store contract', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
    vi.clearAllMocks();
    installSupabaseSuccessMocks();
    setOnlineState(true);
    await deleteQueueDatabase();

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

  it('updates paid daily check-ins immediately offline and replays them once online', async () => {
    const { useAppStore } = await import('@/store/useAppStore');

    useAppStore.getState().reset();
    useAppStore.setState({ profile, currentCycle: cycle, todayCheckIns: {} });
    setOnlineState(false);

    await useAppStore.getState().setDailyCheckIn('BODY', 'Done');

    expect(useAppStore.getState().todayCheckIns.BODY?.status).toBe('Done');
    expect(useAppStore.getState().offlineSyncStatus).toBe('pending');
    expect(useAppStore.getState().offlineQueueCount).toBe(1);
    expect(supabaseState.upsertMock).not.toHaveBeenCalled();

    setOnlineState(true);
    await useAppStore.getState().flushPendingSync();

    expect(supabaseState.upsertMock).toHaveBeenCalledTimes(1);
    expect(supabaseState.rpcMock).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().offlineSyncStatus).toBe('idle');
    expect(useAppStore.getState().offlineQueueCount).toBe(0);
  });

  it('keeps edited history notes locally while offline and replays the note update', async () => {
    const { useAppStore } = await import('@/store/useAppStore');
    const checkIn: DailyCheckIn = {
      id: 'check-body-1',
      userId: profile.id,
      cycleId,
      date: '2026-08-04',
      domainType: 'BODY',
      status: 'Done',
      notes: null,
      xpAwarded: 25,
      createdAt: '2026-08-04T08:00:00Z',
      updatedAt: '2026-08-04T08:00:00Z',
    };

    useAppStore.getState().reset();
    useAppStore.setState({
      profile,
      currentCycle: cycle,
      todayCheckIns: { BODY: checkIn },
      checkInNoteOverrides: {},
    });
    setOnlineState(false);

    await useAppStore.getState().updateDailyCheckInNote(checkIn, 'Quiet private note');

    expect(useAppStore.getState().todayCheckIns.BODY?.notes).toBe('Quiet private note');
    expect(useAppStore.getState().checkInNoteOverrides[checkIn.id]?.notes).toBe(
      'Quiet private note',
    );
    expect(useAppStore.getState().offlineQueueCount).toBe(1);

    setOnlineState(true);
    await useAppStore.getState().flushPendingSync();

    expect(supabaseState.updateMock).toHaveBeenCalledWith({
      notes: 'Quiet private note',
      updated_at: expect.any(String),
    });
    expect(useAppStore.getState().offlineQueueCount).toBe(0);
  });

  it('queues custom route check-ins offline and syncs them when connection returns', async () => {
    const { useAppStore } = await import('@/store/useAppStore');

    useAppStore.getState().reset();
    useAppStore.setState({
      profile,
      currentCycle: cycle,
      customRoutes: [route],
      todayCustomRouteCheckIns: {},
    });
    setOnlineState(false);

    await useAppStore.getState().setCustomRouteCheckIn(route.id, 'Partial');

    expect(useAppStore.getState().todayCustomRouteCheckIns[route.id]?.status).toBe('Partial');
    expect(useAppStore.getState().offlineQueueCount).toBe(1);

    setOnlineState(true);
    await useAppStore.getState().flushPendingSync();

    expect(supabaseState.upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        route_id: route.id,
        status: 'Partial',
      }),
      { onConflict: 'user_id,cycle_id,date,route_id' },
    );
    expect(useAppStore.getState().offlineSyncStatus).toBe('idle');
  });
});
