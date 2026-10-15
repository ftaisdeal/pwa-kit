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

const STATUS = {
  checking: { className: 'checking', text: '🔄 Checking connectivity...' },
  online: { className: 'green', text: '✅ Online and connected' },
  offline: { className: 'red', text: '❌ No internet connection' },
  offlineEvent: { className: 'red', text: '❌ Offline' },
  limited: { className: 'orange', text: '⚠️ Limited connectivity' },
};

// Builds the status with DOM APIs (textContent), never by parsing HTML strings
function renderStatus(
  container: HTMLElement,
  { className, text }: { className: string; text: string },
  details?: string
): void {
  const status = document.createElement('span');
  status.className = className;
  status.textContent = text;
  const nodes: Array<Node | string> = [status];

  if (details) {
    const small = document.createElement('small');
    small.textContent = `(${details})`;
    nodes.push(' ', small);
  }
  container.replaceChildren(...nodes);
}

// e.g. "4g, 10Mbps, 50ms" when the Network Information API is available
function describeNetwork(): string | undefined {
  if (!networkInfo) return undefined;
  const { effectiveType, downlink, rtt } = networkInfo;
  const parts = [effectiveType];
  if (downlink) parts.push(`${downlink}Mbps`);
  if (rtt) parts.push(`${rtt}ms`);
  return parts.join(', ');
}

export async function checkConnectivity(): Promise<boolean | undefined> {
  const container = document.getElementById('container');
  if (!container) return undefined;

  renderStatus(container, STATUS.checking);

  if (!navigator.onLine) {
    renderStatus(container, STATUS.offline);
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

        renderStatus(container, STATUS.online, describeNetwork());
        return true;
      } catch {
        continue;
      }
    }

    renderStatus(container, STATUS.limited);
    return false;
  } catch {
    renderStatus(container, STATUS.offline);
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
    renderStatus(container, STATUS.offlineEvent);
  }
}

export function handleConnectivityRestored(): void {
  console.log('Connectivity restored via background sync');
  void checkConnectivity();
}
