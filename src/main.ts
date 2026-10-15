// Modern PWA Application Logic
import '@fontsource-variable/inter/wght.css';
import { setupInstallation } from './install';
import {
  initNotifications,
  requestNotificationPermission,
} from './notifications';
import {
  checkConnectivity,
  onOnline,
  setupNetworkListener,
  startConnectivityMonitoring,
} from './network';
import { initDatabase } from './db';
import { setupShare } from './share';
import { setupServiceWorker } from './sw';
import { setupBackgroundSync, syncOfflineActions } from './sync';
import { onClick } from './ui';
import { log } from './logger';

async function init(): Promise<void> {
  log.debug('PWA App initializing...');

  // Initialize service worker
  await setupServiceWorker();

  // Setup Web APIs
  setupNetworkListener();
  onOnline(() => void syncOfflineActions());
  setupInstallation();
  initNotifications(); // Initialize infrastructure only, don't request permission
  setupShare();
  setupActionButtons();
  setupBackgroundSync();

  // Initialize IndexedDB
  await initDatabase();

  // Start connectivity monitoring
  startConnectivityMonitoring();

  // Setup UI event listeners
  onClick('refresh-button', () => void checkConnectivity());

  log.debug('PWA App initialized successfully');
}

// Click handler for the notifications button
function setupActionButtons(): void {
  onClick('notifications-button', (event) => {
    event.preventDefault();
    void requestNotificationPermission();
  });
}

// Initialize PWA when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void init());
} else {
  void init();
}

// Global error handling
window.addEventListener('error', (event) => {
  log.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  log.error('Unhandled promise rejection:', event.reason);
});

// Performance monitoring
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      log.debug('Performance entry:', entry.name, entry.startTime);
    });
  });

  observer.observe({
    entryTypes: ['navigation', 'paint', 'largest-contentful-paint'],
  });
}
