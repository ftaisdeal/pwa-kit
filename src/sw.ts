import { Workbox } from 'workbox-window';
import { handleConnectivityRestored } from './network';
import { showUpdatePrompt } from './ui';
import { log } from './logger';

// Update flow: a new service worker installs in the background and waits.
// We ask the user before activating it, and only reload the page once they
// have accepted, so an update never discards what they are doing.
export async function setupServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  // Skip service worker in development mode when PWA is disabled
  if (import.meta.env.DEV) {
    log.debug('Service Worker skipped (development mode)');
    return;
  }

  try {
    const wb = new Workbox('/sw.js');
    let reloadRequested = false;

    wb.addEventListener('waiting', () => {
      showUpdatePrompt(() => {
        reloadRequested = true;
        wb.messageSkipWaiting();
      });
    });

    // The new worker took over; reload so the page uses its assets
    wb.addEventListener('controlling', () => {
      if (reloadRequested) {
        window.location.reload();
      }
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      handleServiceWorkerMessage(event.data);
    });

    const registration = await wb.register();
    log.debug('Service Worker registered:', registration?.scope);
  } catch (error) {
    log.warn(
      'Service Worker registration failed (expected in development):',
      (error as Error).message
    );
    return;
  }

  await registerPeriodicSync();
}

// Periodic sync is Chromium-only and needs a permission, so it must not
// affect service worker registration when it is unavailable or denied.
async function registerPeriodicSync(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.periodicSync?.register('content-sync', {
      minInterval: 24 * 60 * 60 * 1000, // 24 hours
    });
  } catch (error) {
    log.debug('Periodic sync unavailable:', (error as Error).message);
  }
}

interface ServiceWorkerMessage {
  type: string;
  version?: string;
}

function handleServiceWorkerMessage(message: ServiceWorkerMessage): void {
  switch (message.type) {
    case 'SW_UPDATED':
      log.debug('Service Worker updated to version:', message.version);
      break;
    case 'CONNECTIVITY_RESTORED':
      handleConnectivityRestored();
      break;
    default:
      log.debug('Unknown message from Service Worker:', message);
  }
}
