import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// db.ts keeps the open database in module state, so load a fresh copy of the
// module and an empty IndexedDB for every test
const loadDb = async () => {
  vi.resetModules();
  return import('../../src/db');
};

describe('db', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates the object stores', async () => {
    const { initDatabase, getDb } = await loadDb();
    await initDatabase();

    const names = [...(getDb()?.objectStoreNames ?? [])];
    expect(names).toEqual(['app-data', 'offline-actions']);
  });

  it('stores offline actions with an id, type, data and timestamp', async () => {
    const { initDatabase, storeOfflineAction, getDb } = await loadDb();
    await initDatabase();

    await storeOfflineAction('form-submission', { name: 'Ada' });
    await storeOfflineAction('form-submission', { name: 'Grace' });

    const actions = await getDb()!.getAll('offline-actions');
    expect(actions).toHaveLength(2);
    expect(actions[0]).toMatchObject({
      id: 1,
      type: 'form-submission',
      data: { name: 'Ada' },
    });
    expect(actions[1].id).toBe(2);
    expect(actions[0].timestamp).toBeGreaterThan(0);
  });

  it('keeps stored actions across a reopen', async () => {
    const first = await loadDb();
    await first.initDatabase();
    await first.storeOfflineAction('form-submission', { name: 'Ada' });
    first.getDb()!.close();

    const second = await loadDb();
    await second.initDatabase();
    expect(await second.getDb()!.getAll('offline-actions')).toHaveLength(1);
  });

  it('does nothing when storing before the database is open', async () => {
    const { storeOfflineAction, getDb } = await loadDb();

    await expect(storeOfflineAction('x', {})).resolves.toBeUndefined();
    expect(getDb()).toBeNull();
  });

  it('logs and carries on when IndexedDB is unavailable', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('indexedDB', undefined);
    const { initDatabase, storeOfflineAction, getDb } = await loadDb();

    await expect(initDatabase()).resolves.toBeUndefined();
    expect(getDb()).toBeNull();
    expect(error).toHaveBeenCalled();
    await expect(storeOfflineAction('x', {})).resolves.toBeUndefined();

    vi.unstubAllGlobals();
  });
});
