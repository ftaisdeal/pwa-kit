import { log } from './logger';
import { onClick, showInAppNotification, trackEvent } from './ui';

const shareData = {
  title: 'PWA Kit Modern',
  text: 'Check out this modern PWA starter kit!',
};

// Shows the share button when the browser can share or, failing that, copy the
// link to the clipboard. The button stays hidden when neither is available.
export function setupShare(): void {
  const button = document.querySelector<HTMLButtonElement>('.share-button');
  if (!button || !(navigator.share || navigator.clipboard)) return;

  button.hidden = false;
  onClick('share-button', (event) => {
    event.preventDefault();
    void shareContent();
  });
}

async function shareContent(): Promise<void> {
  const url = window.location.href;

  if (navigator.share) {
    try {
      await navigator.share({ ...shareData, url });
      trackEvent('content_shared');
      return;
    } catch (error) {
      // The user closed the share sheet: nothing to do
      if (error instanceof DOMException && error.name === 'AbortError') return;
      log.warn('Share failed, copying link instead:', error);
    }
  }

  await copyLink(url);
}

async function copyLink(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    trackEvent('link_copied');
    showInAppNotification('Link Copied', 'URL copied to clipboard');
  } catch (error) {
    log.warn('Copying the link failed:', error);
    showInAppNotification('Copy Failed', 'Unable to copy the link');
  }
}
