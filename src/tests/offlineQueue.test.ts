import 'fake-indexeddb/auto';
import {
  type OfflineMutation,
  deleteOfflineMutation,
  enqueueOfflineMutation,
  getPendingOfflineMutationCount,
  listPendingOfflineMutations,
  markOfflineMutationFailed,
} from '@/services/offlineQueue';
import { beforeEach, describe, expect, it } from 'vitest';

const DB_NAME = 'kairos-offline-v1';

function deleteQueueDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to delete test DB.'));
    request.onblocked = () => reject(new Error('Test DB delete was blocked.'));
  });
}

function mutation(id: string, createdAt: string): Omit<OfflineMutation, 'attemptCount' | 'status'> {
  return {
    id,
    type: 'daily_check_in',
    userId: 'user-1',
    cycleId: 'cycle-1',
    payload: {
      id: `check-${id}`,
      date: '2026-08-04',
      domainType: 'BODY',
      status: 'Done',
      notes: null,
      xpDelta: 25,
      totalSyncDelta: 25,
      updatedAt: createdAt,
    },
    createdAt,
    updatedAt: createdAt,
  };
}

describe('offline mutation queue', () => {
  beforeEach(async () => {
    await deleteQueueDatabase();
  });

  it('lists pending mutations oldest first', async () => {
    await enqueueOfflineMutation(mutation('later', '2026-08-04T10:00:00.000Z'));
    await enqueueOfflineMutation(mutation('earlier', '2026-08-04T09:00:00.000Z'));

    const pending = await listPendingOfflineMutations();

    expect(pending.map((item) => item.id)).toEqual(['earlier', 'later']);
    expect(await getPendingOfflineMutationCount()).toBe(2);
  });

  it('keeps failed mutations retryable with an attempt count', async () => {
    await enqueueOfflineMutation(mutation('retry-me', '2026-08-04T09:00:00.000Z'));

    await markOfflineMutationFailed('retry-me', 'Network timeout');

    const [failed] = await listPendingOfflineMutations();
    expect(failed).toMatchObject({
      id: 'retry-me',
      status: 'failed',
      attemptCount: 1,
      lastError: 'Network timeout',
    });
    expect(await getPendingOfflineMutationCount()).toBe(1);
  });

  it('removes mutations after a successful replay', async () => {
    await enqueueOfflineMutation(mutation('synced', '2026-08-04T09:00:00.000Z'));

    await deleteOfflineMutation('synced');

    expect(await listPendingOfflineMutations()).toEqual([]);
  });
});
