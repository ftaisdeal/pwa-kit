import type { IDBPDatabase } from 'idb';
import { log } from './logger';

export interface OfflineAction {
  id?: number;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
  // Failed replays so far (see MAX_SYNC_ATTEMPTS in sync.ts)
  attempts?: number;
}

let db: IDBPDatabase | null = null;

export const getDb = (): IDBPDatabase | null => db;

export async function initDatabase(): Promise<void> {
  try {
    const { openDB } = await import('idb');

    db = await openDB('PWAKit', 1, {
      upgrade(database) {
        // Create object stores
        if (!database.objectStoreNames.contains('offline-actions')) {
          database.createObjectStore('offline-actions', {
            keyPath: 'id',
            autoIncrement: true,
          });
        }

        if (!database.objectStoreNames.contains('app-data')) {
          database.createObjectStore('app-data');
        }
      },
    });

    log.debug('IndexedDB initialized');
  } catch (error) {
    log.error('IndexedDB initialization failed:', error);
  }
}

export async function storeOfflineAction(
  type: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!db) return;

  try {
    const action: OfflineAction = { type, data, timestamp: Date.now() };
    await db.add('offline-actions', action);
  } catch (error) {
    log.error('Failed to store offline action:', error);
  }
}
