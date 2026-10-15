let online = navigator.onLine;
let networkInfo: NetworkInformation | null = null;
const onlineListeners: Array<() => void> = [];

export const isOnline = (): boolean => online;

// Register a callback that runs whenever the device comes back online
export const onOnline = (listener: () => void): void => {
  onlineListeners.push(listener);
};

export function setupNetworkListener(): void {
  // Modern Network Information API
  if (navigator.connection) {
    networkInfo = navigator.connection;
    networkInfo.addEventListener('change', () => {
      console.log('Network conditions changed:', networkInfo);
      void checkConnectivity();
    });
  }

  // Standard online/offline events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && online) {
      void checkConnectivity();
    }
  });
}

export function startConnectivityMonitoring(): void {
  // Initial check
  void checkConnectivity();

  // Periodic checks
  setInterval(() => {
    if (online) {
      void checkConnectivity();
    }
  }, 30000); // Check every 30 seconds
}

export async function checkConnectivity(): Promise<boolean | undefined> {
  const container = document.getElementById('container');
  if (!container) return undefined;

  const messages = {
    checking: '<span class="checking">🔄 Checking connectivity...</span>',
    online: '<span class="green">✅ Online and connected</span>',
    offline: '<span class="red">❌ No internet connection</span>',
    limited: '<span class="orange">⚠️ Limited connectivity</span>',
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
      { url: '/favicon-32.png', timeout: 2000 },
    ];

    for (const endpoint of testEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          endpoint.timeout
        );

        await fetch(endpoint.url, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        let statusHTML = messages.online;

        // Add network info if available
        if (networkInfo) {
          const { effectiveType, downlink, rtt } = networkInfo;
          statusHTML += ` <small>(${effectiveType}`;
          if (downlink) statusHTML += `, ${downlink}Mbps`;
          if (rtt) statusHTML += `, ${rtt}ms`;
          statusHTML += ')</small>';
        }

        container.innerHTML = statusHTML;
        return true;
      } catch {
        continue;
      }
    }

    container.innerHTML = messages.limited;
    return false;
  } catch {
    container.innerHTML = messages.offline;
    return false;
  }
}

function handleOnline(): void {
  console.log('Device went online');
  online = true;
  void checkConnectivity();
  onlineListeners.forEach((listener) => listener());
}

function handleOffline(): void {
  console.log('Device went offline');
  online = false;
  const container = document.getElementById('container');
  if (container) {
    container.innerHTML = '<span class="red">❌ Offline</span>';
  }
}

export function handleConnectivityRestored(): void {
  console.log('Connectivity restored via background sync');
  void checkConnectivity();
}
