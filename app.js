// Modern PWA Application Logic
import { Workbox } from 'workbox-window';

// VAPID public key for push notifications (replace with your actual key)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

class PWAApp {
  constructor() {
    this.isOnline = navigator.onLine;
    this.networkInfo = null;
    this.installPrompt = null;
    this.wb = null;
    this.db = null;
    this.notificationSetupComplete = false; // Track if notifications are already configured
    
    this.init();
  }

  async init() {
    console.log('PWA App initializing...');
    
    // Initialize service worker
    await this.setupServiceWorker();
    
    // Setup Web APIs
    this.setupNetworkListener();
    this.setupInstallation();
    this.initNotifications(); // Initialize infrastructure only, don't request permission
    this.setupShare();
    this.setupBackgroundSync();
    
    // Initialize IndexedDB
    await this.initDatabase();
    
    // Start connectivity monitoring
    this.startConnectivityMonitoring();
    
    // Setup UI event listeners
    this.setupUIEventListeners();
    
    console.log('PWA App initialized successfully');
  }

  async setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        // Skip service worker in development mode when PWA is disabled
        if (import.meta.env.DEV) {
          console.log('Service Worker skipped (development mode)');
          return;
        }
        
        // Check if service worker file exists (for production builds)
        const swResponse = await fetch('/sw.js', { method: 'HEAD' }).catch(() => ({ ok: false }));
        
        if (!swResponse.ok) {
          console.log('Service Worker not available');
          return;
        }
        
        this.wb = new Workbox('/sw.js');
        
        // Listen for service worker events
        this.wb.addEventListener('installed', (event) => {
          console.log('Service Worker installed:', event);
        });

        this.wb.addEventListener('waiting', (event) => {
          console.log('Service Worker waiting:', event);
          this.showUpdateAvailableNotification();
        });

        this.wb.addEventListener('controlling', (event) => {
          console.log('Service Worker controlling:', event);
          window.location.reload();
        });

