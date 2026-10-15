import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showInAppNotification } from '../../src/ui';

describe('showInAppNotification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.replaceChildren();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the title and body', () => {
    showInAppNotification('Queued', 'Form will be submitted when online');

    const notification = document.querySelector('.in-app-notification');
    expect(notification?.querySelector('strong')?.textContent).toBe('Queued');
    expect(notification?.textContent).toContain(
      'Form will be submitted when online'
    );
  });

  it('treats title and body as text, not HTML', () => {
    showInAppNotification(
      '<img src=x onerror=alert(1)>',
      '<script>alert(1)</script>'
    );

    const notification = document.querySelector('.in-app-notification');
    expect(notification?.querySelector('img, script')).toBeNull();
    expect(notification?.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(notification?.textContent).toContain('<script>alert(1)</script>');
  });

  it('fades out and removes itself', () => {
    showInAppNotification('a', 'b');
    vi.advanceTimersByTime(3000);
    expect(document.querySelector('.in-app-notification')?.classList).toContain(
      'fade-out'
    );
    vi.advanceTimersByTime(300);
    expect(document.querySelector('.in-app-notification')).toBeNull();
  });
});
