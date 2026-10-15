import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = () => void;

// Minimal stand-in for workbox-window's Workbox
const workbox = vi.hoisted(() => {
  const state = {
    listeners: {} as Record<string, Listener>,
    messageSkipWaiting: vi.fn(),
    register: vi.fn(),
  };
  return state;
});

vi.mock('workbox-window', () => ({
  Workbox: class {
    addEventListener(name: string, listener: Listener) {
      workbox.listeners[name] = listener;
    }
    messageSkipWaiting = workbox.messageSkipWaiting;
    register = workbox.register;
  },
}));

const reload = vi.fn();

describe('service worker update flow', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    workbox.listeners = {};
    workbox.register.mockResolvedValue({ scope: '/' });
    reload.mockClear();
    workbox.messageSkipWaiting.mockClear();
    document.body.replaceChildren();

    vi.stubGlobal('location', { ...window.location, reload });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        ready: Promise.resolve({}),
      },
    });

    const { setupServiceWorker } = await import('../../src/sw');
    await setupServiceWorker();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('does not activate or reload on its own when an update is waiting', () => {
    workbox.listeners.waiting?.();

    expect(document.querySelector('.update-prompt')).not.toBeNull();
    expect(workbox.messageSkipWaiting).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('shows one prompt even if the update is reported twice', () => {
    workbox.listeners.waiting?.();
    workbox.listeners.waiting?.();

    expect(document.querySelectorAll('.update-prompt')).toHaveLength(1);
  });

  it('activates the update and reloads once the user accepts', () => {
    workbox.listeners.waiting?.();
    document
      .querySelector<HTMLButtonElement>('.update-prompt .button-primary')
      ?.click();

    expect(workbox.messageSkipWaiting).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();

    workbox.listeners.controlling?.();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('keeps the page as is when the user chooses Later', () => {
    workbox.listeners.waiting?.();
    document
      .querySelector<HTMLButtonElement>('.update-prompt .button-secondary')
      ?.click();

    expect(document.querySelector('.update-prompt')).toBeNull();
    expect(workbox.messageSkipWaiting).not.toHaveBeenCalled();

    // e.g. another tab applied the update: still no surprise reload here
    workbox.listeners.controlling?.();
    expect(reload).not.toHaveBeenCalled();
  });
});
