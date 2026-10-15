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
import { shareContent } from './share';
import { setupServiceWorker } from './sw';
import { setupBackgroundSync, syncOfflineActions } from './sync';
import { onClick } from './ui';

async function init(): Promise<void> {
  console.log('PWA App initializing...');

  // Initialize service worker
  await setupServiceWorker();

  // Setup Web APIs
  setupNetworkListener();
  onOnline(() => void syncOfflineActions());
  setupInstallation();
  initNotifications(); // Initialize infrastructure only, don't request permission
  setupActionButtons();
  setupBackgroundSync();

  // Initialize IndexedDB
  await initDatabase();

  // Start connectivity monitoring
  startConnectivityMonitoring();

  // Setup UI event listeners
  onClick('refresh-button', () => void checkConnectivity());

  console.log('PWA App initialized successfully');
}

// Click handlers for the share and notification buttons
function setupActionButtons(): void {
  onClick('share-button', (event) => {
    if ('share' in navigator) {
      event.preventDefault();
      void shareContent();
    }
  });

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
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Performance monitoring
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      console.log('Performance entry:', entry.name, entry.startTime);
    });
  });

  observer.observe({
    entryTypes: ['navigation', 'paint', 'largest-contentful-paint'],
  });
}
