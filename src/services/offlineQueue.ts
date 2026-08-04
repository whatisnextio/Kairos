export type OfflineMutationType =
  | 'daily_check_in'
  | 'daily_check_in_note'
  | 'custom_route_check_in';

export type OfflineMutationStatus = 'pending' | 'syncing' | 'failed';

export interface OfflineMutation<TPayload = object> {
  id: string;
  type: OfflineMutationType;
  userId: string;
  cycleId: string;
  payload: TPayload;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  status: OfflineMutationStatus;
  lastError?: string;
}

const DB_NAME = 'kairos-offline-v1';
const DB_VERSION = 1;
const MUTATION_STORE = 'mutationQueue';

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) {
    return Promise.reject(new Error('IndexedDB is not available on this device.'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MUTATION_STORE)) {
        const store = db.createObjectStore(MUTATION_STORE, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open offline storage.'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T> | undefined = () => undefined,
): Promise<T | undefined> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MUTATION_STORE, mode);
    const store = transaction.objectStore(MUTATION_STORE);
    const request = operation(store);
    let result: T | undefined;

    if (request) {
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error ?? new Error('Offline storage request failed.'));
    }

    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('Offline storage transaction failed.'));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error ?? new Error('Offline storage transaction aborted.'));
    };
  });
}

export async function enqueueOfflineMutation(
  mutation: Omit<OfflineMutation, 'attemptCount' | 'status'>,
): Promise<void> {
  const record: OfflineMutation = {
    ...mutation,
    attemptCount: 0,
    status: 'pending',
  };
  await withStore('readwrite', (store) => store.put(record));
}

export async function listPendingOfflineMutations(): Promise<OfflineMutation[]> {
  const records = await withStore<OfflineMutation[]>('readonly', (store) => store.getAll());
  return (records ?? [])
    .filter((record) => record.status === 'pending' || record.status === 'failed')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getPendingOfflineMutationCount(): Promise<number> {
  return (await listPendingOfflineMutations()).length;
}

export async function deleteOfflineMutation(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}

export async function markOfflineMutationFailed(id: string, error: string): Promise<void> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MUTATION_STORE, 'readwrite');
    const store = transaction.objectStore(MUTATION_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      const record = request.result as OfflineMutation | undefined;
      if (!record) return;
      store.put({
        ...record,
        status: 'failed',
        attemptCount: record.attemptCount + 1,
        lastError: error,
        updatedAt: new Date().toISOString(),
      });
    };
    request.onerror = () => reject(request.error ?? new Error('Offline storage request failed.'));

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('Offline storage transaction failed.'));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error ?? new Error('Offline storage transaction aborted.'));
    };
  });
}
