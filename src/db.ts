import type { IDBPDatabase } from 'idb';

export interface OfflineAction {
  id?: number;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
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

    console.log('IndexedDB initialized');
  } catch (error) {
    console.error('IndexedDB initialization failed:', error);
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
    console.error('Failed to store offline action:', error);
  }
}
