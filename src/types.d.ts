// Browser APIs that are not (yet) part of TypeScript's lib.dom.d.ts

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
}

interface NetworkInformation extends EventTarget {
  readonly effectiveType?: string;
  readonly downlink?: number;
  readonly rtt?: number;
}

interface Navigator {
  readonly connection?: NetworkInformation;
}

interface SyncManager {
  register(tag: string): Promise<void>;
}

interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
}

interface ServiceWorkerRegistration {
  readonly sync?: SyncManager;
  readonly periodicSync?: PeriodicSyncManager;
}
