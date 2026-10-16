import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setupPush = vi.hoisted(() => vi.fn());
vi.mock('../../src/push', () => ({ setupPushNotifications: setupPush }));

type Notifications = typeof import('../../src/notifications');

const shown: Array<{ title: string; options: NotificationOptions }> = [];

class FakeNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn();
  close = vi.fn();
  constructor(title: string, options: NotificationOptions) {
    shown.push({ title, options });
  }
}

const button = () =>
  document.querySelector<HTMLButtonElement>('.notifications-button')!;
const notice = () =>
  document.querySelector('.in-app-notification')?.textContent ?? '';

const load = async (permission: NotificationPermission = 'default') => {
  FakeNotification.permission = permission;
  vi.resetModules();
  return (await import('../../src/notifications')) as Notifications;
};

describe('notifications', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<button class="notifications-button" hidden></button>';
    shown.length = 0;
    setupPush.mockReset().mockResolvedValue(null);
    FakeNotification.requestPermission.mockReset();
    vi.stubGlobal('Notification', FakeNotification);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('initNotifications', () => {
    it('offers to enable notifications by default', async () => {
      const { initNotifications } = await load('default');
      initNotifications();

      expect(button().hidden).toBe(false);
      expect(button().disabled).toBe(false);
      expect(button().textContent).toContain('Enable Notifications');
      expect(setupPush).not.toHaveBeenCalled();
    });

    it('shows enabled and sets up push when already granted', async () => {
      const { initNotifications } = await load('granted');
      initNotifications();

      expect(button().disabled).toBe(true);
      expect(button().textContent).toContain('Notifications Enabled');
      expect(setupPush).toHaveBeenCalledOnce();
    });

    it('shows blocked when denied', async () => {
      const { initNotifications } = await load('denied');
      initNotifications();

      expect(button().disabled).toBe(true);
      expect(button().textContent).toContain('Notifications Blocked');
      expect(setupPush).not.toHaveBeenCalled();
    });

    it('does nothing in browsers without notifications', async () => {
      vi.unstubAllGlobals(); // jsdom has no Notification
      const { initNotifications } = await load();
      initNotifications();

      expect(button().hidden).toBe(true);
    });
  });

  describe('requestNotificationPermission', () => {
    it('enables push quietly and sends a test notification when granted', async () => {
      FakeNotification.requestPermission.mockImplementation(async () => {
        FakeNotification.permission = 'granted';
        return 'granted';
      });
      const { requestNotificationPermission } = await load('default');

      expect(await requestNotificationPermission()).toBe('granted');

      expect(setupPush).toHaveBeenCalledWith(false);
      expect(shown).toHaveLength(1);
      expect(shown[0]!.options.tag).toBe('test-notification');
      expect(button().textContent).toContain('Notifications Enabled');
      expect(notice()).toContain('Notifications Enabled');
    });

    it('tells the user how to unblock when denied', async () => {
      FakeNotification.requestPermission.mockResolvedValue('denied');
      const { requestNotificationPermission } = await load('default');

      expect(await requestNotificationPermission()).toBe('denied');

      expect(setupPush).not.toHaveBeenCalled();
      expect(shown).toHaveLength(0);
      expect(notice()).toContain('Notifications Blocked');
    });

    it('stays on default and reports an error if the request throws', async () => {
      FakeNotification.requestPermission.mockRejectedValue(new Error('x'));
      const { requestNotificationPermission } = await load('default');

      expect(await requestNotificationPermission()).toBe('default');
      expect(notice()).toContain('Permission Error');
    });

    it('reports unsupported browsers', async () => {
      vi.unstubAllGlobals();
      const { requestNotificationPermission } = await load();

      expect(await requestNotificationPermission()).toBe('unsupported');
    });
  });
});
