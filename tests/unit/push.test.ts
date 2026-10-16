import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// "AQIDBA" is the base64url encoding of the bytes [1, 2, 3, 4]
const VAPID_KEY = 'AQIDBA';

const subscription = {
  endpoint: 'https://push.example/abc',
  toJSON: () => ({}),
};

const push = {
  getSubscription: vi.fn(),
  subscribe: vi.fn(),
};

// The key is read when the module loads, so every test imports a fresh copy
const loadPush = async (vapidKey = VAPID_KEY) => {
  vi.resetModules();
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', vapidKey);
  return import('../../src/push');
};

const notice = () =>
  document.querySelector('.in-app-notification')?.textContent ?? '';

const setServiceWorker = (registrations: unknown[]) => {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistrations: async () => registrations,
      ready: Promise.resolve({ pushManager: push }),
    },
  });
};

describe('setupPushNotifications', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    push.getSubscription.mockReset().mockResolvedValue(null);
    push.subscribe.mockReset().mockResolvedValue(subscription);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok')));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setServiceWorker([{}]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('subscribes with the decoded VAPID key and sends the subscription to the server', async () => {
    const { setupPushNotifications } = await loadPush();

    expect(await setupPushNotifications()).toBe(subscription);

    const options = push.subscribe.mock.calls[0]![0];
    expect(options.userVisibleOnly).toBe(true);
    expect([...options.applicationServerKey]).toEqual([1, 2, 3, 4]);
    expect(fetch).toHaveBeenCalledWith(
      '/api/push-subscribe',
      expect.objectContaining({ method: 'POST' })
    );
    expect(notice()).toContain('Push Notifications Ready');
  });

  it('decodes URL-safe base64 keys ("-" and "_" instead of "+" and "/")', async () => {
    // "-_-_" is the URL-safe form of "+/+/", which decodes to [251, 255, 191]
    const { setupPushNotifications } = await loadPush('-_-_');

    await setupPushNotifications();

    const { applicationServerKey } = push.subscribe.mock.calls[0]![0];
    expect([...applicationServerKey]).toEqual([251, 255, 191]);
  });

  it('reuses an existing subscription instead of subscribing again', async () => {
    push.getSubscription.mockResolvedValue(subscription);
    const { setupPushNotifications } = await loadPush();

    expect(await setupPushNotifications()).toBe(subscription);
    expect(push.subscribe).not.toHaveBeenCalled();
  });

  it('skips subscribing when no VAPID key is configured', async () => {
    const { setupPushNotifications } = await loadPush('');

    expect(await setupPushNotifications()).toBeNull();
    expect(push.subscribe).not.toHaveBeenCalled();
    expect(notice()).toContain('Push requires VAPID key');
  });

  it('falls back to basic notifications when no service worker is registered', async () => {
    setServiceWorker([]);
    const { setupPushNotifications } = await loadPush();

    expect(await setupPushNotifications()).toBeNull();
    expect(push.subscribe).not.toHaveBeenCalled();
    expect(notice()).toContain('Service Worker not available');
  });

  it('does not set up twice when messages are shown', async () => {
    const { setupPushNotifications } = await loadPush();
    await setupPushNotifications();

    expect(await setupPushNotifications()).toBeUndefined();
    expect(push.subscribe).toHaveBeenCalledOnce();
  });

  it('explains when the user has blocked push', async () => {
    push.subscribe.mockRejectedValue(
      Object.assign(new Error('denied'), { name: 'NotAllowedError' })
    );
    const { setupPushNotifications } = await loadPush();

    expect(await setupPushNotifications()).toBeNull();
    expect(notice()).toContain('Push Blocked');
  });

  it('explains when the browser does not support push', async () => {
    push.subscribe.mockRejectedValue(
      Object.assign(new Error('nope'), { name: 'NotSupportedError' })
    );
    const { setupPushNotifications } = await loadPush();

    expect(await setupPushNotifications()).toBeNull();
    expect(notice()).toContain('Push Unsupported');
  });

  it('stays quiet about failures when asked not to show messages', async () => {
    push.subscribe.mockRejectedValue(new Error('boom'));
    const { setupPushNotifications } = await loadPush();

    expect(await setupPushNotifications(false)).toBeNull();
    expect(notice()).toBe('');
  });

  it('keeps the subscription locally when the server is unreachable', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('offline'));
    const { setupPushNotifications } = await loadPush();

    await setupPushNotifications();

    expect(localStorage.getItem('push-subscription')).not.toBeNull();
  });
});