        this.wb.addEventListener('activated', (event) => {
          console.log('Service Worker activated:', event);
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event.data);
        });

        // Register the service worker
        const registration = await this.wb.register();
        console.log('Service Worker registered:', registration.scope);
        
        // Setup periodic sync if supported
        if ('periodicSync' in registration) {
          await registration.periodicSync.register('content-sync', {
            minInterval: 24 * 60 * 60 * 1000 // 24 hours
          });
        }

      } catch (error) {
        console.warn('Service Worker registration failed (expected in development):', error.message);
      }
    }
  }

  handleServiceWorkerMessage(message) {
    switch (message.type) {
      case 'SW_UPDATED':
        console.log('Service Worker updated to version:', message.version);
        break;
      case 'CONNECTIVITY_RESTORED':
        this.handleConnectivityRestored();
        break;
      default:
        console.log('Unknown message from Service Worker:', message);
    }
  }

  showUpdateAvailableNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('App Update Available', {
        body: 'A new version of the app is ready. Refresh to update.',
        icon: '/img/icons-192.png',
        tag: 'app-update'
      });

      notification.onclick = () => {
        window.location.reload();
      };
    } else {
      // Fallback UI notification
      this.showInAppNotification('Update Available', 'Refresh to get the latest version');
    }
  }

  setupNetworkListener() {
    // Modern Network Information API
    if ('connection' in navigator) {
      this.networkInfo = navigator.connection;
      this.networkInfo.addEventListener('change', () => {
        this.handleNetworkChange();
      });
    }

    // Standard online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.checkConnectivity();
      }
    });
  }

  async setupInstallation() {
    // Install prompt handling
    window.addEventListener('beforeinstallprompt', (event) => {
      console.log('Install prompt available');
      event.preventDefault();
      this.installPrompt = event;
      this.showInstallButton();
    });

    // Track installation
    window.addEventListener('appinstalled', () => {
      console.log('App installed successfully');
      this.trackEvent('pwa_installed');
      this.hideInstallButton();
    });
  }

  // Initialize notification infrastructure without requesting permission
  initNotifications() {
    if ('Notification' in window) {
      // Check current permission status
      const { permission } = Notification;
      console.log('Current notification permission:', permission);
      
      // Show/hide notification button based on permission status
      this.updateNotificationUI(permission);
      
      // If already granted, setup push notifications
      if (permission === 'granted') {
        this.setupPushNotifications();
      }
    }
  }

  // Handle user-initiated notification permission request
  async requestNotificationPermission() {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission granted:', permission);
        
        // Update UI based on permission
        this.updateNotificationUI(permission);
        
        if (permission === 'granted') {
          // Setup push notifications without showing duplicate messages
          await this.setupPushNotifications(false); // false = don't show setup messages
          
          // Send a test notification to confirm it's working
          this.sendTestNotification();
          
          // Show single comprehensive message
          this.showInAppNotification('Notifications Enabled', 'You will now receive important updates');
        } else if (permission === 'denied') {
          this.showInAppNotification('Notifications Blocked', 'You can enable them in browser settings');
        }
        
        return permission;
      } catch (error) {
        console.warn('Notification permission request failed:', error);
        this.showInAppNotification('Permission Error', 'Unable to request notification permission');
        return 'default';
      }
    }
    return 'unsupported';
  }

  // Setup push notification subscription
  async setupPushNotifications(showMessages = true) {
    // Prevent duplicate setup
    if (this.notificationSetupComplete && showMessages) {
      console.log('Push notifications already configured, skipping setup');
      return;
    }

    if ('serviceWorker' in navigator) {
      try {
        // Check if service worker is available
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length === 0) {
          console.log('No service worker available for push notifications (development mode)');
          if (showMessages && !this.notificationSetupComplete) {
            this.showInAppNotification('Notifications Ready', 'Basic notifications enabled (Service Worker not available)');
            this.notificationSetupComplete = true;
          }
          return null;
        }
        
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        
        if (existingSubscription) {
          console.log('Push subscription already exists');
          this.notificationSetupComplete = true;
          return existingSubscription;
        }
        
        // Check if VAPID key is configured
        if (!VAPID_PUBLIC_KEY.trim()) {
          console.log('Push notifications: VAPID key not configured, skipping subscription');
          if (showMessages && !this.notificationSetupComplete) {
            this.showInAppNotification('Notifications Ready', 'Basic notifications enabled (Push requires VAPID key)');
            this.notificationSetupComplete = true;
          }
          return null;
        }
        
        // Subscribe to push notifications with VAPID key
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        
        console.log('New push subscription created');
        
        // Send subscription to server (if endpoint exists)
        await this.sendSubscriptionToServer(newSubscription);
        
        if (showMessages && !this.notificationSetupComplete) {
          this.showInAppNotification('Push Notifications Ready', 'You will receive push updates');
        }
        this.notificationSetupComplete = true;
        return newSubscription;
      } catch (error) {
        console.warn('Push notification setup failed:', error);
        
        // More specific error messages (only if showing messages)
        if (showMessages) {
          if (error.name === 'NotSupportedError') {
            this.showInAppNotification('Push Unsupported', 'Push notifications not supported in this browser');
          } else if (error.name === 'NotAllowedError') {
            this.showInAppNotification('Push Blocked', 'Push notifications blocked by browser settings');
          } else {
            console.error('Push setup error details:', error.message);
            if (!this.notificationSetupComplete) {
              this.showInAppNotification('Basic Notifications', 'Local notifications enabled (Push setup failed)');
            }
          }
        }
        
        this.notificationSetupComplete = true;
        return null;
      }
    }
    return null;
  }

  // Update notification button visibility and state
  updateNotificationUI(permission) {
    const notificationButton = document.querySelector('.notifications-button');
    if (!notificationButton) return;
    
    switch (permission) {
      case 'default':
        notificationButton.style.display = 'block';
        notificationButton.textContent = '🔔 Enable Notifications';
        notificationButton.disabled = false;
        break;
      case 'granted':
        notificationButton.style.display = 'block';
        notificationButton.textContent = '✅ Notifications Enabled';
        notificationButton.disabled = true;
        break;
      case 'denied':
        notificationButton.style.display = 'block';
        notificationButton.textContent = '❌ Notifications Blocked';
        notificationButton.disabled = true;
        break;
    }
  }

  // Send a test notification to confirm notifications are working
  sendTestNotification() {
    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification('PWA Kit Test Notification', {
          body: 'Notifications are working! 🎉',
          icon: '/img/icons-192.png',
          badge: '/img/icons-192.png',
          tag: 'test-notification',
          renotify: false,
          silent: false,
          timestamp: Date.now()
        });

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

  setupShare() {
    // Setup click handlers for action buttons
    document.addEventListener('click', (event) => {
      // Handle share button
      if (event.target.classList.contains('share-button') && 'share' in navigator) {
        event.preventDefault();
        this.shareContent();
      }
      
      // Handle notification permission button
      if (event.target.classList.contains('notifications-button')) {
        event.preventDefault();
        this.requestNotificationPermission();
      }
    });
  }

  async shareContent() {
    try {
      await navigator.share({
        title: 'PWA Kit Modern',
        text: 'Check out this modern PWA starter kit!',
        url: window.location.href
      });
      this.trackEvent('content_shared');
    } catch (error) {
      console.log('Share failed:', error);
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href);
      this.showInAppNotification('Link Copied', 'URL copied to clipboard');
    }
  }

  setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      console.log('Background Sync available');
      
      // Queue actions for background sync when offline
      document.addEventListener('submit', (event) => {
        if (!this.isOnline && event.target.classList.contains('sync-form')) {
          event.preventDefault();
          this.queueForBackgroundSync(event.target);
        }
      });
    }
  }

  async queueForBackgroundSync(form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Store in IndexedDB for later sync
    await this.storeOfflineAction('form-submission', data);
    
    // Register background sync if service worker is available
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          const registration = await navigator.serviceWorker.ready;
          await registration.sync.register('connectivity-check');
        }
      } catch (error) {
        console.warn('Background sync registration failed:', error);
      }
    }
    
    this.showInAppNotification('Queued', 'Form will be submitted when online');
  }

  async initDatabase() {
    try {
      const { openDB } = await import('idb');
      
      this.db = await openDB('PWAKit', 1, {
        upgrade(db) {
          // Create object stores
          if (!db.objectStoreNames.contains('offline-actions')) {
            db.createObjectStore('offline-actions', { keyPath: 'id', autoIncrement: true });
          }
          
          if (!db.objectStoreNames.contains('app-data')) {
            db.createObjectStore('app-data');
          }
        }
      });
      
      console.log('IndexedDB initialized');
    } catch (error) {
      console.error('IndexedDB initialization failed:', error);
    }
  }

  async storeOfflineAction(type, data) {
    if (!this.db) return;
    
    try {
      await this.db.add('offline-actions', {
        type,
        data,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to store offline action:', error);
    }
  }

  startConnectivityMonitoring() {
    // Initial check
    this.checkConnectivity();
    
    // Periodic checks
    setInterval(() => {
      if (this.isOnline) {
        this.checkConnectivity();
      }
    }, 30000); // Check every 30 seconds
  }

  async checkConnectivity() {
    const container = document.getElementById('container');
    if (!container) return;

    const messages = {
      checking: '<span class="checking">🔄 Checking connectivity...</span>',
      online: '<span class="green">✅ Online and connected</span>',
      offline: '<span class="red">❌ No internet connection</span>',
      limited: '<span class="orange">⚠️ Limited connectivity</span>'
    };

    container.innerHTML = messages.checking;

    if (!navigator.onLine) {
      container.innerHTML = messages.offline;
      return false;
    }

    try {
      const testEndpoints = [
        { url: 'https://www.gstatic.com/generate_204', timeout: 3000 },
        { url: 'https://httpbin.org/status/200', timeout: 4000 },
        { url: '/favicon-32.png', timeout: 2000 }
      ];

      for (const endpoint of testEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);

          await fetch(endpoint.url, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache',
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          
          let statusHTML = messages.online;
          
          // Add network info if available
          if (this.networkInfo) {
            const { effectiveType, downlink, rtt } = this.networkInfo;
            statusHTML += ` <small>(${effectiveType}`;
            if (downlink) statusHTML += `, ${downlink}Mbps`;
            if (rtt) statusHTML += `, ${rtt}ms`;
            statusHTML += ')</small>';
          }
          
          container.innerHTML = statusHTML;
          return true;
        } catch (error) {
          continue;
        }
      }

      container.innerHTML = messages.limited;
      return false;
    } catch (error) {
      container.innerHTML = messages.offline;
      return false;
    }
  }

  handleOnline() {
    console.log('Device went online');
    this.isOnline = true;
    this.checkConnectivity();
    this.syncOfflineActions();
  }

  handleOffline() {
    console.log('Device went offline');
    this.isOnline = false;
    const container = document.getElementById('container');
    if (container) {
      container.innerHTML = '<span class="red">❌ Offline</span>';
    }
  }

  handleNetworkChange() {
    console.log('Network conditions changed:', this.networkInfo);
    this.checkConnectivity();
  }

  handleConnectivityRestored() {
    console.log('Connectivity restored via background sync');
    this.checkConnectivity();
  }

  async syncOfflineActions() {
    if (!this.db || !this.isOnline) return;

    try {
      const actions = await this.db.getAll('offline-actions');
      
      for (const action of actions) {
        try {
          await this.processOfflineAction(action);
          await this.db.delete('offline-actions', action.id);
        } catch (error) {
          console.error('Failed to sync action:', action, error);
        }
      }
    } catch (error) {
      console.error('Offline sync failed:', error);
    }
  }

  async processOfflineAction(action) {
    switch (action.type) {
      case 'form-submission':
        await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;
      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  showInstallButton() {
    const installButton = document.createElement('button');
    installButton.textContent = 'Install App';
    installButton.className = 'install-button';
    installButton.onclick = () => this.installApp();
    
    document.body.appendChild(installButton);
  }

  hideInstallButton() {
    const button = document.querySelector('.install-button');
    if (button) button.remove();
  }

  async installApp() {
    if (this.installPrompt) {
      this.installPrompt.prompt();
      const result = await this.installPrompt.userChoice;
      console.log('Install prompt result:', result);
      
      if (result.outcome === 'accepted') {
        this.trackEvent('pwa_install_accepted');
      } else {
        this.trackEvent('pwa_install_dismissed');
      }
      
      this.installPrompt = null;
      this.hideInstallButton();
    }
  }

  setupUIEventListeners() {
    // Refresh button
    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('refresh-button')) {
        this.checkConnectivity();
      }
    });
  }

  showInAppNotification(title, body) {
    const notification = document.createElement('div');
    notification.className = 'in-app-notification';
    notification.innerHTML = `
      <strong>${title}</strong><br>
      ${body}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  trackEvent(eventName, properties = {}) {
    console.log('Event tracked:', eventName, properties);
    // Integrate with your analytics service
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async sendSubscriptionToServer(subscription) {
    try {
      // Check if server endpoint exists (development vs production)
      const response = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      
      if (response.ok) {
        console.log('Push subscription sent to server successfully');
      } else {
        console.log('Push subscription endpoint not available (development mode)');
      }
    } catch (error) {
      // Expected in development - no backend server
      console.log('Push subscription server not available (development mode):', error.message);
      
      // Store subscription locally for development
      try {
        localStorage.setItem('push-subscription', JSON.stringify(subscription));
        console.log('Push subscription stored locally for development');
      } catch (storageError) {
        console.warn('Could not store push subscription locally:', storageError);
      }
    }
  }
}

// Initialize PWA when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new PWAApp());
} else {
  new PWAApp();
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
    const entries = list.getEntries();
    entries.forEach(entry => {
      console.log('Performance entry:', entry.name, entry.startTime);
    });
  });
  
  observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
}