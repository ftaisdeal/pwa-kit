import { beforeEach, describe, expect, it, vi } from 'vitest';

const setNavigator = (props: Record<string, unknown>) => {
  for (const key of ['share', 'clipboard']) {
    Object.defineProperty(navigator, key, {
      configurable: true,
      value: props[key],
    });
  }
};

const loadShare = async () => {
  vi.resetModules();
  const { setupShare } = await import('../../src/share');
  setupShare();
};

const button = () => document.querySelector<HTMLButtonElement>('.share-button');
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('share button', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<button class="share-button" hidden>Share</button>';
  });

  it('stays hidden when the browser can neither share nor copy', async () => {
    setNavigator({});
    await loadShare();
    expect(button()?.hidden).toBe(true);
  });

  it('shows when Web Share is available and uses it', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator({ share });
    await loadShare();

    expect(button()?.hidden).toBe(false);
    button()?.click();
    await flush();
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: window.location.href })
    );
  });

  it('falls back to copying the link when only the clipboard exists', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({ clipboard: { writeText } });
    await loadShare();

    expect(button()?.hidden).toBe(false);
    button()?.click();
    await flush();
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(
      document.querySelector('.in-app-notification')?.textContent
    ).toContain('Link Copied');
  });

  it('does nothing further when the user dismisses the share sheet', async () => {
    const writeText = vi.fn();
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    setNavigator({ share, clipboard: { writeText } });
    await loadShare();

    button()?.click();
    await flush();
    expect(writeText).not.toHaveBeenCalled();
    expect(document.querySelector('.in-app-notification')).toBeNull();
  });

  it('copies the link if sharing fails for another reason', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockRejectedValue(new Error('boom'));
    setNavigator({ share, clipboard: { writeText } });
    await loadShare();

    button()?.click();
    await flush();
    expect(writeText).toHaveBeenCalled();
  });
});
