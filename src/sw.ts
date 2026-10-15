import { Workbox } from 'workbox-window';
import { handleConnectivityRestored } from './network';
import { showInAppNotification } from './ui';

let wb: Workbox | null = null;

export async function setupServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      // Skip service worker in development mode when PWA is disabled
      if (import.meta.env.DEV) {
        console.log('Service Worker skipped (development mode)');
        return;
      }

      // Check if service worker file exists (for production builds)
      const swResponse = await fetch('/sw.js', { method: 'HEAD' }).catch(
        () => ({ ok: false })
      );

      if (!swResponse.ok) {
        console.log('Service Worker not available');
        return;
      }

      wb = new Workbox('/sw.js');

      // Listen for service worker events
      wb.addEventListener('installed', (event) => {
        console.log('Service Worker installed:', event);
      });

      wb.addEventListener('waiting', (event) => {
        console.log('Service Worker waiting:', event);
        showUpdateAvailableNotification();
      });

      wb.addEventListener('controlling', (event) => {
        console.log('Service Worker controlling:', event);
        window.location.reload();
      });

      wb.addEventListener('activated', (event) => {
        console.log('Service Worker activated:', event);
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        handleServiceWorkerMessage(event.data);
      });

      // Register the service worker
      const registration = await wb.register();
      console.log('Service Worker registered:', registration?.scope);

      // Setup periodic sync if supported
      if (registration && 'periodicSync' in registration) {
        await registration.periodicSync?.register('content-sync', {
          minInterval: 24 * 60 * 60 * 1000, // 24 hours
        });
      }
    } catch (error) {
      console.warn(
        'Service Worker registration failed (expected in development):',
        (error as Error).message
      );
    }
  }
}

interface ServiceWorkerMessage {
  type: string;
  version?: string;
}

function handleServiceWorkerMessage(message: ServiceWorkerMessage): void {
  switch (message.type) {
    case 'SW_UPDATED':
      console.log('Service Worker updated to version:', message.version);
      break;
    case 'CONNECTIVITY_RESTORED':
      handleConnectivityRestored();
      break;
    default:
      console.log('Unknown message from Service Worker:', message);
  }
}

function showUpdateAvailableNotification(): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification('App Update Available', {
      body: 'A new version of the app is ready. Refresh to update.',
      icon: '/img/icons-192.png',
      tag: 'app-update',
    });

    notification.onclick = () => {
      window.location.reload();
    };
  } else {
    // Fallback UI notification
    showInAppNotification(
      'Update Available',
      'Refresh to get the latest version'
    );
  }
}
