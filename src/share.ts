import { showInAppNotification, trackEvent } from './ui';

export async function shareContent(): Promise<void> {
  try {
    await navigator.share({
      title: 'PWA Kit Modern',
      text: 'Check out this modern PWA starter kit!',
      url: window.location.href,
    });
    trackEvent('content_shared');
  } catch (error) {
    console.log('Share failed:', error);
    // Fallback to clipboard
    await navigator.clipboard.writeText(window.location.href);
    showInAppNotification('Link Copied', 'URL copied to clipboard');
  }
}
