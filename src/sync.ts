import { getDb, storeOfflineAction, type OfflineAction } from './db';
import { isOnline } from './network';
import { showInAppNotification } from './ui';

export function setupBackgroundSync(): void {
  if (
    'serviceWorker' in navigator &&
    'sync' in window.ServiceWorkerRegistration.prototype
  ) {
    console.log('Background Sync available');

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
      console.warn('Background sync registration failed:', error);
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
        console.error('Failed to sync action:', action, error);
      }
    }
  } catch (error) {
    console.error('Offline sync failed:', error);
  }
}

async function processOfflineAction(action: OfflineAction): Promise<void> {
  switch (action.type) {
    case 'form-submission':
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
      });
      break;
    default:
      console.warn('Unknown action type:', action.type);
  }
}
