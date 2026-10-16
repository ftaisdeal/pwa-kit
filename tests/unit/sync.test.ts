import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const network = vi.hoisted(() => ({ online: true }));
vi.mock('../../src/network', () => ({ isOnline: () => network.online }));

type Db = typeof import('../../src/db');
type Sync = typeof import('../../src/sync');

let db: Db;
let sync: Sync;

const queued = async () => (await db.getDb()!.getAll('offline-actions')) ?? [];

describe('syncOfflineActions', () => {
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    network.online = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok')));

    vi.resetModules();
    db = await import('../../src/db');
    sync = await import('../../src/sync');
    await db.initDatabase();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('replays queued form submissions and removes them', async () => {
    await db.storeOfflineAction('form-submission', { name: 'Ada' });
    await db.storeOfflineAction('form-submission', { name: 'Grace' });

    await sync.syncOfflineActions();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledWith(
      '/api/submit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Ada' }),
      })
    );
    expect(await queued()).toEqual([]);
  });

  it('does nothing while offline, and keeps everything queued', async () => {
    await db.storeOfflineAction('form-submission', { name: 'Ada' });
    network.online = false;

    await sync.syncOfflineActions();

    expect(fetch).not.toHaveBeenCalled();
    expect(await queued()).toHaveLength(1);
  });

  it('keeps an action when the request fails, and still sends the rest', async () => {
    await db.storeOfflineAction('form-submission', { name: 'first' });
    await db.storeOfflineAction('form-submission', { name: 'second' });
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockResolvedValueOnce(new Response('ok'));

    await sync.syncOfflineActions();

    const left = await queued();
    expect(left).toHaveLength(1);
    expect(left[0].data).toEqual({ name: 'first' });
  });

  it('keeps an action when the server answers with an error', async () => {
    await db.storeOfflineAction('form-submission', { name: 'Ada' });
    vi.mocked(fetch).mockResolvedValue(new Response('boom', { status: 500 }));

    await sync.syncOfflineActions();

    expect(await queued()).toHaveLength(1);
  });

  it('counts failed attempts across syncs', async () => {
    await db.storeOfflineAction('form-submission', { name: 'Ada' });
    vi.mocked(fetch).mockRejectedValue(new TypeError('network down'));

    await sync.syncOfflineActions();
    expect((await queued())[0]!.attempts).toBe(1);

    await sync.syncOfflineActions();
    expect((await queued())[0]!.attempts).toBe(2);
  });

  it('gives up on an action after the maximum number of attempts', async () => {
    await db.storeOfflineAction('form-submission', { name: 'Ada' });
    vi.mocked(fetch).mockRejectedValue(new TypeError('network down'));

    for (let attempt = 1; attempt < sync.MAX_SYNC_ATTEMPTS; attempt++) {
      await sync.syncOfflineActions();
      expect(await queued(), `after attempt ${attempt}`).toHaveLength(1);
    }

    await sync.syncOfflineActions(); // the last allowed attempt
    expect(await queued()).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(sync.MAX_SYNC_ATTEMPTS);
  });

  it('allows five attempts by default', () => {
    expect(sync.MAX_SYNC_ATTEMPTS).toBe(5);
  });

  it('removes an action that succeeds after earlier failures', async () => {
    await db.storeOfflineAction('form-submission', { name: 'Ada' });
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('network down'));

    await sync.syncOfflineActions();
    expect(await queued()).toHaveLength(1);

    await sync.syncOfflineActions(); // fetch succeeds this time
    expect(await queued()).toEqual([]);
  });

  it('tracks attempts per action', async () => {
    await db.storeOfflineAction('form-submission', { name: 'first' });
    await db.storeOfflineAction('form-submission', { name: 'second' });
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError('network down')) // first, run 1
      .mockResolvedValueOnce(new Response('ok')); // second, run 1

    await sync.syncOfflineActions();

    const left = await queued();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ data: { name: 'first' }, attempts: 1 });
  });

  it('drops actions of an unknown type instead of retrying them forever', async () => {
    await db.storeOfflineAction('mystery', { a: 1 });

    await sync.syncOfflineActions();

    expect(fetch).not.toHaveBeenCalled();
    expect(await queued()).toEqual([]);
  });

  it('does nothing before the database is open', async () => {
    vi.resetModules();
    const fresh = await import('../../src/sync');

    await expect(fresh.syncOfflineActions()).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('setupBackgroundSync', () => {
  const submit = (form: HTMLFormElement) => {
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    return event;
  };
  const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    network.online = false;
    document.body.innerHTML = `
      <form class="sync-form"><input name="name" value="Ada"></form>
      <form class="other-form"><input name="name" value="x"></form>`;

    // Background Sync is Chromium-only: pretend it exists
    vi.stubGlobal(
      'ServiceWorkerRegistration',
      class {
        sync = {};
      }
    );
    (window as any).ServiceWorkerRegistration.prototype.sync = {};
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: async () => [] },
    });

    vi.resetModules();
    db = await import('../../src/db');
    sync = await import('../../src/sync');
    await db.initDatabase();
    sync.setupBackgroundSync();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('queues a sync-form submission made while offline', async () => {
    const event = submit(document.querySelector('.sync-form')!);
    await flush();

    expect(event.defaultPrevented).toBe(true);
    const actions = await queued();
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      type: 'form-submission',
      data: { name: 'Ada' },
    });
    expect(
      document.querySelector('.in-app-notification')?.textContent
    ).toContain('Queued');
  });

  it('lets the browser submit normally while online', async () => {
    network.online = true;
    const event = submit(document.querySelector('.sync-form')!);
    await flush();

    expect(event.defaultPrevented).toBe(false);
    expect(await queued()).toEqual([]);
  });

  it('ignores forms that are not sync forms', async () => {
    const event = submit(document.querySelector('.other-form')!);
    await flush();

    expect(event.defaultPrevented).toBe(false);
    expect(await queued()).toEqual([]);
  });
});
