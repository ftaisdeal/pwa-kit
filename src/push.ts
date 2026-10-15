import { showInAppNotification } from './ui';
import { log } from './logger';

// VAPID public key for push notifications (replace with your actual key)
const VAPID_PUBLIC_KEY: string = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

let notificationSetupComplete = false; // Track if notifications are already configured

// Setup push notification subscription
export async function setupPushNotifications(
  showMessages = true
): Promise<PushSubscription | null | undefined> {
  // Prevent duplicate setup
  if (notificationSetupComplete && showMessages) {
    log.debug('Push notifications already configured, skipping setup');
    return undefined;
  }

  if ('serviceWorker' in navigator) {
    try {
      // Check if service worker is available
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length === 0) {
        log.debug(
          'No service worker available for push notifications (development mode)'
        );
        if (showMessages && !notificationSetupComplete) {
          showInAppNotification(
            'Notifications Ready',
            'Basic notifications enabled (Service Worker not available)'
          );
          notificationSetupComplete = true;
        }
        return null;
      }

      const registration = await navigator.serviceWorker.ready;
      const existingSubscription =
        await registration.pushManager.getSubscription();

      if (existingSubscription) {
        log.debug('Push subscription already exists');
        notificationSetupComplete = true;
        return existingSubscription;
      }

      // Check if VAPID key is configured
      if (!VAPID_PUBLIC_KEY.trim()) {
        log.debug(
          'Push notifications: VAPID key not configured, skipping subscription'
        );
        if (showMessages && !notificationSetupComplete) {
          showInAppNotification(
            'Notifications Ready',
            'Basic notifications enabled (Push requires VAPID key)'
          );
          notificationSetupComplete = true;
        }
        return null;
      }

      // Subscribe to push notifications with VAPID key
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      log.debug('New push subscription created');

      // Send subscription to server (if endpoint exists)
      await sendSubscriptionToServer(newSubscription);

      if (showMessages && !notificationSetupComplete) {
        showInAppNotification(
          'Push Notifications Ready',
          'You will receive push updates'
        );
      }
      notificationSetupComplete = true;
      return newSubscription;
    } catch (error) {
      log.warn('Push notification setup failed:', error);

      // More specific error messages (only if showing messages)
      if (showMessages) {
        const { name, message } = error as Error;
        if (name === 'NotSupportedError') {
          showInAppNotification(
            'Push Unsupported',
            'Push notifications not supported in this browser'
          );
        } else if (name === 'NotAllowedError') {
          showInAppNotification(
            'Push Blocked',
            'Push notifications blocked by browser settings'
          );
        } else {
          log.error('Push setup error details:', message);
          if (!notificationSetupComplete) {
            showInAppNotification(
              'Basic Notifications',
              'Local notifications enabled (Push setup failed)'
            );
          }
        }
      }

      notificationSetupComplete = true;
      return null;
    }
  }
  return null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function sendSubscriptionToServer(
  subscription: PushSubscription
): Promise<void> {
  try {
    // Check if server endpoint exists (development vs production)
    const response = await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });

    if (response.ok) {
      log.debug('Push subscription sent to server successfully');
    } else {
      log.debug('Push subscription endpoint not available (development mode)');
    }
  } catch (error) {
    // Expected in development - no backend server
    log.debug(
      'Push subscription server not available (development mode):',
      (error as Error).message
    );

    // Store subscription locally for development
    try {
      localStorage.setItem('push-subscription', JSON.stringify(subscription));
      log.debug('Push subscription stored locally for development');
    } catch (storageError) {
      log.warn('Could not store push subscription locally:', storageError);
    }
  }
}
