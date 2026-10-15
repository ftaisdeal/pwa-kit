import { setupPushNotifications } from './push';
import { showInAppNotification } from './ui';

// Initialize notification infrastructure without requesting permission
export function initNotifications(): void {
  if ('Notification' in window) {
    // Check current permission status
    const { permission } = Notification;
    console.log('Current notification permission:', permission);

    // Show/hide notification button based on permission status
    updateNotificationUI(permission);

    // If already granted, setup push notifications
    if (permission === 'granted') {
      void setupPushNotifications();
    }
  }
}

// Handle user-initiated notification permission request
export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if ('Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission granted:', permission);

      // Update UI based on permission
      updateNotificationUI(permission);

      if (permission === 'granted') {
        // Setup push notifications without showing duplicate messages
        await setupPushNotifications(false); // false = don't show setup messages

        // Send a test notification to confirm it's working
        sendTestNotification();

        // Show single comprehensive message
        showInAppNotification(
          'Notifications Enabled',
          'You will now receive important updates'
        );
      } else if (permission === 'denied') {
        showInAppNotification(
          'Notifications Blocked',
          'You can enable them in browser settings'
        );
      }

      return permission;
    } catch (error) {
      console.warn('Notification permission request failed:', error);
      showInAppNotification(
        'Permission Error',
        'Unable to request notification permission'
      );
      return 'default';
    }
  }
  return 'unsupported';
}

// Update notification button visibility and state
function updateNotificationUI(permission: NotificationPermission): void {
  const notificationButton = document.querySelector<HTMLButtonElement>(
    '.notifications-button'
  );
  if (!notificationButton) return;

  switch (permission) {
    case 'default':
      notificationButton.hidden = false;
      notificationButton.textContent = '🔔 Enable Notifications';
      notificationButton.disabled = false;
      break;
    case 'granted':
      notificationButton.hidden = false;
      notificationButton.textContent = '✅ Notifications Enabled';
      notificationButton.disabled = true;
      break;
    case 'denied':
      notificationButton.hidden = false;
      notificationButton.textContent = '❌ Notifications Blocked';
      notificationButton.disabled = true;
      break;
  }
}

// Send a test notification to confirm notifications are working
function sendTestNotification(): void {
  if (Notification.permission === 'granted') {
    try {
      // `renotify` and `timestamp` are valid but missing from lib.dom's NotificationOptions
      const options: NotificationOptions & {
        renotify?: boolean;
        timestamp?: number;
      } = {
        body: 'Notifications are working! 🎉',
        icon: '/img/icons-192.png',
        badge: '/img/icons-192.png',
        tag: 'test-notification',
        renotify: false,
        silent: false,
        timestamp: Date.now(),
      };
      const notification = new Notification(
        'PWA Kit Test Notification',
        options
      );

      // Auto close after 4 seconds
      setTimeout(() => {
        notification.close();
      }, 4000);

      console.log('Test notification sent successfully');
    } catch (error) {
      console.warn('Test notification failed:', error);
    }
  }
}
