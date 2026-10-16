import type { IDBPDatabase } from 'idb';
import { getDb, storeOfflineAction, type OfflineAction } from './db';
import { isOnline } from './network';
import { showInAppNotification } from './ui';
import { log } from './logger';

// Replays are attempted this many times in total. After the last failure the
// action is dropped, so a permanently failing request cannot pile up forever.
export const MAX_SYNC_ATTEMPTS = 5;

export function setupBackgroundSync(): void {
  if (
    'serviceWorker' in navigator &&
    'sync' in window.ServiceWorkerRegistration.prototype
  ) {
    log.debug('Background Sync available');

    // Queue actions for background sync when offline
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (
        !isOnline() &&
        form instanceof HTMLFormElement &&
        form.classList.contains('sync-form')
      ) {
        event.preventDefault();
        void queueForBackgroundSync(form);
      }
    });
  }
}

async function queueForBackgroundSync(form: HTMLFormElement): Promise<void> {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  // Store in IndexedDB for later sync
  await storeOfflineAction('form-submission', data);

  // Register background sync if service worker is available
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync?.register('connectivity-check');
      }
    } catch (error) {
      log.warn('Background sync registration failed:', error);
    }
  }

  showInAppNotification('Queued', 'Form will be submitted when online');
}

export async function syncOfflineActions(): Promise<void> {
  const db = getDb();
  if (!db || !isOnline()) return;

  try {
    const actions: OfflineAction[] = await db.getAll('offline-actions');

    for (const action of actions) {
      try {
        await processOfflineAction(action);
        await db.delete('offline-actions', action.id as number);
      } catch (error) {
        await recordFailedAttempt(db, action, error);
      }
    }
  } catch (error) {
    log.error('Offline sync failed:', error);
  }
}

async function recordFailedAttempt(
  db: IDBPDatabase,
  action: OfflineAction,
  error: unknown
): Promise<void> {
  const attempts = (action.attempts ?? 0) + 1;

  try {
    if (attempts >= MAX_SYNC_ATTEMPTS) {
      log.error(
        `Giving up on offline action after ${attempts} attempts:`,
        action,
        error
      );
      await db.delete('offline-actions', action.id as number);
    } else {
      log.error(
        `Failed to sync action (attempt ${attempts} of ${MAX_SYNC_ATTEMPTS}):`,
        action,
        error
      );
      await db.put('offline-actions', { ...action, attempts });
    }
  } catch (storageError) {
    log.error('Could not update the failed action:', storageError);
  }
}

async function processOfflineAction(action: OfflineAction): Promise<void> {
  switch (action.type) {
    case 'form-submission': {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      });
      // fetch only rejects on network errors. Throw on an error status too,
      // so the action stays queued instead of being deleted as if it was sent.
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      break;
    }
    default:
      log.warn('Unknown action type:', action.type);
  }
}
